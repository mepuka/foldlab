# Type population from data: the inferrer proposes, the person disposes, the grammar certifies

FROM OPERATOR-DIRECTED RESEARCH

Author: type-population lane (Opus), 2026-08-15, isolated worktree. **Design only
— an argument, an ambiguity catalog, event shapes, laws, and findings. No
machinery.** Consumer-gated to tickets 003 (the concierge), 004 (the owned
scheme), 015 (the grammar foundry), 025 (typed metadata holes), and to the
sessions/language-surface designs.

The operator's framing, near-verbatim: *"I want to bootstrap some data into my
system and then create types from it."* That is the DX inversion — today the
catalog is authored first and data is admitted against it; the operator wants to
walk in with a folder and walk out with a type.

This document takes that seriously and refuses to sell it. Inference from a
folder of JSON is exactly learning-from-text; the estate has already ratified,
via Gold 1967, that positive-only presentation cannot pin down a language
(`docs/design/2026-08-14-learning-by-refutation.md:531-570`;
`docs/map/tickets/015-the-grammar-foundry.md:26-28`). The honest version of the
feature is therefore not "infer the type". It is: **inference computes a lower
bound, the dialogue supplies the upper bound, and the certifier admits the
result.**

## Discipline

- `origin/main` at **`310fc18f399a497f8552ce29cd0ea7d8e15d91ed`** this session.
  Every repository claim carries file:line, verified against that sha.
- Every literature claim is **[fetched]** (retrieved and read this session),
  **[inherited]** (verified in a prior estate dossier's session, re-cited with
  the same URL, not re-read), or **[unverified]**. Unverified claims are marked
  inline.
- Two claims in this document are **[executed]** — produced by running a probe
  against the repository's own `go/canonical` package this session. The probe
  source is reproduced in §2.5 so anyone can re-run it; it was not committed,
  because this is a design doc and the estate's rule is that machinery arrives
  with its ticket.
- Build state labels: **SHIPPED** (walled or tested in-repo),
  **RATIFIED-UNBUILT**, **ASPIRATIONAL**. Everything this document designs is
  ASPIRATIONAL; everything it cites about the daemon is SHIPPED unless said
  otherwise.

---

## §0 — The answer in one paragraph

Order the closed `flb.type.v0` terms by what they denote. A folder of JSON is a
set of positive examples, so the surviving hypotheses are exactly
`VS(D) = { T : D ⊆ ⟦T⟧ }`. This version space has a **maximum**, and it is
`{"k":"opaque"}` — the kind whose stated meaning is "any well-formed v0 value"
(`proto/wire/CONTRACT.md:149-151`). Therefore the `G`-boundary of the version
space is the constant singleton `{opaque}` for **every** folder, of **every**
size: *positive data never moves `G`*. The whole informational content of the
corpus lives in the `S`-boundary, the most specific consistent hypothesis — and
the `S`-boundary is a re-encoding of the data, which nobody wants as a type. The
useful type is strictly between `S` and `opaque`, and **nothing in the data
selects the point.** Every shipped JSON-inference system picks that point with a
fixed policy and does not say so. foldlab's advantage is that it already owns
the two things needed to do it honestly: a hole (`{"k":"hole"}`) that says
"undecided" *inside a well-formed term*, and a concierge whose frontier is the
question channel. So the design is one move: **the inferrer emits a
`flb.type.partial.v0` whose holes sit exactly where the corpus underdetermines
the grammar, plus an ambiguity report for the underdetermined positions the
grammar has no hole for — and it enters the concierge as a single
`type.fill` at the root, adding no daemon verb at all.** The catalog of what is
underdetermined, and which half of it the grammar can currently express, is
§3, and it is the payload of this document. And running **Angluin's tell-tale
test** (§2.6) against the thirteen kinds gives the number the operator should
size the feature by: **the text-learnable fragment of `flb.type.v0` is exactly
the finite types** — `null`, `bool`, `literal`, and finite unions and closed
structs over them. Everything else is a question, always.

---

## PART 1 — THE LITERATURE, VERIFIED

Every system below solves the same problem and every one of them answers the
underdetermined question by fixed policy. The interesting variation is *how
honest each is about having done so*, and exactly two of them ship a mechanism
that lets a user find out where the guess was weak. Neither of those two asks
anything at inference time.

### 1.1 Petricek, Guerra & Syme — "Types from Data" (PLDI 2016): the closest ancestor, confronted

[fetched: Tomas Petricek, Gustavo Guerra, Don Syme, "Types from data: making
structured data first-class citizens in F#," *PLDI '16*, Santa Barbara, 13–17
June 2016, pp. 477–490, DOI 10.1145/2908080.2908115; read from the preprint
arXiv:1605.02941v1, whose structure and numbering match the proceedings version
— section and theorem numbers below are the preprint's. A search result claiming
a PLDI 2016 Distinguished Paper award is **[refuted]**: the official PLDI 2016
program page shows no award designation for this paper.]

This is the paper foldlab's design is closest to, and the confrontation is
productive rather than adversarial, because **they built the same thing we are
building and then deliberately declined the one move we are making.**

**What they built.** Shapes are stratified into non-nullable `σ̂` and nullable
`σ`, with row variables `ρᵢ` (citing Cardelli & Mitchell 1990, unification per
Rémy 1993), `⊥` at the bottom and `any` at the top. **Definition 1** gives a
"preferred shape" order `σ₁ ⊑ σ₂` as the reflexive-transitive closure of nine
rules, including `int ⊑ float`, `σ̂ ⊑ nullable⟨σ̂⟩`, `⊥ ⊑ σ`, `σ ⊑ any`, and —
the one worth staring at — a record rule under which **more fields is more
preferred**. **Definition 2** gives the join `csh(σ₁,σ₂)`, and inference is a
left fold of that join from `⊥` over the samples. **Lemma 1** proves `csh`
computes a least upper bound.

**The mapping onto §2 is exact, and it is the strongest evidence that §2's frame
is the right one.** Their `any` is our `opaque`; their `⊥`-seeded fold to a
least upper bound is our `S`-boundary computation; their nine-rule preference
order is the policy that picks the point between `S` and the top. They compute
`S` and then walk *up* from it by a fixed amount. We compute `S` and then ask.

**What they silently guess, precisely.** Three layers:

1. **The lattice itself.** Definition 1 is a hard-coded editorial policy —
   prefer the narrowest, least-optional, most-field-bearing thing the sample
   permits. Nothing in any sample argues for it.
2. **Rule order as tie-breaker.** Figure 2's rules "are matched from top to
   bottom," with `(any)` "used as the last resort"; row-variable ambiguity is
   resolved by "Choose minimal θ." Ambiguity is real, is detected, and is
   discharged by ordering rather than by reporting.
3. **Unformalized domain heuristics below the calculus.** A CSV column
   containing only `0` and `1` is inferred Boolean via a `bit` shape that does
   **not appear in Definition 1**; `#N/A` is silently treated as null; a null
   collection is treated as an empty collection — a choice they concede has "a
   range of design alternatives."

Their single-bit commitment deserves a line of its own, because it is our A2b
exactly: a field present in one sample and absent in another is reinterpreted as
`nullable` **in the type**, on one bit of evidence, rather than as evidence of
two record kinds.

**Their honesty, which is the best in this literature and should be adopted, not
beaten.** There is no notion of a *true type* anywhere in the paper. The sample
is the only referent, and they say so: §5, "we cannot avoid all errors. In
particular, one can always provide an input that has a different structure than
any of the samples." §6.1 weakens "representative" to representativeness "with
respect to data they intend to access." §6.1 on schema change: the program "can
fail at runtime and developers have to handle the exception."

**Theorem 3 (Relative safety)** is a real, syntactically-proved soundness result
(via Preservation and Progress over their Foo calculus) — and its antecedent is
the whole story:

> for all inputs `d′` such that `S(d′) ⊑ σ` … `L, e[y ← e′ d′] ⇝* v` for some
> value `v`.

**`S(d′) ⊑ σ` is precisely the proposition no corpus can establish.** The
theorem is a conditional whose hypothesis is exactly what §2.2 proves positive
data cannot supply. Read that way, Theorem 3 is not a rival to this design; it
is *the formal statement of what this design is trying to make someone
responsible for*. Petricek et al. prove that if the world stays inside `σ`,
nothing gets stuck. Nobody ever asked whether the world stays inside `σ`.

**And the rejection we must respect.** §6.5: the algorithm "is designed to be
predictable and stable… For this reason, we keep the algorithm simple. For
example, we do not use probabilistic methods to assess the similarity of record
types, because a small change in the sample could cause a large change in the
provided types." They rejected a *better* inference algorithm (they cite
Colazzo, Ghelli & Sartiani's similarity-based JSON type fusion as "more
sophisticated than our technique") to keep the guess simple enough to prove a
theorem about. **This is a constraint on §5.4's question ranking**: a ranking
that reorders wildly when one file is added is a ranking nobody can trust, and
the estate has already ratified the analogous law for the frontier
(`concierge-sessions-and-catalog.md:200-208`, L5). Recorded as an obligation on
the MVP in §5.4.

**One construct they have and foldlab does not.** §3.5's **labelled top shapes**
`any⟨σ₁,…,σₙ⟩` retain the alternatives actually seen while remaining the top of
the order — "the labels do not affect the preferred shape relation… should still
be seen as the top shape" — and this implements an explicit open-world
assumption: for XML "we do not infer a closed choice between heading, paragraph
and image," because "Actual input might be an element about which nothing is
known." foldlab's `{"k":"opaque"}` has **no children at all** (`walk.go:77-78`)
and therefore cannot remember anything. See Q6 (§7).

**Exactness verdict: EXACT AND PROVED, conditioned on an unverifiable
antecedent.** Theorem 3 is genuine. Lemma 1's optimality is optimality with
respect to their own chosen order — definitionally true, not empirically
contentful. The *inference* is heuristic and, in their own model,
**unfalsifiable**: with no true type, no sample can show it wrong; only a later
input can make a program throw.

### 1.2 F# type providers generally — "conditional type soundness", self-declared informal

[fetched: Don Syme et al. (13 authors), "Strongly-Typed Language Support for
Internet-Scale Information Sources," Technical Report MSR-TR-2012-101, Microsoft
Research, September 2012 — cover title as given; the MSR landing page prepends
"F#3.0 –" and the running header differs again. And: Syme, Battocchi, Takeda,
Malayeri, Petricek, "Themes in information-rich functional programming for
internet-scale data sources," *DDFP '13*, ACM, pp. 1–4, DOI
10.1145/2429376.2429378 — the MSR page for this one lists only three of the five
authors; cite from Crossref.]

The abstract states the trade in one sentence: "Type soundness becomes relative
to the soundness of the type providers and the schema change in information
sources." §6 is titled "Some Formal Considerations" and disclaims itself —
the treatment will seem "disturbingly *informal*", "deliberate: a full
formalization of F# type providers is not the focus of this work." **There are
no theorems in the report.** What survives is named honestly: soundness holds
"in the strict technical sense that 'the worst that can happen is an
exception'," so it is *conditional* type soundness, "sound up to the behavior of
the provider."

Two ideas transfer directly. First, the reframing: "there are endless papers on
the soundness of languages but few papers on the soundness of libraries" —
which is the same move as foldlab's ADR-0010 (`AGENTS.md:60-62`: a function enters a library only
with the law that licenses it). Second, the recommendation that each provider
ship a **schema-change specification** documenting what is source- and
binary-compatible. That is the ancestor of §4.3's drift record, and it is worth
saying that the F# work only *recommends* it while noting the hard limit: "The
F# 3.0 type provider mechanism does not itself provide any means to adjust
program execution state based on schema change."

**Exactness verdict: EXPLICITLY INFORMAL, self-declared.** The soundness claim
made is near-vacuous by construction; the interesting properties are conceded to
be unformalized and per-provider. Cite as design vocabulary, not as a result.

### 1.3 PADS — errors as first-class values, and the learning paper that cites Gold at us first

**The semantics.** [fetched: Kathleen Fisher and Robert Gruber, "PADS: a
domain-specific language for processing ad hoc data," *PLDI '05*, pp. 295–304,
DOI 10.1145/1065010.1065046; and Kathleen Fisher, Yitzhak Mandelbaum, David
Walker, "The next 700 data description languages," *POPL '06*, pp. 2–15, DOI
10.1145/1111037.1111039, journal version *JACM* 57(2) Article 10, 2010, DOI
10.1145/1667053.1667059.]

A PADS parse returns a **pair**: the canonical representation *plus* a **parse
descriptor** that "precisely characterizes both the syntactic and the semantic
errors" found. Parse descriptors mirror the type's shape; each node carries
state (*Normal | Partial | Panicking*), an error count, the first error's code,
and its location. The Data Description Calculus formalizes this as a **dual
interpretation** — each type denotes both a representation and a parser — and
proves **Theorem 1 (Type Correctness)** and **Theorem 7 (Error Correlation)**,
with **Corollary 8**: zero recorded errors implies no syntactic or semantic
errors in the representation. Parsing is total: errors are recorded, never
thrown.

This is the ancestor of foldlab's W8 ("refusals are data") at a different layer,
and it is the strongest available precedent for the estate's own instinct: **the
mismatch is a value with a position in the tree, not an exception.** Note the
scope of what is proved, though — Theorem 7 says the descriptor faithfully
reports errors in the representation. It is a statement about internal
consistency of the machinery, **not** about whether the description matches the
data source. That distinction is exactly foldlab's Break 1
(`docs/design/2026-08-14-learning-by-refutation.md:766-775`) arriving from an
independent direction.

**The learning paper.** [fetched: Kathleen Fisher, David Walker, Kenny Q. Zhu,
Peter White, "From dirt to shovels: fully automatic tool generation from ad hoc
data," *POPL '08*, pp. 421–434, DOI 10.1145/1328438.1328488; demo paper Fisher,
Walker, Zhu, "LearnPADS," *SIGMOD '08*, pp. 1299–1302, DOI
10.1145/1376616.1376759.]

Five phases: chunk/tokenize → structure discovery → information-theoretic
scoring → refinement → emit PADS. Structure discovery is driven by an **oracle**
emitting one of four prophecies (base / struct / array / union); the paper's own
code comment for it reads: "Guesses the best top-level description". The signal
is token-frequency histograms compared by symmetric relative entropy, clustered
at a tolerance of 0.01.

**The MDL trade, exactly.** They state both degenerate poles outright — a
trivially compact description ("the data source is a string terminated by end of
file") versus a perfectly precise one ("the data itself abstracts nothing and
therefore serves as its own description"). That is `opaque` and `S`, in this
document's vocabulary, arrived at independently in 2008. The cost function:

```
COST(T, d₁…d_k) = CT(T) + CD(d₁…d_k | T)
```

— bits to transmit the description, plus bits to transmit the data given it
(citing Grünwald 2007). So **MDL is a policy for choosing the point between `S`
and the top, and it is a defensible one.** Two candid admissions belong in the
record: the cost of a ranged integer is set to `∞` "artificially," because
"experiments reveal that attempting to define integer ranges with minimum and
maximum values usually leads to overfitting"; and "space limitations preclude
giving that definition here" — the full cost function is not published. The
refinement search is greedy and depth-first and terminates at a **local**
minimum, which they call "stable".

**They cite Gold at us first, and they are right to.** §5 invokes Gold 1967
directly and accepts the consequence without hedging: **"errors in inference are
inevitable."** §6 places them in the approximate-identification camp
deliberately. And they concede non-uniqueness outright — comparing their output
to a hand-written description of the same file, where a different functional
dependency produced a different switched union: "the inference algorithm found a
different way of structuring the data. Nonetheless, both of these descriptions
are accurate."

**The idea most worth stealing, and it is not the MDL.** LearnPADS ships an
**accumulator** that "catalogs exactly how many deviations from the description
there were overall in the data source as well as the error rate in every
individual field," so "a programmer can immediately and reliably determine the
effectiveness of inference for their data." That is a **per-field fit statistic
computed against fresh data** — a falsifiability instrument, and the named
ancestor of §4.3's drift detection. It is post-hoc rather than interactive: PADS
guesses, then measures, then lets you edit. Nothing is asked during inference.

**Exactness verdict: split, and the split is the lesson.** The semantics (DDC)
is EXACT AND PROVED, about internal consistency. The learning is HEURISTIC AND
HONESTLY SO — a greedy local minimum of a two-term cost function that is not
fully published, with hand-tuned constants (`MaxMass`, `MinCoverage`, tolerance
0.01, `width > 3`), over a description space reachable by a fixed rule set. The
empirical claims are falsifiable and were tested, but "95% accuracy" measures
**parse success on held-out data, not recovery of the true format**, and those
are different properties.

### 1.4 The practitioner tools — every default is a silent policy, and one author says so

[fetched this session: Google Cloud "Using schema auto-detection" (page footer
"Last updated 2026-07-31 UTC") and the BigQuery REST v2 reference; Apache Spark
4.2.0 JSON data-source docs, `DataFrameReader` scaladoc, and
`JsonInferSchema.scala` / `TypeCoercion.scala` / `JsonUtils.scala` /
`JSONOptions.scala` at `apache/spark@master`; `saasquatch/json-schema-inferrer`,
`glideapps/quicktype`, and `wolverdude/GenSON` at master.]

**BigQuery — the sampling is the whole story, and it is worse than "a sample".**
The doc states it twice: BigQuery "selects a random file in the data source" and
scans "up to the first 500 rows". **500 rows of one arbitrarily chosen file** —
not a stratified draw across the folder, which is precisely the exchangeability
violation §3.3 warns about, shipped as a product default. Field types are "based
on the rows having the most fields"; an all-empty column defaults to `STRING`.
The only caveat language is the phrase "best-effort attempt", used twice.
What is **undocumented**: the JSON-literal-to-type mapping (so `1` vs `1.0` has
no documented answer), the fate of a field absent from the sampled 500 rows, and
nullability — the auto-detection page never mentions modes at all. The
schema docs say an unspecified mode "defaults to `NULLABLE`", and the
column-relaxation doc suggests `--autodetect` to discover relaxed columns, which
only makes sense if autodetect emits NULLABLE — but Google never states it.
[**unverified**: that autodetect always yields NULLABLE; strongly implied, never
documented.] **Exactness verdict: heuristic, and under-documented about its own
heuristics.**

**Spark — a genuine join semilattice, topped by `String`, that never says it
joined.** `samplingRatio` defaults to `1.0`; the implementation disables
sampling entirely above `0.99` and otherwise takes a Bernoulli sample with a
**hardcoded seed of 1** — deterministic, and undocumented. Default behavior is a
full pass: "This function goes through the input once to determine the input
schema." The merge rule is stated in the source header — "Merge types by
choosing the lowest type necessary to cover equal keys," then "Replace any
remaining null fields with string, the top type" — and the lattice is exact:
`Long ⊔ Double = Double`, `Long ⊔ String = String`, `Boolean ⊔ Long = String`,
struct ⊔ struct = field-set union, `NullType ⊔ t = t`. Three silent commitments
matter for us: **every inferred field is `nullable = true` unconditionally**, so
Spark has no way to express "this key was in all N records" — the mirror image
of foldlab's F1, arrived at by choosing rather than by grammar; the empty string
is inferred as `NullType` "we assume that the two are isomorphic"; and
`StringType` as top means a Long⊔String collapse is **indistinguishable in the
output from a field that was always a string.** The lattice is exact and total,
which is exactly the problem: **Spark never fails to produce a schema, and never
reports that a join happened.** None of the widening rules appear in any Spark
doc page. **Exactness verdict: exact algorithm, heuristic semantics, and the
exactness lives only in the source.**

**`saasquatch/json-schema-inferrer` — the closest existing thing to this
design.** Every ambiguity is a named policy object with a documented default,
and the defaults are deliberately non-committal: `requiredPolicy` defaults to
`noOp()` (no `required` emitted at all), `additionalPropertiesPolicy` to
`noOp()` (keyword omitted), `enumExtractors` and `formatInferrers` to empty.
Our A1 is handled on **two axes**, which is the cleanest treatment found
anywhere: `IntegerTypeCriterion` decides whether a single number is an integer
(`nonFloatingPoint()` default — "1 is an integer and 1.0 is not" — vs
`mathematicalInteger()`), and `IntegerTypePreference` decides how to aggregate
(`IF_ALL` default, `IF_ANY`, `NEVER`). **Correction to a common belief: there is
no threshold-based enum discovery.** Its only `EnumExtractor` matches strings
against the names of a Java enum you supply; enums are declared, never
discovered. **Exactness verdict: explicit-policy, not heuristic** — its failure
mode is under-specification, not misspecification, and it is the one tool in
this survey whose shape foldlab should copy rather than improve on.

**quicktype — all eight heuristics on by default, with magic constants.**
`makeDefaultInferenceFlags` sets every flag true: `inferMaps`, `inferEnums`,
`inferUuids`, `inferDateTimes`, `inferIntegerStrings`, `inferBooleanStrings`,
`combineClasses`, `ignoreJsonRefs`. The enum rule — the answer to the mission's
"three distinct values in 10,000 records" question as the industry actually
implements it — is `MIN_LENGTH_FOR_ENUM = 10` and `cases.size < Math.sqrt(numValues)`;
class merging uses `REQUIRED_OVERLAP = 3/4`; map inference uses
`mapSizeThreshold = 20` and a Markov chain scoring how "word-like" the keys are.
None of these numbers appear in the documentation. [**flagged**: a "0.2 ratio
threshold" circulating in search results is from a third-party paper, not from
quicktype's source.] The author's own comment on the map-scoring formula is the
most honest documentation of a schema-inference default in this entire survey,
and it is worth quoting verbatim: *"The details of the formula are immaterial
because I pulled it out of my ass."* **Exactness verdict: heuristic, with
undocumented magic constants, one explicitly disclaimed as arbitrary by its
author.**

**GenSON — honest about its rules, including the wrong ones.** `required` is the
**intersection** — "the keys that have appeared in *every* object it has seen" —
and once that intersection empties it drops the keyword rather than emitting
`[]`. It "never infers an `enum` on its own". `integer` silently widens to
`number` on the first float. Two objects merge into one schema with the union of
their properties, "never an `anyOf`". It documents its own gotchas in prose.
**Exactness verdict: heuristic but honestly documented** — the only tool of the
three that tells you in advance where it will disagree with you.

### 1.5 Row polymorphism — openness as a *variable*, and why it does not rescue us

[fetched: Mitchell Wand, "Complete Type Inference for Simple Objects," *LICS
1987*, pp. 37–44, and the one-page **"Corrigendum," *LICS 1988*, p. 132**, DOI
10.1109/LICS.1988.5111, retracting the completeness claim; Wand, "Type Inference
for Record Concatenation and Multiple Inheritance," *LICS 1989* / *Information
and Computation* 1991; Didier Rémy, "Typechecking records and variants in a
natural extension of ML," *POPL '89*, pp. 77–88, and INRIA Research Report
RR-1431, 1991 (HAL `inria-00075129`); Benedict R. Gaster and Mark P. Jones, "A
Polymorphic Type System for Extensible Records and Variants," Technical Report
NOTTCS-TR-96-3, University of Nottingham, November 1996; Daan Leijen,
"Extensible records with scoped labels," *TFP 2005*, pp. 179–194.]

The framing is correct and it is the sharpest lens on F1 and F2. In these
systems, reading field `l` from a record has type
`∀α.∀r. Rec {|l : α | r|} → α`: **the rest of the record is a universally
quantified row variable.** Openness is not a default someone picked; it is a
*variable in a principal type*, instantiated by unification at each call site.
Gaster & Jones's **Theorem 2** states it exactly: the algorithm "can be used to
calculate a principal type for a given term E under assumptions A", and it
"fails precisely when there is no typing for E under A" — never as an
approximation. Rémy's **Theorem 3** gives the same for his flag-based system.

Three precisions, each load-bearing:

1. **Wand 1987 is the cautionary tale, not the success story**, and the
   cautionary tale is *our* ambiguity. His system was incomplete and he retracted
   the claim a year later; the reason, per three independent later sources, is
   that his extension "may either add a completely new field, or replace an
   existing field labelled with `l`", so "some programs do not have principal
   types" (Gaster & Jones §1.1). **Add-versus-update ambiguity destroyed
   principality.** Three later systems each paid a different price to restore it:
   Rémy's presence/absence flags (absence becomes *positive* information),
   Gaster & Jones's `lacks` predicate, Leijen's scoped labels.
2. **Concatenation has no principal types at all.** Wand's 1989/1991 abstract:
   "We show that this calculus does not have principal types, but does have
   finite complete sets of types". So merging records of statically unknown
   shape — which is exactly what unifying records across a folder of files does —
   provably has no single best answer, only a finite set of alternatives. That is
   a *proved* statement of the thing this document keeps asserting, and it is the
   best citation available for "the honest output is a set, not an element."
   [**flagged**: journal volume/pages not independently confirmed; abstract read
   from the PDF.]
3. **Principal types are for terms, not for value sets.** These theorems infer
   what a *program* requires of a record. Inferring a type from a *folder of
   observed values* is inductive generalization over a set, and none of these
   results apply to it. The nearest exact analogue for value-set inference is a
   least upper bound in a type lattice — which is what Spark's `compatibleType`
   computes and what Petricek's `csh` computes, i.e. the `S`-boundary of §2.3.

The transferable idea is the *shape*, not the theorem: **let openness be a
variable the consumer resolves, rather than a default the inferrer picks.**
`{"k":"hole"}` is that variable at a `T` position. **What `flb.type.v0` lacks is
the row variable at the field-set position** — there is no `{|… | r|}`, which is
F1 and F2 stated in the vocabulary of the literature that invented the fix.
[**flagged**: Leijen 2005 proves unification soundness and completeness
(Theorems 1 and 2) and *asserts* principality as inherited from Hindley–Milner
given the MGU result; it contains no principal-typing theorem of its own. Cite it
as MGU-plus-inheritance.]

### 1.6 Gold 1967, read from the original — and a correction owed to the estate

[fetched: E. Mark Gold, "Language Identification in the Limit," *Information and
Control* 10(5):447–474, May 1967, DOI 10.1016/S0019-9958(67)91165-5; the original
journal scan was read this session, and the page and theorem numbers below come
from it. Citation hygiene note found in the original: the paper contains a
**numbering collision** — "Theorem 10.1" appears at both p. 462 and p. 464, with a
back-reference to an unlabeled "Theorem 9.1" — so cite Gold by **page**, not by
theorem number alone.]

Gold considers six presentation methods × two naming relations = twelve models.
Table I (p. 452) places a dividing line per model; classes below the line are
identifiable, classes above are not. Three things must be stated exactly, and two
of them correct claims currently circulating.

**The superfinite result is Gold's own, term and theorem.** On p. 452 he defines
a *super-finite* class as one containing all languages of finite cardinality and
at least one of infinite cardinality. **Theorem I.8** (p. 470, recursive text +
generator naming) and **Theorem I.9** (p. 471, primitive recursive text + tester
naming) both conclude such a class is not identifiable in the limit; §9 (p. 460)
scopes this to **five of the six** text models. The positive complement is
**Theorem I.6** (p. 469): under arbitrary text + tester naming, the
finite-cardinality classes *are* identifiable — guess the set of strings seen so
far.

> **FINDING F6 — the estate's own Gold citation overstates the informant
> result.** `docs/design/2026-08-14-learning-by-refutation.md:546-548` reads:
> "From an informant, identification succeeds for the regular, context-free,
> context-sensitive, primitive recursive, and recursively enumerable classes."
> The last item is wrong. In Table I the informant models' dividing line falls
> **between *recursive* and *primitive recursive***, so the identifiable classes
> are primitive recursive and below. **Theorem I.5** (p. 468) states explicitly
> that under methodical informant with generator naming, the class of *recursive*
> languages is **not** identifiable; **Theorem I.4** (p. 467) gives the ceiling —
> primitive recursive, by identification-by-enumeration. Neither the recursive
> nor the recursively enumerable class is informant-identifiable. This does not
> disturb that dossier's argument, which rests entirely on the *text* side, but a
> claim absent from the ledger is not made and a claim sized wrong should be
> resized. **Recorded for correction.**

**And a second correction, which is why §2 proves its instance rather than citing
one.** The folklore "positive-only is strictly weaker than positive-plus-negative"
is **false as an unqualified statement**, by Gold's own **Theorem I.7** (p. 469):
under *primitive recursive text* with generator naming, the entire class of
recursively enumerable languages **is** identifiable in the limit — text beating
every informant model. Gold flags this himself (p. 453): restricting the *order*
of presentation can make text strictly more powerful, and the choice of naming
relation can dominate the choice of data. **A design that leaned on the folklore
would be leaning on something Gold refuted in the same paper.** §2.2 therefore
does not cite Gold as authority for anything; it proves the instance in this
grammar, and Gold explains why the instance was expected.

**The sentence that transfers, and it is Gold's own gloss.** He explains *why*
text fails (pp. 459, 461): text always satisfies his *distinguishability*
condition but fails his *collapsing uncertainty* condition for any class
containing two languages one of which is a subset of the other. His informal
statement: **"if you guess too large a language, the text will never tell you
that you are wrong"** (p. 461). Every row of §3's catalog is an instance of that
sentence — `string` above an enum, optional above required, `opaque` above
everything.

### 1.7 Angluin 1980 — the tell-tale condition, and the exact test to run on our grammar

[**Primary source not opened** — the only open-access copy is behind a CAPTCHA and
it was not attempted. The bibliographic record is [fetched] via Crossref: Dana
Angluin, "Inductive inference of formal languages from positive data,"
*Information and Control* 45(2):117–135, May 1980, DOI
10.1016/S0019-9958(80)90285-5. The **condition itself** is [fetched] from Lange,
Zeugmann & Zilles, "Learning indexed families of recursive languages from
positive data: a survey," *Theoretical Computer Science* 397:194–232, 2008, read
in full, whose authors report Angluin's original Condition-1 wording, and it was
cross-checked against an independent modern restatement. The **theorem numbering**
and the precise scope of the "if and only if" are therefore **[unverified]** at
the primary source. Anyone quoting this as "Angluin's Theorem 1" should get the
PDF through an institutional login first.]

A family of finite non-empty sets `(T_j)` is a family of **telltales** for an
indexing `(L_j)` iff `T_j ⊆ L_j` and: **if `T_j ⊆ L_k ⊆ L_j` then `L_k = L_j`.**
Contrapositively, and this is the operational form: **for every language `L` in
the class there is a finite `T ⊆ L` such that no proper sub-language of `L` in
the class contains `T`.** `T` is the finite fingerprint that rules out everything
strictly below `L`.

Learnability from text is characterized by it: telltales are *necessary*, and a
**uniformly r.e.** family of telltales is *sufficient* — with a learner that is
almost embarrassingly close to what a concierge would run: **at each step output
the least index `s` whose partially-enumerated telltale is already covered by the
data and whose language still contains the data.** If the telltales are
*recursively generable* (the enumeration halts), the learner can additionally be
**conservative** — no unjustified mind changes.

**This converts Gold's impossibility into a test we can run on `flb.type.v0`,
and §2.6 runs it.** That is the single most useful thing in this survey: Angluin
tells you not merely that inference is hard but exactly *which* shapes you must
ask about — the ones with no finite positive witness separating them from their
sub-shapes.

### 1.8 Angluin's query results — what asking buys, priced exactly

[fetched, both read in full from the original journal scans: Dana Angluin,
"Learning Regular Sets from Queries and Counterexamples," *Information and
Computation* 75(2):87–106, November 1987, DOI 10.1016/0890-5401(87)90052-6; and
"Queries and Concept Learning," *Machine Learning* 2(4):319–342, 1988, DOI
10.1023/A:1022821128753.]

The **minimally adequate teacher** answers membership queries ("is `t ∈ U`?") and
equivalence queries ("is `S = U`?", answered on failure with a counterexample in
`S ⊖ U`). **Theorem 6** (1987, p. 97): `L*` terminates with an acceptor isomorphic
to the minimum DFA in time polynomial in `n` (states) and `m` (max counterexample
length), using at most `n` equivalence queries.

Four results price the design decisions in §5.4 and they are worth having
exactly:

1. **Being allowed to *construct* the question is worth an exponential.** Angluin
   1988 §2.1: if equivalence queries must be drawn from the hypothesis space,
   singletons over `{0,1}ⁿ` force **2ⁿ − 1** queries. §2.2: if the question may
   be an arbitrary synthesized set, majority vote gives **⌈log₂ N⌉**. Our
   frontier questions are synthesized from the corpus, not drawn from a fixed
   catalogue, and this is the reason that matters.
2. **A "no" without a witness is exponentially expensive.** Angluin 1988 Theorem
   2 (p. 330): with only *restricted* equivalence queries — yes/no, no
   counterexample — plus membership and subset queries, some monotone-DNF class
   forces **≥ 2ⁿ − 1** queries. **Design consequence, stated as an obligation:
   when the operator rejects a proposal, the interface must capture *which
   record* makes it wrong.** A bare "that's not right" is the restricted query,
   and it costs the difference between polynomial and exponential.
3. **Do not ask a human an equivalence query.** Angluin says so herself (1987
   §1.2): membership is "unobjectionable" to require of a domain expert;
   equivalence demands the teacher hold a precise explicit representation of the
   target. Her own substitute is a random-sampling oracle, converting exact
   identification into pac-identification. **§4.3's drift detection is exactly
   that substitute** — the held-out corpus answers the equivalence query the
   person cannot.
4. **Polynomial is not cheap.** Angluin's own worked example (1987, p. 98) needed
   **25 membership queries** to learn a 3-state DFA, which she calls "rather
   large for a practical system" and poses as an open problem. If each query
   costs a human's attention, question *count* is the budget, and §5.4's
   class-generalization lever is not a nicety.

### 1.9 Version spaces, read from the originals

[fetched: Tom M. Mitchell, "Generalization as Search," *Artificial Intelligence*
18(2):203–226, March 1982, DOI 10.1016/0004-3702(82)90040-6, read in full. And:
Tessa Lau, Steven A. Wolfman, Pedro Domingos, Daniel S. Weld, "Programming by
Demonstration Using Version Space Algebra," *Machine Learning* 53(1–2):111–156,
2003, DOI 10.1023/A:1025671410623 — read from the **author preprint**, not the
typeset article, so definition numbering is content-verified but not
typographically verified.]

Mitchell's `S`/`G` and the delimiting property (§4.3, pp. 212–213) are what §2
uses. Three things from the original are load-bearing here and were not in the
estate's inherited summary:

- **The convergence criterion is detectable, and that is the method's whole
  advantage** (§4.4.1, p. 216): the target is completely determined **iff `S` and
  `G` are equal and contain one generalization.** With a single current
  hypothesis you cannot recognize this condition. §2.2 shows `G` is a constant
  singleton `{opaque}` and `S` is not it, so **this criterion is never met by a
  folder of JSON — mechanically, and at any corpus size.**
- **The three-valued classification is Mitchell's, and it is the honest-inference
  primitive** (pp. 216–217): matches every hypothesis ⇒ positive with certainty;
  matches none ⇒ negative with certainty; **matches some but not all ⇒ cannot be
  unambiguously classified.** That third case is `{"k":"hole"}`.
- **Mitchell already gives the query-selection rule** (§4.4.2, p. 218): request
  the classification of **the instance closest to matching one half of the
  version space**, since either answer eliminates half; and footnote 4 notes that
  results on optimal binary codes apply. He adds the operational corollary — the
  informative instances are *precisely those the current version space cannot
  classify*. §5.4 is a 1982 idea and should say so.

Lau et al. add the algebra: version-space **union** (Definition 1) — and, unlike
Hirsh's boundary-set-representable unions, theirs may be **non-BSR**, which is
what lets a component-wise representation express spaces no single `S`/`G` pair
could — and the **join** (Definition 2), whose **independent** case (Definition 3)
has update cost equal to the sum of the components (**Theorem 2**). Their
`exec_V(i) = {o : ∃f ∈ V, f(i) = o}` is the ambiguity detector: more than one
output means the examples underdetermine the answer *on that input*.

**What this licenses for the MVP, precisely.** Build the candidate space as a
*union* over alternative shapes at a position and a *join* over positions, and
the update cost is linear in the components **provided the joins are
independent** — which they are exactly when per-position consistency does not
interact, i.e. when there are no cross-field invariants. That is the same
condition as the sessions design's L4 path-disjointness
(`concierge-sessions-and-catalog.md:190-200`), arrived at from the learning side.
Two honest limits: Mitchell's own complexity is quadratic in `|S|` and `|G|`, and
version spaces can grow exponentially, so nothing here promises compactness.

### 1.10 Active learning — the defensible basis for "ask the highest-value question", and its three guardrails

[fetched: Yoav Freund, H.S. Seung, Eli Shamir, Naftali Tishby, "Selective
Sampling Using the Query by Committee Algorithm," *Machine Learning*
28(2–3):133–168, 1997, DOI 10.1023/A:1007330508534, read in full; Burr Settles,
"Active Learning Literature Survey," Computer Sciences Technical Report 1648,
University of Wisconsin–Madison, 2009, read in full; Sanjoy Dasgupta, "Analysis
of a greedy active learning strategy," *NIPS 17* (2004), pp. 337–344, read in
full; Dasgupta, "Coarse sample complexity bounds for active learning," *NIPS 18*
(2005), pp. 235–242, read in full; Nick Littlestone, "Learning Quickly When
Irrelevant Attributes Abound," *Machine Learning* 2(4):285–318, 1988, DOI
10.1023/A:1022869011914, read in full. **[unverified]**: Seung, Opper &
Sompolinsky, "Query by committee," *COLT '92*, pp. 287–294, DOI
10.1145/130385.130417 — bibliographic record verified, the paper body was not
readable (403); nothing internal to it is claimed here.]

**The one-line defensible basis**, and it is not what the folklore cites:

> **Dasgupta 2004, Theorem 3.** Greedily choosing the question that most evenly
> bisects the posterior mass of the surviving hypothesis set needs at most
> `4·Q*·ln(1/min_h π(h))` labels in expectation, where `Q*` is what the
> *optimal adaptive* strategy needs — an approximation ratio of at most
> `4·ln|Ĥ|` under a uniform prior.

Supporting: **Littlestone 1988, Theorem 1** — the halving algorithm makes at most
`log₂|C|` mistakes in the finite realizable case; note Littlestone explicitly
**disclaims originating it**, crediting Barzdin & Freivald (1972), Mitchell
(1982), and Angluin (1987), so cite him for the name and Theorem 1, not as
originator. **Freund et al. 1997, Theorem 1** — query-by-committee needs
`O(log(1/ε))` labels under a uniform information-gain lower bound. And in QBC the
probability of accepting a query is exactly **`2F(1−F)`** where `F` is the mass of
one side of the split, with information gain `H(F)` — both maximized at an exact
bisection. That is the formal content of "collapse the most candidates."

**One correction to a widely-repeated citation:** the **splitting index is
Dasgupta 2005, not 2004** — the phrase does not occur in the 2004 text at all.
The two papers are methodologically opposed (2004 is Bayesian and measures
version-space *volume*; 2005 is non-Bayesian and measures *diameter*). The result
we want is the 2004 one. Settles' own bibliography also miscites Dasgupta 2004 as
NIPS volume 16; it is **17**.

**And three guardrails, each of which constrains §5.4:**

1. **Maximal information gain does not imply error reduction.** Freund et al.
   construct a `d`-dimensional "high-low" case that gains a full bit per query
   forever while prediction error converges to a **nonzero constant**, because
   error tracks the version space's *perimeter*, not its volume. This is why QBC
   filters a stream rather than synthesizing an argmax. **A ranking that
   maximizes candidate elimination is not thereby maximizing usefulness**, and
   §5.4's second axis exists for a related reason.
2. **Greedy degrades arbitrarily under a skewed prior.** Dasgupta 2004, Claim 5:
   a class where the optimal tree has average depth **< 3** and greedy has
   average depth **≥ n/2**. Our priors *are* skewed — most fields are boring.
   Also Claim 2: for some classes and pools, **every** query strategy needs
   `≥ m/8` labels, so active questioning can give literally zero benefit.
3. **Every bound assumes truthful, noise-free answers.** Halving, Dasgupta 2004,
   and Dasgupta 2005 are all realizable. **One wrong answer deletes the true
   hypothesis and every bound evaporates.** The literature's instruction is
   *design for retraction* — and foldlab already shipped it: `type.unfill` is an
   exact left inverse of `type.fill` at a path (law C2, `CONTRACT.md:69-78`;
   `walk.go:139-143` exists precisely to make it exact). **An operator who
   answers a frontier question wrongly can take it back, mechanically, and the
   session journal records both.** That is not a feature this design needs to
   add; it is a shipped law meeting its first justification from outside the
   estate.

For vocabulary, Settles' taxonomy is the standard reference and two of its
distinctions matter: **expected model change** (§3.3, e.g. expected gradient
length) is not **expected error reduction** (§3.4, Roy & McCallum 2001), and it is
the latter that Settles identifies with maximizing expected information gain — and
labels the most computationally expensive framework. He also notes, citing
Haussler (1994), that a version space can grow **exponentially**, so QBC's
committee is a subset approximation, and that uncertainty sampling, QBC, and EGL
are all **outlier-prone** — they query controversial but unrepresentative points.
That last one is a direct warning for us: the weirdest field in the corpus is not
the most valuable question.

### 1.11 Programming by example with user disambiguation — the closest applied ancestor

[fetched: Mikaël Mayer, Gustavo Soares, Maxim Grechkin, Vu Le, Mark Marron,
Oleksandr Polozov, Rishabh Singh, Benjamin Zorn, Sumit Gulwani, "User Interaction
Models for Disambiguation in Programming by Example," *UIST '15*, pp. 291–301,
DOI 10.1145/2807442.2807459, camera-ready read in full. Also: Sumit Gulwani,
"Automating string processing in spreadsheets using input-output examples,"
*POPL '11*, pp. 317–330, DOI 10.1145/1926385.1926423, read from the author's
minor-revision PDF; Oleksandr Polozov & Sumit Gulwani, "FlashMeta: a framework
for inductive program synthesis," *OOPSLA 2015*, pp. 107–126, DOI
10.1145/2814270.2814310, read in full; Vu Le, Daniel Perelman, Oleksandr Polozov,
Mohammad Raza, Abhishek Udupa, Sumit Gulwani, "Interactive Program Synthesis,"
**arXiv:1703.03539v1, 10 March 2017 — preprint only, no indexed venue**; do not
imply peer review.]

**This is "inference proposes, the person disposes" as a shipped, measured
system, and it should be treated as the ancestor rather than as a parallel.**

**A correction worth making up front:** FlashFill already asked, in 2011. §5.1 of
the POPL paper is titled "Active Interaction Model" and the abstract advertises
prompting the user on inputs with multiple interpretations. It ranks *and* asks.
It also **rejects synthesizing distinguishing inputs**, arguing that convergence
only requires narrowing to programs equivalent on the actual spreadsheet.

**The mechanism, exactly** (Mayer et al., "Conversational Clarification"):

1. Synthesis returns a version space algebra of consistent programs — typically
   up to **10³⁰** of them, represented in space logarithmic in that number
   because the VSA composes by union and join.
2. Take the top-ranked program `P` and **replace its subexpressions with the top-k
   alternatives from the VSA** (`k = 10` in their tool), producing candidates.
3. **Base the question on the first discrepancy between `P` and a candidate on
   the user's actual data** — never on a synthesized input.
4. The three manifestations of a discrepancy are merged into **one** question:
   *"What should be highlighted: r₁, r₂, or nothing?"* Choosing a region yields a
   positive example; choosing "nothing" yields **two negative examples**.

Properties they claim and the ones they do not: **sound by construction**;
**incomplete**, because candidates are truncated to top-k; **converging**, since
each question strictly shrinks the candidate set — but **worst case exponential**,
with "≤ 5 rounds" being an empirical observation only.

**The user study, with its numbers, because it is the only evidence in this
survey that asking actually helps.** Within-subject, **29 participants**, three
real extraction tasks. Conversational Clarification improved correctness against
the baseline (**W = 78.5, p = 0.01**) with **no completion-time penalty**;
perceived usefulness **5.4 (σ 1.50)** versus **4.2 (σ 2.12)** for the
program-navigation alternative; **27/29 (93%)** used the disambiguation tab while
only **13/29 (45%)** used the program viewer, and 9 of those 13 never opened its
alternatives. **Improved trust on *other* inputs was not significant** — that
result must not be claimed.

**Four things this hands directly to §3 and §5:**

- **Ask about a record the operator actually has.** Both FlashFill and FlashProg
  select distinguishing inputs from the user's own data and argue explicitly
  against generation for real-time interaction. Every question in §3 should quote
  a real record, not a hypothetical one. This design adopts that as a rule.
- **A "no" that yields two negative examples is worth more than a "yes".** Their
  "nothing" answer is the highest-information response, and it is the response
  §2.2 shows a corpus can never produce.
- **A formal ask/don't-ask threshold exists.** Le et al.'s hypothesizer picks
  `q* = argmax_q ds(q, Ñ, φ)` under a disambiguation-score function and **asks
  nothing if `ds(q*) < T`** (empirically `T = 0.47` for one workload). That is the
  right shape for §5.4's ranking: a score plus a silence threshold, so a
  low-value question is simply not asked. **[preprint only.]**
- **The formal basis for "a question is well-posed" is FlashMeta Definition 8**,
  not the UIST paper: given a VSA `Ñ` and an input state `σ`, the clustering
  `Ñ|σ` partitions the candidates into classes that are **semantically
  indistinguishable on `σ`**. A question is well-posed exactly when the
  candidates fall into more than one cluster on a record the operator can look
  at. Do not attribute this to the UIST paper, and do not attribute user-facing
  disambiguation to FlashMeta.

### 1.12 What the survey establishes

Three conclusions, each stronger than "prior work exists":

1. **Nobody asks.** Across the formal lineage (Petricek, PADS) and the
   practitioner lineage (BigQuery, Spark, quicktype, GenSON,
   `json-schema-inferrer`), inference is a *total function* from sample to type.
   Under-determination is real, is detected, and is discharged by fixed
   policy — a hard-coded preference lattice with top-to-bottom rule ordering, a
   greedy MDL search with hand-tuned constants, a join semilattice topped by
   `String`, `cases.size < √numValues`, or a `noOp()` default. **Not one of them
   records, at inference time, which decisions were underdetermined.** That gap
   is where this design is genuinely novel rather than a reimplementation.
2. **Two systems built a falsifiability instrument, and both are post-hoc.**
   LearnPADS's accumulator measures per-field deviation against fresh data; F#
   Data turns a changed sample into a failed recompile. Both tell you the guess
   was wrong *after* the guess has been committed to. §4.3 is the same
   instrument moved onto a content-addressed substrate; §3 is the attempt to
   move it *before* the commitment.
3. **Both formal lineages ran into exactly our wall and named it.** Petricek's
   Theorem 3 is conditioned on `S(d′) ⊑ σ`, an antecedent no sample establishes.
   Fisher–Walker–Zhu–White cite Gold and conclude "errors in inference are
   inevitable." Wand proved record *concatenation* — which is what unifying
   records across a folder is — has no principal types, only finite complete
   sets. **Three independent arguments that the honest output of this feature is
   a set with a question attached, not an element.**

4. **The design this document proposes has already been built once, measured, and
   preferred by users — for programs rather than for types.** Mayer et al. (§1.11)
   is the same architecture: compute the whole consistent set, cluster it by
   observable behavior on the user's real data, ask about the first discrepancy,
   convert the answer into examples, re-synthesize. It improved correctness
   significantly at no time cost, and **93% of participants used the asking
   interface while only 45% opened the "here is the program we inferred" view.**
   The strongest available argument for this design is not theoretical; it is
   that when someone shipped both halves side by side, the asking half won.

**Two corrections this survey owes back**, both recorded as findings rather than
buried: the estate's own Gold citation overstates the informant result (F6,
§1.6), and the "splitting index" is Dasgupta 2005, not 2004 (§1.10) — the 2004
paper gives the greedy `4·ln|Ĥ|` bound, which is the result this design actually
wants.

**And one methodological note that shapes everything after this.** §1.7's
tell-tale condition is not a citation, it is a *test*, and §2.6 runs it against
`flb.type.v0`. The result is sharper and more depressing than Gold's general
statement, and it is the single most useful thing in this document for anyone
deciding how much to build.


---

## PART 2 — THE FRAME: WHAT A FOLDER OF JSON CAN AND CANNOT MOVE

This part states the inference problem in the estate's own grammar, so that the
limits are checkable against `walk.go` rather than cited from a 1967 paper.

### 2.1 The hypothesis space, stated exactly

The hypothesis space `H` is the set of closed `flb.type.v0` terms. Its
generators are the thirteen kinds enumerated at `proto/go/protod/walk.go:19-22`:

```
string · bool · int · float · null · opaque
literal · list · struct · union · brand · check · ref
```

`hole` is the fourteenth and is authoring-only: it appears in `partialKinds`
(`walk.go:24`) and is refused by `walkStructure` with law C5 — *"holes are
authoring-only — a tree containing a hole never enters the catalog and never
bears identity"* (`walk.go:84-86`).

The intended denotation `⟦T⟧ ⊆ JSON` is what a derived codec accepts
(`proto/ts/src/codegen.ts`). Two honest caveats, stated once and load-bearing
throughout:

1. **No shipped component enforces `⟦·⟧` at admission.** Ingress checks identity
   resolution only; payload conformance "is explicitly NOT checked (ratified;
   conformance arrives later as a codegen-derived codec)"
   (`proto/wire/CONTRACT.md:110-117`). So the version space below is over an
   *intended* denotation whose only current witnesses are the three derivation
   targets.
2. **The three derivation targets do not agree on `⟦·⟧`.** §3 F4 gives the
   executed instance.

### 2.2 The `G`-boundary is constant — positive data never moves it

`{"k":"opaque"}` "means any well-formed v0 value not structurally described
here" and "derivation targets render it permissively (`Schema.Unknown`, JSON
Schema `{}`, Go `any`)" (`CONTRACT.md:149-153`; confirmed in code at
`codegen.ts:73-74`, `:164-165`, `:263-264`). Hence `D ⊆ ⟦opaque⟧` for every
`D`, so `opaque ∈ VS(D)` always, and it is the maximum of `VS(D)` under
denotational inclusion.

> **G-constancy.** For every corpus `D`, the maximally-general boundary of
> `VS(D)` is the singleton `{opaque}`. It is independent of `D`, of `|D|`, and
> of how the corpus was collected.

This is Gold's asymmetry, instantiated in this grammar and checkable rather than
cited. It has three consequences the design is built on:

- **No amount of data narrows the type from above.** "We have ten million
  records" is not an argument. `G` after ten million records is what it was
  after zero.
- **The corpus refutes only over-narrow candidates.** A positive example `d`
  refutes exactly `{ T : d ∉ ⟦T⟧ }`. So data can tell you `int` is wrong (a
  fractional value arrived); it can never tell you `int` is right.
- **The dialogue is the only `G`-moving channel that exists.** This is the exact
  dual of the estate's refusal thesis: a typed refusal is a *precomputed
  `G`-refinement* handed to the learner as a field
  (`docs/design/2026-08-14-learning-by-refutation.md:150-188`). Refusals move
  `G`; data moves `S`; **type population from data needs both halves, and the
  data supplies only one.**

### 2.3 The `S`-boundary is computable, is not tight, and is not the answer

A minimal consistent hypothesis exists and is nearly mechanical:

- scalars → `{"k":"literal","value":v}` per observed value, unioned;
- objects → a `struct` whose every field is a literal, unioned across observed
  records. **This denotes exactly the observed set only if `struct` is closed** —
  and whether it is closed has no answer (F4, §3.6): under the JSON Schema target
  it is, under the Effect and Go targets it is not. So **F4 does not merely make
  one ambiguity unaskable; it makes the `S`-boundary itself ill-defined**, and
  every claim in this section about "the most specific consistent hypothesis"
  inherits that indeterminacy. That is the strongest available argument that F4
  is the finding to fix first;
- arrays → **not tight.** `flb.type.v0` has no tuple kind: `{"k":"list","of":T}`
  (`walk.go:109-120`) cannot pin length or position. The minimal list type over
  `[1,2]` is `list of union[literal 1, literal 2]`, which also admits `[2,1]`,
  `[1]`, and `[]`. So `S` over array-bearing data **over-approximates, and the
  over-approximation is silent** (F3, §3.11).

Two further structural facts:

- `check` nodes are denotationally invisible at admission (`CONTRACT.md:110-117`)
  and denotationally narrowing under the Effect target (`codegen.ts:110-119`,
  `base.check(builder(args))`). So the ordering on `H` is a **preorder**, not a
  partial order: distinct terms with equal denotation exist by construction, and
  "the `S`-boundary" is a set of equivalence classes, not an element.
- `S` is a useless type. It is the corpus, re-spelled, and it certifies. That is
  worth stating plainly because it is the trap a naive "just infer it" feature
  falls into from the other side: the two mechanically-defensible answers are
  `opaque` (tells you nothing) and `S` (tells you nothing you did not already
  have). **Every useful answer is a choice, and a choice needs a chooser.**

### 2.4 Three of the thirteen kinds are invisible to data in principle

This is the exact, principled form of the operator's worry that a brand proposal
"crosses shape into meaning".

| kind | identity-bearing? | denotation under the shipped targets | can data ever constrain it? |
|---|---|---|---|
| `brand` | **yes** — `UserId ≠ OrderId` at equal shape (ticket 004 law 4) | `of.pipe(Schema.brand(name))` — a phantom refinement, no runtime predicate (`codegen.ts:105-109`); JSON Schema emits the annotation keyword `x-flb-brand` (`codegen.ts:197-201`); Go emits a comment (`codegen.ts:282-286`) | **never** |
| `ref` | **yes** — a ref node's bytes are `{"k":"ref","digest":…}`, not the target's | resolves to the target and compiles it (`codegen.ts:121-133`) | **never** |
| `check` | **yes** — it is inside the canonical bytes (`walk.go:288-327`) | **four different meanings**: no constraint at admission (`CONTRACT.md:110-117`); an enforced predicate in Effect (`codegen.ts:110-119`); an enforced JSON Schema keyword for the seven known names and an inert `x-flb-check` annotation — the code's own comment says "claims, not constraints" — for any other name (`codegen.ts:202-226`); a source comment in Go (`codegen.ts:287-292`) | **partially** — a pattern all values satisfy is a candidate, refutable by one counterexample; never confirmable |

The general statement:

> **Non-injectivity.** `⟦·⟧ : H → 𝒫(JSON)` is not injective. Inference from data
> constrains at most a *denotation*; identity is a decision taken inside the
> fibre `⟦·⟧⁻¹(L)`, and that fibre is infinite. **Inference cannot enter the
> fibre at all.**

This is the evidence/decision boundary of
`docs/design/2026-08-14-the-language-surface.md:41-60` *derived* rather than
asserted, and it lands on a law the estate already ratified from the other
direction: identity commits shape, annotations are claims, and brands are the
one naming channel identity keeps — *"brand or be unfindable"*
(`docs/design/2026-08-14-concierge-sessions-and-catalog.md:49-52`).

It also produces a design tension that a version-space-only question ranking
would get exactly backwards, and §5.4 addresses it: **a brand question has zero
information value and very high consequence value.** Zero, because no answer
changes `VS(D)`. High, because the sessions design's finding is that an unbranded
type is unfindable in the catalog forever — and a bulk inferrer that defaults to
no-brand will populate a catalog that cannot be searched for meaning.

### 2.5 The evidence root is lossy exactly where the first ambiguity lives

**[executed]** The pipeline the operator described — bootstrap data in, then make
types from it — has a failure at step one that no amount of inference cleverness
recovers from.

`go/canonical` decodes every JSON number by `strconv.ParseFloat(…, 64)`
(`go/canonical/canonical.go:101-102`) and re-emits it under RFC 8785's
ECMAScript number formatting. Ingress journals *the canonical bytes of the
frame, never the sender's formatting* (`CONTRACT.md:113-116`). So:

```go
// go/probeinfer_main.go — run with: mise x go@1.26.5 -- go run probeinfer_main.go
package main

import (
	"crypto/sha256"; "encoding/hex"; "fmt"
	"foldlab/canonical"
)

func show(label, in string) {
	out, err := canonical.Canonicalize([]byte(in))
	if err != nil { fmt.Printf("%-28s REFUSED %v\n", label, err); return }
	sum := sha256.Sum256(out)
	fmt.Printf("%-28s %-56s %s\n", label, string(out), hex.EncodeToString(sum[:]))
}

func main() {
	show("payload 1",   `{"n":1}`)
	show("payload 1.0", `{"n":1.0}`)
	show("payload 1e0", `{"n":1e0}`)
	show("id 9007199254740993", `{"id":9007199254740993}`)
	show("id 20 digits", `{"id":12345678901234567890}`)
	show("optional absent", `{"k":"struct","fields":{"a":{"k":"string"}}}`)
	show("optional []",     `{"k":"struct","fields":{"a":{"k":"string"}},"optional":[]}`)
}
```

Output, verbatim:

```
payload 1                    {"n":1}                     2bfd14f43d17fc7cea24e0917a8879b4b2f880b8baeec1b9d90fbaad655e71bd
payload 1.0                  {"n":1}                     2bfd14f43d17fc7cea24e0917a8879b4b2f880b8baeec1b9d90fbaad655e71bd
payload 1e0                  {"n":1}                     2bfd14f43d17fc7cea24e0917a8879b4b2f880b8baeec1b9d90fbaad655e71bd
id 9007199254740992          {"id":9007199254740992}     24bb430971eb50f964e63784a7ad4f3411bc7cdb1659188e371150793e872da1
id 9007199254740993          {"id":9007199254740992}     24bb430971eb50f964e63784a7ad4f3411bc7cdb1659188e371150793e872da1
id 20 digits                 {"id":12345678901234567000} 6cf3f4db3b979bef6429ede1ffd9a11c2b89b42abc93f7ca44b2a48465cc92c6
```

Two consequences, both load-bearing for this design:

**(a) `int` vs `float` cannot be asked of admitted data.** `1`, `1.0`, and `1e0`
have the same canonical bytes and the same digest. The lexical distinction that
every other inference tool keys on is destroyed *by our own canonicalizer*,
before the inferrer sees anything. Therefore: **the inference run must pin the
RAW file digests, not the canonical digests**, and the inferrer must read raw
bytes. If data was bootstrapped through `flb.ing.<journal>` first, the int/float
question is unanswerable from what the system holds — which is precisely the
operator's stated flow. §4.1 makes raw-digest pinning a contract field for that
reason and no other.

**(b) Integer identifiers beyond 2⁵³ are silently altered.** `9007199254740993`
becomes `9007199254740992`; a twenty-digit id becomes a different twenty-digit
id. This is RFC 8785-conformant — JCS commits to IEEE 754 binary64, and
`Decode`'s doc comment says so (`canonical.go:69-71`) — but note that it enforces
*finiteness* and not *exact representability*, so the loss is admitted rather
than refused. The consequence for type population is concrete and belongs in the
dialogue, not in a footnote: **a numeric `*_id` field is a data-integrity
question before it is a type question**, and the honest inferrer must surface it
as such rather than proposing `{"k":"int"}` over corrupted evidence. Recorded as
open question Q4 (§7).

### 2.6 Angluin's test, run against `flb.type.v0` — the learnable fragment is tiny and nameable

§2.2 says positive data never moves `G`. Angluin's tell-tale condition (§1.7)
says something more useful, because it is a *per-hypothesis* test rather than a
statement about the class: a language `L` is pinnable from positive data only if
there is a **finite** `T ⊆ L` that no proper sub-language of the class contains.
Run it on the kinds.

Write `⟦T⟧` for the intended denotation and note the general fact that makes the
test mechanical here: **if `⟦T⟧` is finite, then `T` itself is a tell-tale** —
take `T = ⟦T⟧`; no proper subset of it is all of it. And **if `⟦T⟧` is infinite,
`T` has no tell-tale**, because for any finite witness set `W ⊆ ⟦T⟧` the grammar
can express a proper sub-language containing `W`: the union of `{"k":"literal"}`
nodes over the scalars in `W`, or the union of literal-valued `struct`s over the
objects in `W`. So:

> **The text-learnable fragment of `flb.type.v0` is exactly the finite types.**
> A closed term has an Angluin tell-tale iff its denotation is finite.

Enumerated against the thirteen kinds:

| kind | denotation | tell-tale? | what a corpus can settle |
|---|---|---|---|
| `null` | `{null}` — finite | **yes** (`{null}`) | fully determined by one observation |
| `bool` | `{true,false}` — finite | **yes** (`{true,false}`) | fully determined by observing both |
| `literal v` | `{v}` — finite | **yes** (`{v}`) | fully determined |
| `union` of the above | finite | **yes** | fully determined |
| `struct` of the above | finite **iff `struct` is closed** | **F4 decides** | see below |
| `string`, `int`, `float` | infinite | **no** | nothing, ever |
| `list of T` | infinite for every `T` — all lengths | **no** | nothing, ever |
| `opaque` | everything | **no** | nothing, ever |
| `brand`, `ref` | `= ⟦of⟧` | inherits; and invisible anyway (§2.4) | nothing |
| `check` | target-dependent (§2.4) | inherits | a refutation only |

Three consequences, and they are the practical core of this document:

1. **A folder of JSON fully determines the type of a field only when that field
   is boolean, null, or a fixed small set of scalars.** Everything else — every
   string, every number, every array, every open record — is underdetermined by
   construction and needs the person. That is not a limitation of our inferrer;
   it is a property of the hypothesis space, and it is checkable in the table
   above.
2. **F4 decides whether *any* `struct` is learnable.** Under the closed reading a
   `struct` over finite fields is finite and therefore tell-tale-equipped; under
   the open reading (Effect, Go) it admits every extra key and is infinite, so
   **no record shape is ever pinnable from data at all**. §3.6's finding is thus
   not one ambiguity among eleven: it is the switch that decides whether the
   learnable fragment contains anything compound.
3. **The design obligation Angluin actually hands us is constructive.** The
   sufficient direction of her theorem needs the tell-tales to be *uniformly
   r.e.*, and for the finite fragment they are trivially so — enumerate the
   denotation. So the MVP can be **conservative** in the technical sense on that
   fragment: no unjustified mind changes, ever, at boolean and null and
   fixed-literal positions. **The inferrer should decide those positions outright
   and hole everything else**, and §5.1's proposal set is written to do exactly
   that. Deciding a `bool` field is not a guess; deciding a `string` field always
   is. The grammar itself tells you which is which.

---

## PART 3 — THE AMBIGUITY CATALOG

This is the payload. Each row is a thing a folder of JSON underdetermines,
mapped to the node kinds it lives in, with (i) what the data *can* decide and
with what caveat, (ii) what it can *never* decide, (iii) the frontier question,
and (iv) whether the undecidedness is expressible as a `{"k":"hole"}` under
today's grammar.

**Two rules govern how every question below is phrased, both imported from
§1.11.** First, **quote a record the operator actually has.** FlashFill and
FlashProg both select distinguishing inputs from the user's own data and argue
explicitly against synthesizing them; a question about a hypothetical document is
a question about the inferrer, not about the data. Second, **a question is
well-posed exactly when the candidates fall into more than one behavioral cluster
on that record** — FlashMeta's Definition 8, `Ñ|σ`, semantic
indistinguishability with respect to a concrete input. If two candidate fills
accept and reject the same records across the whole corpus, there is no question
to ask; there is a note to write.

Column (iv) is the one that produces findings. `flb.type.partial.v0` admits a
hole at exactly one nonterminal — `T`, the type-node position — and
`FINDING-FRONTIER-001` establishes that this is grammatically forced, not an
implementation shortcut (`proto/go/protod/FINDING-FRONTIER-001.md:1-27`). Every
ambiguity that lives at a `T` position is expressible; every ambiguity that
lives in *metadata* — a field-name list, a brand name, a check parameter — is
not.

### 3.1 The catalog, compact

| # | Ambiguity | Kinds | Data can decide | Data can NEVER decide | Hole? |
|---|---|---|---|---|---|
| **A1** | `int` vs `float` | `int` `float` | that `int` is **wrong** (one fractional value refutes it) | that `int` is right — `{1,2,3} ⊆ ⟦int⟧ ∩ ⟦float⟧` for all n. And after canonicalization the lexeme is gone (§2.5a) | **yes** |
| **A2a** | value `null` vs not | `null` `union` | that null must be admitted (one null refutes non-null) | that null must not be | **yes** |
| **A2b** | field **optional** vs required | `struct.optional` | that it is optional (one absence refutes required) | that it is required — `⟦required⟧ ⊆ ⟦optional⟧`, so presence never refutes | **NO — F1** |
| **A3** | `string` vs literal enum | `string` `literal` `union` | that an enum is **too small** (a fourth value refutes a 3-enum) | that the enum is closed | **yes** |
| **A4** | list element unification | `list` `union` `opaque` | the observed element shapes; that a narrower `of` is wrong | that the element set is closed; a **tuple** reading (inexpressible, F3) | **yes** |
| **A5** | `struct` vs open map | `struct` `opaque` | the observed key set; that a key set is *large and singleton-heavy* | that the key set is closed. And the **map horn is inexpressible — F2**; `struct`'s own width is **undefined — F4** | **partly** |
| **A6** | brand candidate | `brand` | **nothing** — `⟦brand(n,T)⟧ = ⟦T⟧` (§2.4). It can decide the *evidence* (name pattern, value regex, distinctness) | anything at all about branding | **yes at `T`; NO for the brand name — F1 again** |
| **A7** | `ref` vs inline | `ref` | that two subtrees are structurally identical (Merkle, cheap) | that they are the *same type* | **yes** |
| **A8** | `union` vs `opaque` at a wild position | `union` `opaque` | the observed member shapes | that the member set is closed | **yes** |
| **A9** | fixed-value field: `literal` vs its scalar type | `literal` `string` | that a literal is wrong (a second value refutes it) | that it is right | **yes** |
| **A10** | never-observed position (all-`null` field, all-empty array) | any | **nothing** | **nothing** | **yes — and here the hole *is* the answer** |
| **A11** | `check` candidate (a pattern all values match) | `check` | that a check is **wrong** (one counterexample) | that it is right. Also: the check has no meaning at admission (§2.4) | **yes at `T`; NO for `check.args` — F1 again** |

### 3.2 A1 — `int` vs `float`

The classic. `{"k":"int"}` derives to `Schema.Int` (`codegen.ts:67-68`), JSON
Schema `{"type":"integer"}` (`codegen.ts:158-159`), Go `int64`
(`codegen.ts:257-258`).

- **Decides:** one value with a nonzero fractional part refutes `int`
  permanently. No sample-size caveat on refutation — it is a single-witness
  fact, and it is exactly the shape of evidence the estate already privileges.
- **Never decides:** an all-integral sample. `float` survives every corpus that
  `int` survives.
- **The estate-specific twist:** §2.5(a). The evidence root cannot even *carry*
  the distinction.
- **How the field answers it:** Spark widens `Long ⊔ Double → Double` and says
  nothing; GenSON widens `integer → number` on the first float; Petricek orders
  `int ⊑ float` and joins to `float`; BigQuery does not document the case at all
  (§1.4). Only `json-schema-inferrer` treats it as a **decision**, and it splits
  it onto two axes — *is this one number an integer* (`nonFloatingPoint` vs
  `mathematicalInteger`) and *how do we aggregate* (`IF_ALL` / `IF_ANY` /
  `NEVER`). That two-axis split is the right shape for our question and we
  should copy it verbatim.
- **Question:** *"All 12,431 observed values of `qty` are integral (min 0, max
  914, no fractional part). Is `qty` an integer field, or a decimal field whose
  sample happens to be whole? [int | float]"*
- **Ranked class-level variant** (see §5.4): *"27 fields in this corpus are
  all-integral. Answer for `qty` only, or for all 27?"*

### 3.3 A2 — missing vs null vs optional, and the finding it forces

JSON conflates three situations and `flb.type.v0` splits them across two
channels:

| situation | channel | position |
|---|---|---|
| key present, value `null` | `{"k":"null"}` inside a `union` | a **`T`** position |
| key absent | membership in `struct.optional` | a **metadata** position (`walk.go:247-284`) |
| key always present, never null | neither | — |

- **Decides:** one `null` refutes any candidate whose field type excludes null;
  one absence refutes required.
- **Never decides:** always-present. `⟦required⟧ ⊆ ⟦optional⟧` so presence is
  never a refutation. The honest statistic is the **rule of three**: observing
  `n` records with zero absences bounds the absence rate at `p ≤ 3/n` with 95%
  confidence [fetched: Hanley & Lippman-Hand, "If nothing goes wrong, is
  everything all right? Interpreting zero numerators," *JAMA* 1983;
  reprint at `jhanley.biostat.mcgill.ca/Reprints/If_Nothing_Goes_1983.pdf`].
  10,000 clean records therefore license *at most* "fewer than 3 in 10,000
  future records omit this" — never "this field is required".
  **And the bound assumes exchangeability, which a folder violates**: files
  arrive sorted by date, by tenant, by export job. A schema change that began
  last Tuesday is systematically underrepresented in a corpus sorted by date and
  truncated. State the assumption on the proposal; do not launder it. **BigQuery
  ships the violation as a product default** — 500 rows of one randomly chosen
  file (§1.4) — and calls the result a "best-effort attempt".
- **How the field answers it:** Spark marks **every** inferred field
  `nullable = true` unconditionally, so it cannot express "always present" even
  when it is true — the mirror image of F1, reached by choice rather than by
  grammar. GenSON takes the exact intersection ("the keys that have appeared in
  *every* object it has seen") and drops the keyword when that empties.
  `json-schema-inferrer` defaults to emitting no `required` at all. quicktype
  marks a property optional if it is absent from any member of a merged clique.
  Petricek et al. turn one absence into `nullable` in the type. **Five systems,
  five different silent answers to one question** — which is the strongest
  empirical evidence available that it is a question.
- **Question:** *"`middle_name` is present in 9,998 of 10,000 records and `null`
  in 12 of those. [required+nullable | optional+non-null | optional+nullable].
  Note: zero absences would still only bound the absence rate at 3-in-10,000,
  and the corpus is not a random sample."*
- **Expressibility: this is the primary finding.**

> **FINDING F1 — the most common JSON ambiguity is half-representable.**
> `struct.optional` is an array of field-name strings (`walk.go:247-284`) and
> holes exist only at `T` (`walk.go:24`, `:79-88`;
> `FINDING-FRONTIER-001.md:1-27`). There is therefore **no partial term that
> says "the optionality of field `f` is undecided."** The inferrer must emit
> `optional:[...]` or omit the key — and *both are decisions*. Consequence: **the
> candidate partial is not a complete statement of the inferrer's uncertainty**,
> and any consumer that reads only the partial is misled about what was
> guessed. The ambiguity report is therefore not an ergonomic extra; it is
> load-bearing, and it must be content-addressed and travel with the candidate.

Two corollaries worth recording:

- **F1 challenges ticket 025's pre-registered prediction.** 025 predicted that
  *"the first real demand [for metadata holes] will come from ticket 015 …, not
  from `flb.type.v0` itself — the type grammar's names are few and caller-owned"*
  (`docs/map/tickets/025-typed-metadata-holes.md:38-45`,
  2026-08-14). Here is a second, independent demand, and it comes from
  `flb.type.v0` itself. It is also not about *names*: the position wanted is
  membership in `optional`, which is neither a name the caller owns nor a
  binding in a generated DSL. And at bulk scale the "few, caller-owned" premise
  inverts — a 400-field corpus has 400 optionality decisions and the caller has
  an opinion about none of them yet. **Recorded as evidence against the
  prediction, for the operator to weigh in 025's disposition.**
- **The three FINDING-FRONTIER-001 dispositions score differently under this
  consumer.** Disposition 1 (holes stay at `T`) is *sufficient* for type
  population only if the ambiguity report is ratified as a first-class
  content-addressed artifact — otherwise A2b, A6's name, and A11's args are
  silently guessed. Disposition 2 (typed metadata holes) is what this consumer
  actually wants and is the deep change 025 describes. Disposition 3 (legality =
  admits a closed completion) is orthogonal here: it improves `Legal`, not the
  set of hole *positions*, so it does not help F1 at all. **That is a new
  discrimination among the three dispositions and it belongs in 025.**

### 3.4 A3 — `string` vs literal enum

The mission's example: three distinct values in 10,000 records.

- **Decides:** a fourth value refutes the three-member enum. Enums are refutable
  from text; open strings are not. This is Gold's superfinite argument in
  miniature, at one field.
- **Never decides:** closure.
- **The honest decision aid** is the *missing-mass* estimate rather than the
  distinct-value count. Good–Turing estimates the total probability of unseen
  species as `n₁/n`, the fraction of the sample seen exactly once [fetched:
  Good, "The population frequencies of species and the estimation of population
  parameters," *Biometrika* 40(3-4):237–264, 1953, DOI
  10.1093/biomet/40.3-4.237; estimator formula and the O(√(log(1/δ)/n))
  finite-sample rate restated from MIT 6.864 lecture notes on
  McAllester & Schapire, "On the convergence rate of Good-Turing estimators,"
  *COLT 2000*, pp. 1–6 — the paper's bibliographic details are fetched, the
  theorem wording is **[unverified verbatim]**].
  Two corpora with the same distinct count are not the same evidence:

  | field | n | distinct | singletons `n₁` | Good–Turing unseen mass |
  |---|---|---|---|---|
  | `status` | 10,000 | 3 | 0 | 0.00% |
  | `sku_prefix` | 10,000 | 3 | 2 | 0.02% |
  | `region` | 10,000 | 487 | 300 | 3.00% |

  Say that number out loud in the question. It is not a decision — the
  exchangeability assumption is again violated by a folder — but it is the
  difference between a question the operator can answer in one second and a
  question they cannot answer at all.
- **How the field answers it:** only quicktype discovers enums at all, and its
  rule is `numValues ≥ 10 && cases.size < √numValues` — so three distinct values
  in 10,000 records **is** an enum to quicktype (`3 < 100`), decided by a
  constant that appears in no documentation (§1.4). `json-schema-inferrer` and
  GenSON refuse to discover enums at all; enums must be declared. Note the
  spread: on the mission's exact example, the field's tools split between
  "obviously an enum" and "we will not guess."
- **Question:** *"`status` takes 3 distinct values in 10,000 records (active
  8,201 / pending 1,600 / closed 199). No value occurred exactly once, so the
  estimated probability of an unseen fourth value is 0.00% under
  exchangeability — an assumption this corpus does not satisfy. [enum of exactly
  these three | open string | enum plus opaque escape]"*
- **Expressible:** yes. `{"k":"union","of":[{"k":"literal","value":"active"},…]}`
  vs `{"k":"string"}`, both fills at the same `T`.
- **A9 is the `k = 1` case** and deserves its own row because it is the most
  seductive silent guess in the whole catalog: a `version` field that is
  `"v1"` in every record. `{"k":"literal","value":"v1"}` is a strictly stronger
  claim than `{"k":"string"}` and no corpus supports it. Note the derivation
  consequence that makes the question worth asking: the Go target erases both
  literals and unions to `any` (`codegen.ts:267-268`, `:269-276`), so the *value* of
  answering A3/A9 is target-dependent, and the question should say which target
  the operator cares about.

### 3.5 A4 — list element unification

- **Decides:** the observed element shapes; refutes any `of` excluding one.
- **Never decides:** closure of the element set, and — importantly — the *tuple*
  reading. A heterogeneous array `[timestamp, level, message]` is a record in
  array clothing, and **`flb.type.v0` has no tuple kind** (F3, §3.11), so the
  only expressible answers are a union element type or `opaque`. The question
  must say so rather than offering a horn that cannot be filled.
- **The clean case:** if every observed array is empty, *every* element type is
  consistent — the version space at that position is the whole hypothesis space.
  This is A10, and it is where the inferrer is exactly right: emit
  `{"k":"list","of":{"k":"hole"}}` and ask nothing beyond "what goes here?".
- **Question:** *"`tags` is an array in all 10,000 records; 8,700 are empty and
  the 1,300 non-empty contain only strings (max length 7). Element type?
  [string | union of observed | opaque]. A positional/tuple reading has no
  representation in flb.type.v0 today."*

### 3.6 A5 — `struct` vs open map, and two more findings

- **Decides:** the observed key set, and a strong *signal*: a key set that is
  large and singleton-heavy (9,431 distinct keys over 10,000 records, 7,800 seen
  once) is evidence of a map. It is a signal, not a decision.
- **Never decides:** closure.
- **How the field answers it:** quicktype has `mapSizeThreshold = 20`, forces a
  map when all keys are digits, and otherwise scores how "word-like" the key
  names look with a Markov chain whose formula its author documents as *"The
  details of the formula are immaterial because I pulled it out of my ass."*
  (§1.4). That comment is the most honest sentence in the practitioner
  literature: it is what a silent policy looks like when someone writes it down.
  Spark, Petricek, GenSON, and `json-schema-inferrer` do not attempt map
  inference at all — an object is a record, always.
- **Question:** *"`counters` has 9,431 distinct keys across 10,000 records
  (7,800 seen exactly once), and every value is integral. A struct with 9,431
  fields, or a map from string to int? The map answer has no representation in
  flb.type.v0 today — answering it files a grammar request rather than a fill."*
- **Expressibility — this row has two findings.**

> **FINDING F2 — the map horn is inexpressible.** `flb.type.v0` has no
> map/dictionary kind (`walk.go:19-22`). A JSON object with dynamic keys can be
> expressed only as `{"k":"opaque"}` — which discards the *value* type as well —
> or as a `struct` enumerating the observed keys, which asserts closure. So
> `struct` vs open map is an ambiguity **one of whose horns has no legal fill**.
> The concierge is not violated (nothing illegal is offered as a fill), but the
> ambiguity report must mark that answer `INEXPRESSIBLE` and route it as a
> grammar request against ticket 004's growth path, rather than pretending the
> question was answered.

> **FINDING F4 — the shipped derivation targets disagree on `struct` width, and
> nothing walls it.** `flb.type.v0` never states whether a `struct` admits keys
> beyond its declared fields. The three targets answer differently:
> the JSON Schema target emits `additionalProperties: false`
> (`codegen.ts:186`) — extra keys **refused**; the Effect target emits
> `Schema.Struct(built)` (`codegen.ts:93`), whose documented default is
> `onExcessProperty: "ignore"`, which "strips unknown object keys"
> (`repos/effect/packages/effect/src/SchemaAST.ts:445`) — extra keys **accepted**;
> the Go target emits a plain struct with `json:` tags (`codegen.ts:295-309`),
> and `encoding/json` ignores unknown fields — extra keys **accepted**. The
> cross-target law in the test suite is *derivability* consistency — both targets
> derive, or both refuse at the same path (`proto/ts/test/codegen.test.ts:105-125`,
> `:255-262`) — so no gate compares *acceptance over values*, and the divergence
> is invisible. Consequence for this design: the row-polymorphism question ("is
> this record closed or open?") cannot be asked honestly, because the closed
> horn does not have one meaning. **This is a finding about the shipped
> codebase, not about inference, and it is the one item here that should become a
> ticket regardless of whether type population is ever built.** It also reaches
> back into §2.3: because `struct` width is undefined, the `S`-boundary — the
> most specific hypothesis consistent with the corpus, and the only thing a
> folder of JSON determines at all — is itself ill-defined for any object-bearing
> corpus. **Every other finding here is about what the grammar cannot say; F4 is
> about the grammar saying two things at once.**

- **Related, smaller:** the Go target renders `optional` as `*T` with
  `,omitempty` (`codegen.ts:303-305`), so absent and `null` collapse to `nil` and
  a present-but-null field re-encodes as absent. **A2's distinction, once
  decided, is discarded by one shipped target.** Worth saying in the question.

### 3.7 A6 — brand candidates: the honest handling

The mission is right that this crosses from shape into meaning, and §2.4 gives
the exact reason: `⟦brand(n,T)⟧ = ⟦T⟧`, so no JSON value can ever confirm or
refute a brand. Data can only observe a *coincidence*: a field named
`account_id` whose 10,000 values all match `^[0-9a-f]{64}$` and are all
distinct.

Rules, stated as obligations on the MVP (§5.5 makes them testable):

1. **The candidate partial contains no `brand` node.** Ever. Not behind a flag.
2. The brand candidate appears in the **ambiguity report** with its full
   evidence: field name, value regex, distinctness, cross-file reuse.
3. The question states what branding does and does not do: *"Branding changes
   identity, not admission. `UserId` and `OrderId` at equal shape are different
   cataloged types; nothing at ingress will check it."*
4. The question is ranked **high** despite having zero information value,
   because of the consequence asymmetry in §2.4 and the sessions design's
   *brand-or-be-unfindable* finding. §5.4 formalizes the two-axis ranking.
5. **Expressibility:** the brand *node* is a legal fill at `T`. The brand *name*
   is a metadata position with no hole (`walk.go:180-186` requires a non-empty
   string), so "brand it, name to be decided" is **not a partial state** — F1's
   third instance, and the one closest to ticket 025's own framing.

Question form: *"`account_id`: 10,000 values, all matching `^[0-9a-f]{64}$`, all
distinct, no value reused across files. [leave as string | add a pattern check |
brand it (name?) | brand + check]. Branding changes identity, not admission."*

### 3.8 A7 — `ref`: the Merkle-sharing question, sharpened

The mission calls this the Merkle-sharing question. The sharpening is that
**structural sharing is already free and the `ref` decision is not about it.**

- Under `bytes-sha256-v1` (`CONTRACT.md:176-179`), two inline occurrences of the
  same subtree already have identical canonical bytes and identical digests
  *as subtrees*. Nothing is duplicated in any sense that matters to identity.
- What `ref` changes is (i) the enclosing type's digest — `{"k":"ref","digest":d}`
  is not the target's bytes — and (ii) **binding**: two positions that share a
  ref move together forever; two positions that inline diverge independently.
- So the question is not "should we deduplicate?" It is **"are these the same
  type, or two types that happen to look alike today?"** — which is a meaning
  question, and `ref` is denotation-neutral (§2.4), so no corpus answers it.
- **Decides:** exact structural repetition, cheaply, by digesting each inferred
  subtree. This is where the estate's Merkle machinery genuinely earns its keep
  in the inferrer.
- **Question:** *"The subtree `{city:string, street:string, zip:string}` appears
  at `billing` and at `shipping` in all 10,000 records, and is already cataloged
  as `4f2a…`. [reference the cataloged type at both | reference at one | inline
  both]. Referencing binds them: a later change to the referenced type changes
  both positions."*
- **Expressible:** yes, and the concierge already offers it — `ref` enters the
  frontier's `legal` set whenever the catalog has a resolvable digest
  (`proto/go/protod/concierge.go:160-165`), with `refs` capped at the
  lexicographically first 16 (`CONTRACT.md:81-85`).
- **One consequence the question should state:** the derivation targets treat
  `ref` unevenly. The Effect target resolves the digest and compiles the target
  into a predicate, so the denotation is preserved (`codegen.ts:121-133`;
  `ref` at `proto/ts/src/author.ts:30-38` declares `isTarget(input)`). The JSON
  Schema target emits `{"$ref":"flb:<digest>"}` (`codegen.ts:228-229`) — a URI
  scheme no off-the-shelf validator resolves — and the Go target emits
  `any // ref <digest>` (`codegen.ts:293-294`). **Choosing `ref` over inline is
  therefore not free in the derived artifacts**, and the operator should be told
  which target they care about before answering.
- **MVP scope:** detect and **report** shared subtrees; propose no refs. §5.2.

### 3.9 A8 / A11 — union closure and check candidates

`A8` is `A3` one level up and has the same shape: enumerable, never closable.
`A11` is the check case: a regex or bound that all `n` values satisfy is a
candidate, refuted by one counterexample, never confirmed. Two honest riders:

- A check has **no meaning at admission** (`CONTRACT.md:110-117`), so proposing
  one buys nothing today except in derived codecs.
- `check.args` is a JSON object at a metadata position (`walk.go:321-325`) with
  no hole — F1's fourth instance. "Constrain it, bound to be decided" is not a
  partial state.

### 3.10 A10 — where the inferrer is exactly right

A field observed only as `null`; an array observed only as `[]`; a key present
in the schema by convention but never populated. At these positions the corpus
licenses nothing, the version space is unrestricted, and the correct output is
`{"k":"hole"}` with no proposal attached.

This is worth naming because it is the one case where inference's answer is
**exact rather than heuristic**: the inferrer is precisely correct exactly where
it knows nothing. It is also the cleanest demonstration of why the hole is the
right output shape — a system that must return a type would have to return
`opaque` here and would have destroyed the information that it was guessing.

### 3.11 The remaining expressibility findings

> **FINDING F3 — no tuple kind.** `{"k":"list","of":T}` (`walk.go:109-120`)
> cannot pin length or position. Positional arrays — extremely common in
> exported and log-shaped JSON — are representable only as a homogeneous list
> over a union, which admits permutations and wrong lengths. The `S`-boundary
> therefore over-approximates on any array-bearing corpus and does so
> **silently**: nothing in the candidate marks the loss. The MVP must record it
> in the ambiguity report as a `LOSSY` note at the position.

> **FINDING F5 — `struct.optional` absent and `optional: []` are two digests for
> one type.** **[executed]** `checkKeys` permits `optional`
> (`walk.go:225`) and the walk reads it only when present (`walk.go:247`), so
> both spellings are legal and denotationally identical. The probe in §2.5
> shows they canonicalize to different bytes and therefore different digests:
> `60bf23b9…` (absent) vs `c69953d1…` (`[]`). `catalog.create` digests the
> submitted structure with no normalization step between the walk and
> `activeScheme.Derive` (`proto/go/protod/catalog.go:104-109`), so the split is
> live under the interim scheme. This is a **new executed witness of a known
> gap**, not a new gap: the estate already records `normalize` as PARTIAL and
> owes it a grilling — *"union member sort at `walk.go:158-163` is a
> normalization but is not named as one"*
> (`docs/design/2026-08-14-estate-structures-map.md:139`, row E6). What is new is
> the consumer: a bulk inferrer emits thousands of structs, and if it picks a
> different spelling from the human who authored the same type by hand, the
> catalog holds two identities for one type and every downstream sharing,
> diffing, and drift-detection claim in §4.3 quietly degrades. **The MVP must
> pin one spelling** (recommendation: always emit `optional`, even when empty —
> it is the spelling the concierge's own `struct` example uses,
> `concierge.go:150`) **and the finding should be attached to the E6 grilling as
> its concrete cost.**

---

## PART 4 — THE PIPELINE AS EVENTS

Placed in the three-sort ontology (`NEXT.md:167-175`): evidence is anything
recomputable from bytes and federates freely; a decision is anything two parties
could legitimately disagree on and single-homes behind the effector; absence is
a typed refusal.

### 4.1 The records

Names proposed, not ratified. Every digest is 64 lowercase hex. Sorts are
stated, and every sort claim is argued rather than asserted.

```
flb.corpus.v0        Ingested {                          -- EVIDENCE
  files:             [{ path_digest, raw_digest, canonical_digest, bytes }, ...]
  corpus_digest:     hex64        -- over the raw_digest list, sorted
}
```

**Why both `raw_digest` and `canonical_digest`, and why the corpus digest folds
the raw one:** §2.5(a). The canonical digest is what the rest of the estate
speaks, but it has already destroyed the `int`/`float` lexeme and altered
large integers. An inference run pinned to canonical digests is **not
recomputable in the ambiguities that matter**, because a different original file
could produce the same canonical bytes and a different correct answer. The raw
digest is the provenance root for inference specifically. This is the one place
where this design asks the estate to hold a digest it does not hold today, and
the reason is a measured loss, not a preference.

```
flb.inference.v0     Inferred {                          -- EVIDENCE
  corpus_digest:     hex64
  inferrer:          { name, version, params_digest }
  candidate_digest:  hex64        -- the flb.type.partial.v0 (see §4.2)
  report_digest:     hex64        -- the ambiguity report
  catalog_head:      hex64        -- refs proposed are head-relative
}
```

Evidence, and the sort claim has a *precondition* the estate should enforce
rather than hope for: **the inferrer must be a deterministic fold over the
corpus, not a sample.** If it samples, the record is not recomputable and is not
evidence. This is exactly where the practitioner tools stop being reproducible
(§1), and it is cheap for us to not do. The concrete obligation is law L-DET in
§5.5.

`catalog_head` is carried for the reason the language-surface design already
argued for certification records
(`docs/design/2026-08-14-the-language-surface.md:230-243`): any `ref` proposal is
a claim about what resolved *at a head*, and absence is head-relative.

```
flb.ambiguity.v0     Report {                            -- EVIDENCE
  entries: [{
    id, position: [path...], kind: "A1".."A11",
    observations: { n, present, null, distinct, singletons, min, max, ... },
    options: [{ label, fill? , expressible: true|"INEXPRESSIBLE"|"LOSSY" }],
    rank: { information, consequence },       -- §5.4
  }, ...]
}
```

The report is a canonical value, so it has a digest; a set of report entries is
a grow-only set under `setUnion`, whose commutativity and idempotence are
**shipped, claimed, and property-tested** (`packages/core/src/algebra.ts:444-453`;
`packages/core/src/foldLaws.ts:209-235`, per
`docs/design/2026-08-14-learning-by-refutation.md:386-416`). So **ambiguity
reports federate by union with no coordination**, exactly like refusal corpora,
and for the same reason. Two teams inferring over overlapping corpora can merge
what they *found ambiguous*, even though they cannot merge their raw counts —
see §5.3 for the algebraic reason the counts do not federate.

The dialogue then runs on machinery that already exists. Per the sessions
design, each answer is a `type.fill` move journaled into `flb.session.v0`
(`docs/design/2026-08-14-concierge-sessions-and-catalog.md:94-120`), and per the
language surface the *adoption* is the decision, not the inference:

```
flb.interpretation.v0 Interpreted {                      -- DECISION, effector-homed
  slot:              hex64        -- here: (report_digest, entry id)
  value_digest:      hex64        -- the adopted fill
  proposal_digest:   hex64        -- which inference proposed it
  principal:         { subject, auth_basis }
}
```

This is `docs/design/2026-08-14-the-language-surface.md:62-80` applied to a new
pair of feet: the span is `ambiguity question ← answer → fill`, both feet are
evidence, and only the edge is a commitment. **No new sort, no new authority
protocol, no new law** — the same observation that design made about utterances,
made again about questions. That is the strongest argument that type population
belongs inside foldlab rather than beside it.

Certification is `type.create` unchanged: the daemon canonicalizes and derives
the digest itself (W1, `catalog.go:104-125`), and the catalog fact is evidence
again.

### 4.2 The candidate enters through the front door: no new verb

The MVP needs **zero daemon changes**. The concierge's documented entry move is
to fill the root hole with a root hole (`CONTRACT.md:73-78`); the same move with
the inferred candidate as the subtree loads the whole proposal in one request:

```json
{"partial":{"k":"hole"},"path":[],"subtree": <the inferred partial>}
```

`serveFill` replaces the node at `[]`, then walks the *updated whole partial*
with `walkPartial` (`concierge.go:56-68`), so a subtree containing holes is
admitted and every hole comes back in the frontier in deterministic depth-first
order (`CONTRACT.md:79-85`). The reply is the candidate plus its complete
frontier — which is the question list for everything expressible.

**And the sessions design already has a slot for it.** Its `open` move is
`{ grammar, seed: <partial>, author, from? }`
(`docs/design/2026-08-14-concierge-sessions-and-catalog.md:109-115`) — the
session's *seed* is a partial. The inferred candidate is exactly a seed, so
type population is not a new session shape either: it is an authoring session
whose `open` carries a machine-produced seed instead of `{"k":"hole"}`, with the
inference digest recorded alongside as the seed's provenance. Everything that
design proved about sessions — branch at any step (L1), path-disjoint
commutativity (L4), resume as a cache read (L3) — applies unchanged, which means
**an operator can branch a data-seeded session at question seven and answer the
rest differently without re-running inference.**

That is worth stating as a result: **type population from data is a client-side
inferrer plus one existing request, seeding one existing session shape.**
Everything genuinely new is (a) the inferrer, (b) the ambiguity report for what
the grammar cannot hole, and (c) the ranking. If the design ever seems to need a
new verb, that is a signal that F1 is being worked around rather than reported.

### 4.3 What this buys later: drift detection as an `S`-side refutation channel

Re-run the inferrer over a later, larger corpus. The new candidate diffs against
the confirmed type **Merkle-cheap**: equal subtree digests prune whole branches,
so the diff cost is proportional to what changed, not to the type's size.

Two named readings, and the second is the interesting one:

- **Structural drift.** "Your data started shipping a field your type does not
  know." "A field your type declares stopped arriving." Both fall out of the
  field-set diff, and both are actionable without any semantics. **This has a
  named ancestor**: LearnPADS's accumulator, which "catalogs exactly how many
  deviations from the description there were overall … as well as the error rate
  in every individual field" (§1.3). The design difference is not the idea, it is
  the substrate: PADS re-measures, foldlab re-*folds*, so the diff is a Merkle
  diff and the measurement is content-addressed rather than a report someone ran.
- **Refutation.** A new record that is outside `⟦confirmed type⟧` is a
  **counterexample to a certified decision** — the `S`-side dual of the refusal
  corpus. The estate today has no such channel: ingress checks identity only
  (`CONTRACT.md:110-117`), so a frame that violates its claimed type is admitted
  silently. Batch re-inference is a *cheap partial substitute* that needs no
  conformance codec: it detects drift at corpus granularity rather than at frame
  granularity. **It is also the first concrete consumer that makes the deferred
  conformance codec pay for itself**, and that argument belongs on the ticket
  that eventually schedules it.

Note what F5 costs here if it is not fixed: a re-run that spells `optional`
differently from the confirmed type produces a diff at every struct, and the
drift signal drowns.

---

## PART 5 — THE MVP SLICE

The smallest inferrer that is honest. Everything below is scoped so that the
first build can be walled.

### 5.1 In scope

1. **Input**: a directory of `.json` files (one JSON value per file) and/or
   `.jsonl`. Files are read as **raw bytes**, digested, and processed in
   `raw_digest` order — never in filesystem order.
2. **Unification**: fold all top-level values into one candidate. Records that
   are not objects at the root produce a root `union`.
3. **Per-position summary** (the fold state), for every path reached:
   - counts by JSON type (object / array / string / number / bool / null);
   - `present` and `absent` counts relative to the enclosing object's count;
   - distinct scalar values up to a cap `K`, plus `distinct_beyond_cap`;
   - `n₁`, the count of values seen exactly once (for §3.4);
   - numeric: integrality, min, max, count of values whose magnitude exceeds 2⁵³;
   - string: length range, and match counts for a small fixed regex battery
     (hex64, uuid, RFC 3339, e-mail-shaped) — **battery pinned by digest**, since
     it is part of the inferrer's params;
   - array: length distribution, empty count;
   - object: observed key set, per-key counts.
4. **Candidate emission**, governed by §2.6 rather than by taste: **decide
   outright exactly at the tell-tale-equipped positions** — a field observed as
   both `true` and `false` is `{"k":"bool"}`, a field observed only as `null` at
   every occurrence *and never absent* is `{"k":"null"}`, and nothing else is
   ever decided at a leaf. Emit `{"k":"hole"}` everywhere the corpus leaves more
   than one member of the proposal set standing, and `{"k":"hole"}` with no
   proposal attached where nothing was observed at all (A10). The rule is worth
   stating in the negative because it is counter-intuitive: **the MVP decides
   fewer positions than any tool in §1, and it can say exactly why for each one.**
5. **Ambiguity report**: one entry per undecided position, including every
   position F1/F2/F3 makes unrepresentable in the partial.
6. **Ranked question list** (§5.4).
7. **Shared-subtree detection, report-only**: digest each inferred subtree,
   report repeats and catalog hits. Propose no `ref`.

### 5.2 Out of scope for the MVP, deliberately

- Proposing `brand` (§3.7 rule 1), `check`, or `ref` in the candidate.
- Inferring across nested collections of collections beyond depth pinned by the
  canonicalizer's own limit.
- Any sampling. The MVP reads everything; if that is too slow, the fix is a
  pinned sample *list of digests*, not a ratio.
- Anything that writes to the catalog. The MVP's output is a partial and a
  report; `type.create` stays the only admission path (ticket 015 law 1).

### 5.3 The fold algebra, and why counts do not federate

The per-position summary is a **commutative monoid** (counts add, sets union,
min/max are join/meet), which is what makes the fold order-independent and
therefore deterministic regardless of file order. It is **not idempotent**:
folding the same file twice double-counts. In the estate's own vocabulary this
is expressible exactly — `AlgebraLaws` is the two-field record
`{ commutative, idempotent }` (`packages/core/src/algebra.ts:198-201`), and the
generated suite adds a law test for each claim
(`packages/core/src/foldLaws.ts:209-235`, generating a `combine commutativity`
case at `:211` and a `combine idempotence` case at `:227`). The summary algebra
claims `{ commutative: true, idempotent: false }` — the same claim
`addition` already makes at `algebra.ts:396`, so the shape needs no new
vocabulary.

The consequence is sharp and should be stated in the module's own contract:

> **Summaries merge only over disjoint corpora. Ambiguity reports merge over any
> corpora.** The counts are a monoid; the report is a semilattice. Two daemons
> can union what they found *ambiguous* with no coordination; they cannot union
> what they *counted* without knowing the corpora were disjoint — and corpus
> disjointness is decidable from the raw-digest lists, so it is a check, not a
> hope.

### 5.4 Ranking the questions: two axes, and why one axis is a trap

The mission asks for questions ranked by information value, version-space style.
That is right and it is not sufficient.

**Axis 1 — information.** Rank by how many *other* questions an answer
discharges. The dominant term is not entropy over a prior we do not have; it is
**subtree mass**: answering "is `counters` a map?" at a parent position deletes
every question about its children. So the primitive is the dependency DAG over
report entries, and the ranking is a topological one — ask parents before
children, and ask questions whose answer prunes the most descendants first.
A second large term is **class generalization**: "27 fields in this corpus are
all-integral; answer for all 27?" discharges 27 entries with one answer, and in
practice this is the biggest lever in the whole design.

**This is a 1982 idea and the doc says so.** Mitchell's §4.4.2 (p. 218) already
gives the rule — request the classification of the instance closest to matching
**one half** of the version space, since either answer eliminates half — with the
operational corollary that the informative instances are precisely those the
current version space *cannot classify* (§1.9). The modern price is known:
Dasgupta 2004's **Theorem 3** puts greedy even-bisection within `4·ln|Ĥ|` of the
optimal adaptive strategy under a uniform prior (§1.10). So "ask the question
that collapses the most candidates" is defensible, and the citation for it is
Dasgupta 2004 rather than the splitting index.

**But three published guardrails bind it, and each one bites here** (§1.10):

- **Maximal information gain is not maximal usefulness.** Freund et al.'s
  high-low construction gains a full bit per query forever while error stays at a
  constant. Axis 2 below is one response; the other is that we do not claim a
  ranking is a value ordering.
- **Greedy degrades arbitrarily under a skewed prior** — Dasgupta 2004 Claim 5,
  optimal depth `< 3` versus greedy depth `≥ n/2`. Our prior is *extremely*
  skewed: in a real corpus most fields are boring and a handful matter. This is
  the strongest argument against ever collapsing the two axes into one score.
- **Every bound assumes noise-free answers.** One wrong answer deletes the true
  hypothesis. The literature's instruction is *design for retraction*, and
  foldlab shipped it before it had a reason to: `type.unfill` is an exact left
  inverse of `type.fill` at a path (C2, `CONTRACT.md:69-78`), and
  `walk.go:139-143` — partials preserving union positions — exists precisely to
  make it exact. **A misanswered frontier question is mechanically retractable
  and the session journal keeps both moves.**

Settles adds one more warning worth carrying (§1.10): uncertainty sampling, QBC,
and expected-gradient-length are all **outlier-prone**, querying controversial but
unrepresentative points. **The weirdest field in the corpus is not the most
valuable question.** A density or coverage weight — how much of the data flows
through this position — belongs in the formula.

We should not claim more than that. **State the ranking as a visible heuristic**,
e.g. `rank₁(q) = |descendants discharged| × |class members| ×
|local options eliminated| × coverage(q)`, and let the operator re-sort.

**And there must be a silence threshold.** Le et al.'s hypothesizer picks
`q* = argmax ds(q)` and **asks nothing when `ds(q*) < T`** (§1.11). That is the
right shape: a low-value ambiguity is *recorded in the report* and *not asked*.
The alternative — asking every question the catalog can generate — is how a
400-field corpus produces 400 questions and zero answers.

**And it must be stable.** Petricek et al. rejected a better inference algorithm
to avoid the failure mode where "a small change in the sample could cause a large
change in the provided types" (§1.1). The same constraint binds a ranking: a
question list that reshuffles when one file is added is a list nobody can work
through. **Obligation L-STABLE:** adding one record to the corpus changes the
rank order of at most the entries whose observations it touched. This is the
corpus-side analogue of the frontier's L5
(`concierge-sessions-and-catalog.md:200-208`), and its negative control is a
ranking that normalizes by a global count.

**Axis 2 — consequence.** §2.4 proves that a brand question has *zero*
information value: no answer changes `VS(D)`. A ranking on axis 1 alone puts
every brand question last, forever — and the sessions design's finding is that
unbranded types are unfindable in the catalog by construction. A bulk inferrer
ranked on information alone therefore **populates a catalog nobody can search**,
which is a worse outcome than any type error it avoided.

So: two ranks, both reported, never collapsed into one number by us. The
operator decides which axis they are shopping on. This two-axis split is, as far
as this lane can tell, the one design element here with no ancestor in the
literature of §1, and the reason is structural: no other system has a construct
that changes identity without changing denotation, so no other system has
questions with zero information value that still matter.

### 5.5 The laws the MVP must satisfy, each with its negative control

A prover that cannot fail proves nothing (`AGENTS.md:47-49`), so each
law ships with the inferrer that would violate it.

| law | statement | negative control (must fail) |
|---|---|---|
| **L-DET** | Same corpus digest + same inferrer version ⇒ byte-identical candidate and report. | An inferrer that folds in filesystem order, or samples by ratio. Property test: shuffle the file list. |
| **L-EXPRESSIBLE** | The candidate is accepted by `walkPartial` and by a live `type.fill` at `[]`. | An inferrer that emits a `map` kind, or a hole in `optional`. |
| **L-COMPLETION** | There exists **one** closed completion of the candidate that admits **every** record in the corpus. | An inferrer that emits `{"k":"int"}` at a position with a fractional observation. This is ticket 003's PREFIX PROPERTY (`docs/map/tickets/003-the-wrapper-prototype.md:54-56`) with a data-side witness, and the witness is the `S`-completion, so it is exhibited rather than searched. |
| **L-NOSILENCE** | Every position where more than one member of the inferrer's proposal set survives the corpus is a hole **or** a report entry. | An inferrer that defaults to `string`. **Note: this law is unsatisfiable inside the partial for A2b, A6-name, and A11-args (F1) — it is met only by the report half, and the test must assert the report half explicitly, or F1 gets silently absorbed.** |
| **L-NOBRAND** | The candidate contains zero `brand` nodes. | An inferrer that brands `*_id`. |
| **L-TELLTALE** | The candidate decides a position **only** where the surviving denotation is finite (§2.6). | An inferrer that emits `{"k":"string"}` at a position whose observations are all strings. This is the sharpest law here and the only one that would be rejected by every tool in §1. |
| **L-WITNESS** | A rejected proposal records **which record** makes it wrong. | A UI that accepts a bare "no". Angluin 1988 Theorem 2 prices this at the difference between polynomial and exponential (§1.8). |
| **L-SAMPLE** | Every report entry carries `n` and the observation counts that produced it. | An entry with a bare recommendation. |
| **L-SPELLING** | Every emitted `struct` carries `optional`, even when empty (F5). | An inferrer that omits it; assert on canonical bytes, not on the decoded value. |
| **L-STABLE** | Adding one record changes the rank order of at most the entries whose observations it touched (§5.4). | A ranking that normalizes by a global count, so one file reshuffles everything. |

### 5.6 The walk-through, end to end

10,000 order records in a folder.

1. `flb.corpus.v0` — 10,000 raw digests, corpus digest `a91c…`.
2. Inference (`inferrer v0.1`, params `7b2e…`) → candidate `c4d1…`, report
   `e08f…`.
3. Candidate, abridged. Note how little is decided — §2.6's rule, applied:
   ```json
   {"k":"struct","optional":["note"],"fields":{
     "id":      {"k":"hole"},
     "paid":    {"k":"bool"},
     "qty":     {"k":"hole"},
     "status":  {"k":"hole"},
     "tags":    {"k":"list","of":{"k":"hole"}},
     "note":    {"k":"hole"},
     "address": {"k":"hole"}}}
   ```
   `paid` is decided because both `true` and `false` were observed and
   `{true,false}` is a tell-tale for `bool` — that is not a guess and the report
   says so. `id` is a hole even though every one of its 10,000 values is a
   64-character hex string, because `string` has no tell-tale: the union of
   10,000 literals is a proper sub-language and no corpus can rule it out.
   `address` is a hole rather than an inlined struct because F4 leaves `struct`
   width undefined, so its denotation — and therefore its tell-tale status —
   is not determined; the report carries the observed field set as evidence.
   And `optional:["note"]` is **a guess the partial cannot mark as one** (F1) —
   `note` was absent in 288 records, so optional is *forced* here; but had it
   been present in all 10,000, the same slot would carry an unmarked guess. The
   report says so either way.
4. One `type.fill` at `[]` → a frontier with six holes — at
   `["fields","address"]`, `["fields","id"]`, `["fields","note"]`,
   `["fields","qty"]`, `["fields","status"]`, and
   `["fields","tags","of"]`, in the contract's deterministic UTF-16 field order
   (`CONTRACT.md:79-85`) — each carrying the **same** `legal` set: twelve fixed
   kinds, thirteen once the catalog holds anything resolvable
   (`concierge.go:138-167`; the conformance test pins 13 after seeding at
   `proto/go/protod/conformance_test.go:557-586`). `buildFrontier` computes
   `legal` once, outside the loop over holes (`concierge.go:124-136`) — and
   today a *derived* frontier would compute the same constant anyway, per
   `FINDING-FRONTIER-001.md:26` and
   `docs/design/2026-08-14-learning-by-refutation.md:328-336`. **The frontier
   tells the operator which fills are legal; only the ambiguity report tells them
   which are plausible, and that asymmetry is the whole reason the report
   exists.**
5. Questions, ranked. `address` first — it is a parent, and answering it
   discharges the three field questions beneath it (subtree mass). Then `qty`
   int/float **asked once for a class of 27 all-integral fields** (discharges
   27). Then `status` enum, quoting three real records. Then `tags` element,
   `note` nullability, and `id`. Below the silence threshold: nothing here, but
   in a 400-field corpus most entries would be. Report-only, never a fill:
   `note`'s optionality (F1), the `address` ref proposal, and the `id` brand
   proposal — the last with **rank₁ = 0 and rank₂ = high**, which is exactly the
   case §5.4's second axis exists for.
6. Fills adopted → `flb.interpretation.v0` per answer → frontier empties →
   `type.create` → digest derived by the daemon.
7. Six weeks later, re-run over 40,000 records: `discount_code` appears in
   1,204 of them. Merkle diff against the confirmed type prunes everything
   except one struct, and the drift report is one line.

---

## PART 6 — WHAT THIS DOES NOT PROMISE

Stated plainly, because the failure mode of this feature is a confident tone.

1. **No THE-type claim, ever.** Not "the inferred type", not "the schema of your
   data". The justification is §2.2 — `G` is constant — which is stronger than a
   citation: it is a property of *this* grammar, checkable in `walk.go`.
2. **Sample-dependence on every proposal.** Every report entry carries `n`, the
   counts, and the corpus digest, and every "always/never" is rendered with its
   bound (rule of three, §3.3) and with the exchangeability assumption named.
   A folder is not a random sample and the design says so on every screen.
3. **Semantics are never inferred silently.** No `brand` in the candidate
   (L-NOBRAND). `check` proposals are report-only and carry the note that a check
   means nothing at admission today (`CONTRACT.md:110-117`). `ref` proposals are
   report-only in the MVP.
4. **The semantic gap is inherited in full.** Ticket 015's stated limitation —
   the gap between what a certified structure *is* and what it *means* — "is
   irreducible" (`docs/map/tickets/015-the-grammar-foundry.md:47-50`), and
   type population makes it *wider*, not narrower: a type derived from a corpus
   has never been read by anyone against an intent. A certified type can still
   mean the wrong thing, and now nobody has even claimed it means the right one.
5. **No convergence claim.** The estate has already refuted convergence claims
   for LLM proposers (`docs/design/2026-08-14-learning-by-refutation.md:776-785`).
   Nothing here is different: an inferrer plus a dialogue does not converge to a
   correct type, it terminates when the person stops answering. What is
   guaranteed is the same monotone admissibility the certifier always gave:
   **nothing wrong enters the catalog, however wrong the proposal was.**
6. **The candidate partial is not a complete statement of uncertainty** (F1).
   Any client that reads the partial without the report is being misled, and the
   report must therefore be carried, digested, and referenced — never optional.
7. **No accuracy claim, and no claim to beat any tool in §1.** LearnPADS reports
   parse-success on held-out data and reaches 95% on 11 of 16 benchmarks from
   under 15% of the data; this design has *no accuracy metric at all*, because
   its output is not a type. Its laws (§5.5) measure **honesty** —
   determinism, expressibility, existence of a corpus-admitting completion, and
   the absence of silent choices. Honesty and accuracy are different properties
   and conflating them would be the exact overclaim this document exists to
   avoid. If someone wants an accuracy number, the only defensible one is
   Petricek's ceiling restated: **the fraction of later records `d′` for which
   `S(d′) ⊑ σ`** — measurable after the fact, never before.

---

## PART 7 — FINDINGS AND OPEN QUESTIONS

Ranked by (damage if wrong) × (cost of fixing later).

| # | Item | Kind | Owner |
|---|---|---|---|
| **F4** | The three derivation targets disagree on `struct` width; the cross-target law walls derivability, not acceptance | **shipped-code finding** | proposed ticket; independent of this design |
| **F1** | Optionality (and brand names, and check args) cannot be holed; the candidate cannot state its own uncertainty | **grammar finding** | ticket 025 disposition |
| **F5** | `optional` absent vs `[]` — two digests for one type, executed | **shipped-code finding (new witness of E6)** | E6 grilling, `estate-structures-map.md:139` |
| **F2** | No map kind: one horn of the struct-vs-map ambiguity is inexpressible | **grammar finding** | ticket 004 growth path |
| **F3** | No tuple kind: the `S`-boundary over-approximates on arrays, silently | **grammar finding** | ticket 004 growth path |
| **F6** | `learning-by-refutation.md:546-548` lists the recursively enumerable class among Gold's informant-identifiable classes. Read from the original: the informant dividing line falls between *recursive* and *primitive recursive* (Table I, p. 452), and Theorem I.5 (p. 468) states the recursive class is **not** informant-identifiable. The dossier's argument is unaffected — it rests on the text side — but the claim is sized wrong | **citation finding, in a merged estate doc** | learning-by-refutation lane |
| **Q1** | Does the estate accept holding **raw** file digests as an inference provenance root (§2.5a, §4.1)? | operator question | — |
| **Q2** | Is the ambiguity report a first-class cataloged record, or a client artifact? F1 makes this load-bearing, not cosmetic | operator question | — |
| **Q3** | Does 025's pre-registered prediction survive a second consumer from `flb.type.v0` itself (§3.3)? | operator question | ticket 025 |
| **Q4** | Should `Decode` refuse integers that do not round-trip through binary64, rather than silently rounding them (§2.5b)? | operator question | `go/canonical` |
| **Q5** | Two-axis question ranking (§5.4) — is "consequence" the estate's word for it, and does it belong in the frontier or beside it? Note law L5: the frontier is a function of state, never of history (`concierge-sessions-and-catalog.md:200-208`), and a ranking is not history — but a *corpus-derived* ranking is not a function of the partial either, so it belongs beside the frontier | operator question | ticket 003 |
| **Q6** | Should `opaque` be able to remember? Petricek's **labelled top shapes** `any⟨σ₁,…,σₙ⟩` retain the alternatives actually observed while remaining the top of the preference order, implementing an explicit open-world assumption (§1.1). `{"k":"opaque"}` has no children (`walk.go:77-78`), so foldlab's top is strictly less informative than a 2016 type provider's. A labelled `opaque` would let the inferrer say "I saw these three shapes and I am not claiming that is all of them" — which is the honest answer to A5 and A8, and is currently inexpressible | operator question | ticket 004 growth path |

**The sharpest thing in this document**, restated for the operator: the estate
already has a machine that moves the `G`-boundary of a version space — the
certifier, whose typed refusal is a precomputed `G`-refinement handed over as a
field. What it has never had is anything that moves `S`. A folder of JSON is
exactly an `S`-mover and nothing else, and `S`-movers and `G`-movers are not
substitutes: neither one alone identifies a type, and the reason is Gold's,
instantiated here as the two-line proof that `opaque` is the maximum of every
version space this grammar can form. **Type population from data is not a new
capability; it is the missing half of a capability the estate already has half
of** — and the concierge dialogue, which looked like a UX affordance, turns out
to be the only place where the two halves can meet.

**The most actionable thing** is §2.6, and it is a smaller and harder number than
anyone will expect: running Angluin's tell-tale test against the thirteen kinds
shows the text-learnable fragment of `flb.type.v0` is **exactly the finite
types** — `null`, `bool`, `literal`, and finite unions and closed structs over
them. A folder of JSON, of any size, fully determines a field's type only when
that field is a boolean, a null, or a fixed small set of scalars. Every string,
every number, every array, and — unless F4 is resolved in favor of closed
records — **every record shape** is underdetermined by construction. That is not
a budget for how good the inferrer can get; it is a statement about the
hypothesis space, checkable in a table. It says the feature's value was never
going to come from the inference. It comes from what the inference is honest
about.
