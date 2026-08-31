# JUDGE — human meaning as an uninterpreted function over the derived names

Status: **STAGED UI/APP DIRECTION — pre-grade**. Written 2026-08-30 on
operator order ("LLM is a semantic functor translating meaning to
algebraic semantics… lets model that in lean"), beside
[COLUMNS.md](COLUMNS.md) (the naming homomorphism this consumes) and
[GEOMETRY.md](GEOMETRY.md). The Lean face lands the same session in
`library/cas/Cas/Grammar/Judge.lean`. Literature references are
model-knowledge, `pin: PENDING`. No gate stamps.

## The operator's idea, worded for the record (with one arrow corrected)

The app is about SEMANTICS twice over: the algebra models other
semantics (effectful programs), and the app must always make sense at
the level of HUMAN meaning. The new move: functionalize human meaning
as LLM completion calls, and link UI geometry to human meaning through
them.

The corrected direction: the functor runs FROM the algebra TO meaning.
The naming homomorphism takes structures to strings
([COLUMNS.md](COLUMNS.md)); the judge takes strings to verdicts; the
composite tests every algebraic construct's rendered name against a
meaning oracle. Human meaning does not flow into the algebra — it
SELECTS: the accepted names carve a subalgebra out of the candidate
structures, and that subalgebra is what the UI surfaces.

## The trust law (the estate's own move, reused)

The judge is an UNINTERPRETED FUNCTION — exactly as the store
quantifies over the hash `H`. It has empty trust contribution
(TOOLS.md, LLM-harness row); nothing proves it right; every theorem is
conditional on NAMED hypotheses about it. Verdicts select, never
prove: the accepted set is human-legible by MEASUREMENT, not by
theorem.

`Judge : Type := String → Bool` models ONE FROZEN judgment — a pinned
model + prompt + parameters, every call receipted (the luna harness
already is such an instance: schema-constrained verdicts with receipt
digests). A real LLM is a distribution over judges; distributions and
sampling live at a later lattice level, never in v0.

## The judge-hypothesis lattice (parallel to the hash-hypothesis lattice)

- **Level 0 — nothing assumed.** `J` arbitrary. Acceptance is a bare
  filter; no structure survives for free.
- **Level 1 — `Compositional`** (Frege's principle stated OF the
  judge): `J "" = true ∧ J (s ++ t) = J s && J t`. This makes `J` a
  monoid morphism `(String, ++, "") → (Bool, &&, true)` — literally a
  functor between the one-object categories, which is where the
  operator's word "functor" is EARNED (the way "join" was earned at
  `Compatible`). Consequences, landed as theorems:
  - `accepts_op` — acceptance is closed under any operation whose
    names concatenate: the accepted structures form a SUBALGEBRA
    ("that algebraic structure should be preserved amongst the set of
    others", proved).
  - `rejects_infects` — one meaningless segment poisons every
    compound it enters.
  - `blame` — a rejected compound has a rejected part: the UI can
    BISECT a nonsensical label to the failing segment. Semantic
    debugging as binary search.
- **Level 2+ (named, not defined)** — stability under
  semantically-inert renaming; monotonicity under refinement;
  agreement between two independent judges (the AGREEMENT family,
  again). Each is a hypothesis a lane can measure before any theorem
  leans on it.

## Panels — the union of parallel cheap calls (operator refinement)

Practically a judgment is a PANEL: parallel cheap fast calls,
aggregated. The model absorbs this without new theory — a panel
freezes to ONE judge through its aggregator, so the whole lattice
applies to the aggregate. The sharp fact (landed as theorems in
`Judge.lean`): **the aggregator decides whether the functor
survives.**

- **Unanimity (`Panel.all`) preserves Level 1**: a panel of
  compositional judges aggregates to a compositional judge — the
  subalgebra and blame-bisection theorems carry.
- **Union (`Panel.any`) does not**: two individually-compositional
  cheap judges can each accept one part via DIFFERENT members while no
  member accepts the compound — the union accepts the parts and
  rejects the whole. Union buys coverage and robustness to
  single-judge misses at compositionality's price. For a union panel,
  Level 1 is re-MEASURED of the aggregate, never inherited.
- Quorum/majority: same caveat as union (witness mixing), remark only.

Design consequence: run unanimity where bisection and structure
preservation matter (the label fragment); run union where coverage
matters (recall over candidate meanings); either way the defect study
runs against the frozen AGGREGATE.

## The distributional level (operator refinement — "fix human meaning as a distribution")

The later link to statistical models, named now so the lattice has the
rung: fix "human meaning" as a DISTRIBUTION — a universe of weights.
Then:

- A frozen judge is a SAMPLE (or a temperature-0 mode) of that
  universe; a model checkpoint IS the pinned universe, and weights are
  content — a digest-bearing artifact, so the semantic universe itself
  enters evidence the C6 way (pin the checkpoint, receipt the calls).
- Verdicts generalize to RATES (acceptance probability under the
  distribution); thresholding recovers the Bool judge; the
  compositionality question becomes a distributional property with a
  measurable defect rate — same study, richer statistic.
- **Human interaction data closes the loop**: interactions with the
  app land as content (the store's own records — `entry`/`context`/
  `value`), so the EMPIRICAL meaning distribution is derived from the
  word like every other view. Calibrating the pinned universe against
  it is a measurement lane, not a trust grant — the judge stays
  uninterpreted; the data says how well a given universe tracks the
  humans it serves.

## The measurement programme (this is the genuinely new lane)

Level 1 is an EMPIRICAL property of a frozen judge on OUR name
fragment — so measure it: sample name pairs `(s, t)` from the emitted
inventory (`names.json`), ask the pinned judge for `J s`, `J t`,
`J (s ++ "." ++ t)`, and count compositionality defects. The result is
a defect RATE with receipts — G4-shaped sampled evidence that either
licenses the Level-1 theorems for that judge on that fragment, or
localizes exactly where human meaning refuses to compose (which is
DESIGN SIGNAL: those are the names needing semantic aliases). This is
a scout-lane study shape (the luna harness runs it as-is; runs.md
takes the row).

## Grammar-scoped, rate-indexed compositionality (operator, 2026-08-30)

The operator's ask: define compositionality in terms of OUR grammar —
perhaps as a dependent type on a measured rate, or a set of rates.
The design, from what already exists:

1. **Scope the law to the grammar's name fragment.** Global
   `Compositional` (all strings) is the empirically-suspect form.
   The name language is the submonoid generated by the FINITE
   identifier alphabet of `names.json` (11 columns, 14 blocks, 22
   fields, 9 edges) — so grammar-scoped compositionality quantifies
   over concatenations of registered names only. **Because the
   grammar is closed and still, the hypothesis becomes FINITELY
   CHECKABLE**: measure the judge on the generators and their
   pairwise concatenations — an enumerable table of calls, not an
   infinite claim. The registry's stillness turns an unmeasurable
   hypothesis into a finishable measurement. This is what "fits the
   logic of the language."
2. **The dependent type.** `CompositionalAt (F : fragment) (ε : Rate)
   (J)` — dependent on the fragment AND the rate, with
   `defect J F := |{(s,t) ∈ F | J(s++t) ≠ J s && J t}| / |F|` a
   COMPUTABLE function (white-box tier: the defect computation is
   classical arithmetic over receipts, never itself a judgment).
   `Compositional = CompositionalAt fullFragment 0`. The
   anti-smuggling discipline the type enforces: **ε = 0 is the proof
   world (kernel theorems); ε > 0 is the measurement world (G4
   claims consuming the defect view)** — the dependent type exists
   precisely to keep the two from blurring.
3. **A set of rates = rates per column.** Measure per sort:
   `Ty → Rate`. The defect study partitioned by column is itself a
   `Word.View` (defect counts are a monoid hom) — and under decision
   36d every judge call lands as content, so **the compositionality
   rate is a DERIVED VIEW OF THE STORE**, append-maintained like
   every other view. Which means the UI can wear it: each column's
   measured rate renders as its trust ornament — and the
   ornamentation ruling already says where doubt goes ("saturation
   spent only on doubt": low rate = doubt = saturation). The
   hypothesis lattice becomes visible, per column, live.
4. **Two graded directions, kept distinct** (both fit; do the first
   first): rates on the LAW (defect rates — this section; what the
   study already produces) vs rates on VERDICTS (Xiong's `[0,1]`
   judge with min — the T-J1 codomain fix). Different
   generalizations; conflating them is a smuggle.

Lean face: a small `JudgeRate` module (fragment as a finite set,
computable defect, `CompositionalAt`, the ε=0 recovery theorem) —
queued behind the in-flight Rewriter/View landing to avoid a root-
import collision; land on order.

## Literature hooks

- **Frege's context/compositionality principle; Montague semantics** —
  "the meaning of the whole is a function of the meanings of the
  parts" is exactly `Compositional`, imposed on the judge rather than
  assumed of language. PINNED 2026-08-30: the DisCoCat empirical paper
  (Grefenstette & Sadrzadeh, receipt `discocat-concrete-models`) —
  operator-fetched, and its own evaluation is alignment with HUMAN
  JUDGMENTS, the judge-calibration precedent. The original
  Coecke–Sadrzadeh–Clark construction paper is still owed.
- **LLM-as-judge practice** — the operational precedent for frozen,
  receipted judgment calls (`pin: PENDING` for a canonical reference);
  our addition is stating the algebraic hypotheses the judge must
  satisfy before its verdicts license structure.
- **The concordance** — four-reader synthesis linking this file to
  Gregory–Prest (interpretation functors: the completed theory of this
  shape), Xiong's Lattice Representation Hypothesis (the LLM-geometry
  instantiation), and Asperti et al. (the empirical constraints):
  [RESEARCH.md](RESEARCH.md), with a PROPOSED lattice re-ranking
  (ask J8 there) carried by two independent votes.

## The architecture rulings (decision 36, 2026-08-30)

Spoken, recorded, binding on the app's shape:

1. **The human is the judge of record.** The human's judgment is the
   view being optimized for; the user's control is the product value.
   Every model judge is an instrument under this anchor.
2. **No model-on-model feedback loops.** The optimization loop closes
   only through the human. Model judgments never optimize against
   model judgments — the self-reinforcing loop is structurally cut,
   not merely discouraged.
3. **One large model, finite small-judge panels** (never unbounded),
   panels sampling their inputs from the sort lattice over the
   content-addressed store — panel feed is a derived view (columns),
   like everything else.
4. **The visibility rule.** Every LLM completion is visible, with
   where its data came from — surfaced provenance, human-facing,
   always. (The receipts discipline, promoted to a UI law.)
5. **The blinding abstraction.** The large model must not know that
   material it receives derives from smaller models' judgments:
   aggregates reach it as provenance-ERASED data, while the store
   keeps full provenance for the human. The dual discipline —
   **the human sees all provenance; the large model sees none of the
   judgment-attribution** — is the same information-flow shape as the
   bench's preparer/scout blinding. Formal face: the large judge's
   feed factors through an erasure map on provenance labels;
   NONINTERFERENCE (output invariant under judgment-attribution
   relabeling — free by construction once the factoring is stated) is
   the owed theorem.
6. **Small models are pinned specific architectures** — the judge-pin
   schema below is their admission shape.

## The white-box tier — classical NLP as derived views (decision 36g)

Between raw strings and black-box judges sits a commissioned third
tier: the classical, encoding-free NLP operations — tokenization,
co-occurrence, word association, similarity — the Firth/Harris
distributional tradition, which is exactly the substrate the pinned
DisCoCat paper builds its concrete models from. The tier's law:

- These are FULLY SPECIFIED algorithms over the store's own content —
  co-occurrence over the word is a fold; similarity is arithmetic on
  a derived view. They carry ordinary G-grades (testable, provable),
  never pinned-oracle trust: **white-box tier = checkable functions;
  judge tier = uninterpreted + pinned.** The trust boundary between
  the tiers is the whole point of having two.
- They may FEED panels (candidate generation, association evidence)
  without ever being judges themselves.
- Their formalization rides the same machinery as columns: derived
  views with append-localized maintenance.

## Where meaning is assigned — the anti-smuggling law (operator, 2026-08-30; ADOPTED estate-wide as decision 37)

The operator's distrust, adopted as method: category theory can smuggle
abstract representations in behind mathematics, and an algebra that is
not precise about WHERE it assigns "meaning" deserves suspicion. The
law that answers it:

**No gated statement may use the word "meaning" except as a reference
to a pinned judge instance.** The mathematics here is deliberately
meaning-free — `Judge` is uninterpreted, every theorem conditional,
the one categorical sentence (monoid morphism = one-object functor)
pure composition bookkeeping. Meaning enters at exactly one point: the
instantiation of a concrete judge, and THAT is a provenance object.
Its receipt shape is the operator's own sentence, made a schema:

```
judge-pin := {
  algorithms:  model architecture + decoding parameters,
  corpus:      what text, collected from where,
  collectors:  which people/organization assembled it,
  purpose:     their stated goal in assembling it,
  checkpoint:  content digest of the weights artifact,
  prompt:      the frozen prompt text, verbatim,
  params:      temperature/seed/etc.,
  pinnedAt:    date, by whom
}
```

"Meaning is defined as: what THIS pinned artifact answers" — nothing
more is ever claimed, and everything above it is measured through the
interface (the defect studies) or carried as a premise.

**The statistical hard part, stated honestly**: the algebra NEVER
represents the training/encoding space. It represents only the
INTERFACE — `String → Bool` now, rates at the distributional rung.
The encoding space stays behind the function boundary; what the
algebra says about it is (a) behavioral hypotheses, measured through
the interface, and (b) provenance, pinned. This is the same move the
store makes with `H`: **weights are to the judge what the hash
function is to the store** — an external artifact the algebra
quantifies over, prices hypotheses on, and pins; SHA-256's internals
are modeled nowhere, and injectivity is a premise CX-001 keeps
honest. Interpretability of model internals, if it ever arrives,
arrives as MORE named hypotheses — nothing here waits on it.

**The categorical bullshit test** (for reading the literature, and
ourselves): a categorical claim is trustworthy when every object can
be instantiated as data, every arrow as an algorithm, and every
claimed equation CHECKED — by kernel or by measurement. It is suspect
when the objects are informal ("the category of concepts") and only
the arrows are drawn. In this estate "abstract" means PARAMETERIZED —
quantified over, hypotheses named and priced — never vague; anything
that cannot be stated in the surface ledger does not get to borrow
the mathematics' authority.

## The fold law — the present view (operator, 2026-08-30)

The operator's sentence, kept verbatim as the candidate thesis: *"my
view of the world is some combination of history and what I assigned
meaning to in that history… the present is a fold on history and my
current labels of meaning."*

Formalized with pieces that already exist:

- **History** is the word.
- **The labels** are the judge — and the judge is itself a DERIVED
  VIEW of the word, because interactions land as content
  (`entry`/`context`/`value`) and checkpoints are pinned: `J_t =
  g(w_{≤t})`.
- **The present** is a fold over history parameterized by the labels:
  `view_t = fold(w_{≤t}, J_t)`. The store is already a fold
  (`toStore`), the columns are folds, Regime-A layout is a fold; the
  semantic view is the same shape with the judge as the parameter.
- Therefore the strongest form of the sentence is theorem-shaped and
  true by construction: **the personalized present is a pure function
  of history — there is no hidden state anywhere in the loop.**
  `view_t = F(w_{≤t})` with `F = fold ∘ (id, g)`.

**Recomposition rides the cut discipline.** Meaning re-selection —
the human's implicit choice of checkpoints and interaction data,
"what they by definition accepted as meaningful" — is a NEW CUT of
`J`, and GEOMETRY.md's law applies unchanged: semantic motion, like
geometric motion, happens only at named cuts. One discipline governs
both recompositions.

**The guardrail, named honestly.** "They wouldn't even need to be
conscious this was happening" is the same mechanism every
engagement-optimized feed runs — the difference here is structural,
not intentional: because the selection loop lives IN the word, it is
replayable and contestable by construction. Consciousness is
restorable on demand — "why does my view look like this?" is answered
by replaying the fold, and "show me my meaning history" is a derived
view like any other. Unconscious by default, auditable always, never
opaque. That property should be kept as a LAW of the app, not an
accident of the architecture.

## Ruling asks

- **J1**: adopt the judge-hypothesis lattice vocabulary (Level 0/1/2)
  into the lane's working language (it mirrors CAS-003's hash
  lattice)?
- **J2**: commission the compositionality-defect study (small; harness
  exists; needs a pinned judge prompt — one ruling on the prompt
  text)?
- **J3**: the alias feedback loop — names the judge rejects become
  candidates for operator-granted semantic aliases
  ([COLUMNS.md](COLUMNS.md) alias discipline). Adopt as the standing
  triage?
- **J4**: the aggregator ruling — unanimity for the label fragment
  (keeps the theorems), union for coverage tasks; or one aggregator
  everywhere with the aggregate re-measured?
- **J5**: the distributional rung — when the statistical link lands,
  the pinned checkpoint enters `.reference/provenance` like any
  source, and interaction-derived calibration data is a derived view
  of the word. Adopt that framing as the standing law for "learning
  from the humans" so no learning loop ever becomes a trust grant?
- **J6**: adopt the fold law's sentence as the app's thesis statement
  ("the present is a fold on history and your current labels of
  meaning") and "auditable always, never opaque" as its standing law?
- **J7**: adopt the anti-smuggling law estate-wide — "meaning" appears
  in gated work only as a reference to a pinned judge instance
  (receipt shape above), and the categorical bullshit test governs
  what may borrow mathematical authority? **RULED 2026-08-30 —
  decision 37: adopted.**
