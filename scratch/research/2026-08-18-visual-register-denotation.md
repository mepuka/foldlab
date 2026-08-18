# The visual register — a denotation map for the kernel algebra

Status: **EXPLORATORY consultation note**, coordinator-written 2026-08-18
at the operator's direction. It is the research that precedes a visual
language: elements, technical approaches, and the structure of the
question. **It reaches no design conclusions and contains no exemplar** —
those belong to the design lane. It changes no code, no gate, no corpus
row, no ticket. Its only write is this file.

Companions, read before this one: the algebraic-register record
(`docs/design/2026-08-18-km-algebraic-register.md`, especially §6 — the
two-register discipline and finding N-1), the CAS-motion note
(`scratchpad/cas-motion-and-ingress.md` §2 — draw the frontiers, resolve
the dots on demand), the UI frontier note
(`scratchpad/ui-frontier-modeling.md` — UI-L1..UI-L7, whose data-flow
half stands and whose visual half was refuted), and the
kernel algebra (`docs/design/2026-08-18-plait-kernel-algebra.md`
§4.1–4.3, §5.2–5.3 — the eight generators, the composition rules, the
closure list).

Two standing fences ride every sentence. **Safety only** — nothing here
claims liveness, convergence, termination, or a frame rate; the
strongest aliveness sentence any surface may print remains *productive
through anchor p*. **Cadences unmeasured** — every rate word inherited
from the CAS-motion table is an ordering claim until AE-7 runs.

Confidence tiers, as the estate uses them: **ratified** · **proven** (a
Lean theorem behind a green gate, cited by its real name) · **shipped**
(code on this branch, read in place) · **lead** (an external claim, at
the level of verification stated on it). Nothing here is **measured**,
and nothing here is **proposed** in the sense of asking for a ruling on a
design: §3 is an option space, and §1 is **lead** at the verification
level each subsection states.

---

## 0. What this note delivers

**0.1 This is equipment for the design lane, not a design.** The work
ahead is a **visual language**. The algebra supplies the language — the
sorts, the generators, the composition rules, the closure list — and it
does not supply a this-or-that. So this note carries three things and
withholds a fourth: the **elements** (verified source material from the
traditions that have solved adjacent problems), the **technical
approaches** available (constraint compilation, deterministic layout,
content-derived marks, selector matching, register generation), and the
**structure of the question** (for each construct, what must be decided
and what the priced candidates are). It proposes no marks, chooses no
visual vocabulary, and reaches no aesthetic verdicts.

**0.2 The register discipline is the frame, and it is already ruled.**
The estate runs two concretizations of one abstract statement type,
generated from one rule datum, with drift impossible by construction and
a missing per-operator reading a shape-check failure rather than a
default (finding N-1). A visual register would be the third
concretization under that same discipline: a visual-denotation map as
data, renderings generated from it. Everything in §3 is therefore a
question about *what that data would have to say*, not an answer.

**0.3 Four traditions supply machinery that is directly usable, and each
refuses something.** String diagrams for monoidal categories are the one
tradition where diagram composition **is** morphism composition, with
coherence theorems rather than conventions behind it (§1.1). Feedback
monoidal categories characterize a fold as a state space plus a step
function, freely, with a guarded loop (§1.2). Penrose supplies a working
three-language split and a compiled constraint/objective semantics
(§1.3). Bertin supplies the only hard perceptual constraint in the whole
survey — which channels can carry an order and which cannot (§1.5). Their
refusals are as load-bearing as their contributions and are stated on
each.

**0.4 One perceptual constraint is not negotiable and bounds every
candidate.** Bertin's classification is asymmetric: position, size and
lightness are **ordered** channels; hue, contour, orientation and texture
are not. The estate has exactly two orders. Any map that spends an
ordered channel on something that is not one of those two asserts an
order the algebra lacks, in a channel a reader cannot help reading as
ordered. That is a budget, and how to spend it is §3.3's decision — but
the budget itself is fixed.

**0.5 One algebraic result decides the shape of concurrency and the shape
of the fence, and it is a theorem rather than an emphasis.**
Unordered-by-default is the definitional content of ⊗ being a bifunctor
(§1.1): two boxes not joined by a wire have no order between them, and
this holds even without symmetry. The converse is the sharp part — the
only way to impose an order between otherwise-independent boxes is to
thread a wire that **both** touch, which is Román's runtime string. Any
visual language for this algebra inherits both halves: free concurrency
comes for free, and whatever mark plays the runtime-string role
serializes everything that touches it, whatever it was drawn to mean.

**0.6 One dataflow question is settled by the sources, and it settles it
against the obvious choice.** Petri nets and Kahn process networks draw
the same picture, but a Petri net's arc state is what is **left** and a
Kahn channel's is what has **happened** (§1.9). Petri firing subtracts.
The estate's plane accretes. So marks borrowed from the token-consumption
family — a token moving between places, a counter going down, an item
leaving a queue — would be false about the plane regardless of which
visual language is chosen. That is a constraint on the option space, not
a choice within it.

**0.7 The property the map must have, stated as a requirement rather than
a solution.** The brief's own criterion is that rendering a composite be
the composition of the renderings. Formally that makes the map a
homomorphism into some visual algebra, and it is what would make the
thing testable: if `draw` is a homomorphism, a law violation is a raster
diff rather than a review comment, and idempotence has an operational
meaning (re-drawing an already-present contribution changes no bytes).
**Which** visual algebra — set union, region intersection, series
composition, something else — is exactly the design question, and §3
lays out the candidates per construct.

**0.8 The operator's three-layer split is the organizing structure, and
it arrives where Penrose already is.** Substance is the term, one digest,
language-generic. Denotation is the invariant map — what a mark must
mean, what composition must preserve, what no style may vary. Style is
everything else, as a declared and digested value: `draw : Statement ×
Style → Surface`. §2 develops it, including the operator's ruling that
aesthetics is monotone — styles accrete, refinement is a successor
declaration, many styles inhabit one denotation at once, and an artifact
re-drawn at its pinned style digest is byte-identical, so **aesthetic
history is replayable**. §2.5 also names the one technical choice that
could break that property, and §4.4 prices it.

**0.9 The boundary between denotation and style is the design question,
and this note does not draw it.** It supplies the axis instead: Penrose's
`ensure`/`encourage` split is a candidate formal reading (hard
constraints versus soft objectives), and §3.2's last column asks, per
construct, which parameters a style could vary. Every one of those cells
is a question with more than one defensible answer.

**0.10 What the refuted mock got wrong, as diagnosis only.**
`scratchpad/frontier-dashboard-mock.html` opens with twelve hand-assigned
semantic colour tokens. Each is a human decision standing for a datum,
each can drift from that datum silently, and no test in the estate could
catch the drift. The refutation is about *provenance of the mapping*, not
about which colours were chosen — and it is why §3 asks, for every
construct, where its mark's mapping would come from. The mock's data flow
was right and survives in the companion note.

**0.11 What this note deliberately does not contain.** No exemplar
drawing: an exemplar is a design act and belongs to the design lane. No
recommended mark for any construct. No palette, no typographic
direction, no layout. Where the original commission asked for a
recommendation, §3 presents an option space instead, and §7 records what
has to be decided before any of it can close.

---


## 1. What the traditions contribute, and what each refuses

Each subsection states what the tradition hands the map, what it refuses
or cannot do, and the citation. Where a claim was verified against the
primary source this session it is marked **read**; otherwise it is a
**lead**.

### 1.1 String diagrams — where diagram composition *is* composition

**Read.** Peter Selinger, *A survey of graphical languages for monoidal
categories*, arXiv:0908.3347 (2009); published in B. Coecke (ed.), *New
Structures for Physics*, Springer LNP 813 (2011), pp. 289–355. The
coherence results are Joyal and Street's: *The geometry of tensor
calculus I*, Advances in Mathematics 88(1):55–112, 1991.

**The core claim.** Soundness and completeness together are a coherence
theorem, and every one has the same shape: *a well-formed equation
between morphism terms follows from the axioms if and only if it holds in
the graphical language up to the stated notion of deformation.* For
monoidal categories that notion is planar isotopy (Selinger Thm 3.1,
citing Joyal–Street); for **symmetric** monoidal categories it is bare
isomorphism of diagrams (Thm 3.12), which is what makes wire crossings
free to undo. This is the tradition where the picture is not an
illustration of the algebra — it *is* the algebra, up to deformation.

**The dictionary** (Selinger Tables 1–2): a wire is an object, a box is a
morphism, a continuing wire is the identity, joining an outgoing wire to
an incoming one is composition, wires in parallel are the tensor, and —
the detail that keeps recurring in this note — **the unit object is zero
wires**, so a state `f : I → A` is simply a box with no input.

**The concurrency result, and a precision that strengthens it.** Selinger
introduces the coherence theorem by displaying exactly the picture this
estate needs (§3.1): `(id ⊗ g) ∘ (f ⊗ id) = (f ⊗ id) ∘ (id ⊗ g)`, drawn
as two diagrams in which `f` and `g` sit at *different relative heights*,
and the theorem upgrades "obviously the same" to *if and only if*. **The
relative position of two boxes not connected by a wire is not data.**

The precision: this does **not** require symmetry. Piedeleu and Zanasi
(*An Introduction to String Diagrams for Computer Scientists*,
arXiv:2305.08768, §4.1.1) strip crossings entirely and note the
interchange law still holds in the free *planar* monoidal category. So
independence-of-unconnected-boxes is bought by **bifunctoriality of ⊗
alone**, at the very bottom of the hierarchy; symmetry buys something
different — the freedom to re-route which output feeds which input. For
this estate that separation is worth having: free concurrency is the
cheaper property, and the estate needs it everywhere, while channel
permutation is a separate and rarer claim.

The concurrency reading is not this note's invention. Earnshaw and
Sobociński, *String Diagrammatic Trace Theory* (arXiv:2306.16341, MFCS
2023) name interchange as reflecting the independence of processes
running in parallel, and prove the strong form: **Mazurkiewicz trace
languages are exactly symmetric monoidal languages over monoidal
distributed alphabets.** The canonical concurrency formalism for
"independent actions commute" *is* the string-diagram formalism.

**And the converse, which is the sharpest single thing the tradition
hands the question.** To *serialize*, you must leave monoidal categories for
**premonoidal** ones, where interchange fails. The diagrammatic
implementation (Román, *Promonads and String Diagrams for Effectful
Categories*, arXiv:2205.07664, via Earnshaw–Sobociński §7) is a single
extra **"runtime" wire threaded through every generator**: because that
wire appears exactly once in each diagram, no two boxes can slide past
each other, and the endomorphism monoid becomes the free monoid on the
boxes. Stated as a rule for a notation designer: **unordered-by-default
is the definitional content of ⊗ being a bifunctor; if you want an order
between two otherwise-independent boxes, you must add a wire that both of
them touch.** §4.9 draws out what that means for this algebra.

**What the tradition refuses.**

1. **No order between unconnected boxes** — structural, per above.
2. **No copy and no discard for free.** Selinger §6.1: a cartesian
   category is a symmetric monoidal one with copy `Δ` and erase `◇`, and
   **coherence for finite-product categories does not hold up to
   isomorphism or isotopy of diagrams** (Thm 6.1) — you must postulate
   equations *on diagrams*, and the "push the boxes around" property is
   gone. This is an inherited bound, and §7 states where it bites.
3. **No branching, choice, or sums** by topology; coproducts and
   biproducts are likewise diagrammatic-equation territory.
4. **No higher-order** — the wire is not a function space.
5. **No quantitative or temporal content: a wire has no length and a box
   no duration.** Which is not a limitation here but a licence — it is
   why spending length on positions (§3.4) is an *addition* the estate
   must justify rather than a convention it inherits.
6. **Several coherence results are conjectural or restricted**, and
   Selinger tabulates the status of each (his Table 10). Caveat 3.2 in
   particular: Joyal–Street's proof covers only isotopies through
   diagrams that stay progressive.

**Convention warning, carried verbatim.** There is no standard for which
axis is composition and which is tensor — Selinger runs composition left
to right and tensor bottom to top; Baez–Stay run composition top to
bottom and tensor left to right; Coecke–Kissinger run time upward. A
notation must state its convention in its first figure, and a candidate
that leaves it implicit has already lost a reading.

### 1.2 Feedback, folds, and wiring operads

**Read**, through the sources named.

**Trace is the loop, and trace equals fixed point.** Joyal, Street and
Verity introduced traced monoidal categories (*Math. Proc. Camb. Phil.
Soc.* 119:447–468, 1996); Selinger §5.1 gives the four axioms —
tightening, sliding, vanishing, superposing — and draws the trace of
`f : A⊗X → B⊗X` by looping the `X` output back into the `X` input.
Selinger's Prop. 6.8 (after Căzănescu and Ştefănescu) is the bridge to
this estate's vocabulary: in a category with finite products, **giving a
trace is equivalent to giving a fixed-point operator**; dually, with
coproducts, to an iteration operator. Hasegawa and, independently,
Hyland proved the cartesian case: a trace is a parameterized Conway fixed
point.

**But the estate wants feedback, not trace — and the distinction is
exactly the anchor.** Di Lavore, de Felice and Román, *Monoidal Streams
for Dataflow Programming* (arXiv:2202.02061, LICS '22), define a
**feedback monoidal category** whose feedback operation is *guarded* by
an endofunctor `F`, and their Remark 3.2 is the separation: **a traced
category is exactly a feedback category guarded by the identity in which
`wait = id`.** Trace = feedback + yanking, and yanking is the claim that
a feedback loop is *instantaneous*. The estate cannot make that claim: a
fold's loop passes through an anchor, and the whole point of UI-L3 is
that the anchor lags the head. **So if a fold's loop is drawn, it is `F`-guarded feedback rather than a
trace, and the anchor is what plays the guard.** That is not a stylistic
observation; it is why a lag is a drawable quantity at all.

Their Theorem 3.5 makes the fit tighter: the free feedback monoidal
category is the **state construction** `St_F(C)`, whose morphisms are
pairs of a state space and a step function `FS ⊗ X → S ⊗ Y`, quotiented
by sliding equivalence — change of state representation. **A fold is a
state space plus a step function, quotiented by change of representation.
That is the definition, and it is the free thing with a feedback wire**
(freeness due to Katis, Sabadini and Walters, *RAIRO ITA* 36(2):181–194,
2002).

**Folds are drawable, at one dimension up.** Dan Marsden, *Category
Theory Using String Diagrams* (arXiv:1401.7220), works 2-categorically —
regions are categories, wires are functors, nodes are natural
transformations — and Example 6.3 draws the universal property of an
initial algebra as a two-sided diagram equivalence (`h ∘ in = a ∘ Th` iff
`h = fold a`), then proves **Lambek's lemma graphically**; Example 6.4 is
the dual, with the fusion law for terminal coalgebras. Book-length in
Hinze and Marsden, *Introducing String Diagrams* (CUP, 2023).

**What has no diagrammatic rendering, and why the estate does not need
one.** There is no standard string-diagram rendering of a
**hylomorphism**, and there is a structural reason: `x = a ∘ Fx ∘ c` has
a unique solution only under a side condition — a recursive coalgebra, or
CPO-enrichment, or a well-founded variant — and **that side condition is
not drawable**. Selinger hits the same wall from the other side: he
states flatly that **uniformity of a trace is not an equational
property** (§6.5), and that deciding "these two loops compute the same
infinite behaviour" is strictly beyond what any finite diagram calculus
settles by topology. The estate's grammar already refuses the case: R8
gives repetition as the successor round and **general recursion has no
syntax at all**, because a self-referencing declaration would need its own
digest as a subterm. The undrawable construct is the one the algebra
already declined to have. That is a good sign about the algebra, not
about the notation.

**Wiring diagrams: nesting is operadic composition.** Spivak, *The operad
of wiring diagrams* (arXiv:1305.0297) — with a correction worth carrying,
since it is easy to mis-cite: **that paper's operad is undirected**,
objects are bare finite sets and morphisms are cospans. The
input/output box and the supplier assignment arrive in the later papers
(Rupel and Spivak, arXiv:1307.6894; Vagner, Spivak and Lerman,
arXiv:1408.1598). The slogan is *a wiring diagram of wiring diagrams is a
wiring diagram*, and mechanically it is a **pushout**: place each inner
diagram in its hole, then erase the intermediary circle while preserving
the connections it made. Associativity of that flattening is the pasting
lemma for pushout squares, and **equivariance is the formal statement
that sibling boxes are unordered** — the composition is indexed by a map
of finite *sets*, so there is no reading order among the little circles
and none around a rim.

**The refusal that costs this estate something real.** Spivak §3, Prop.
3.1.2: for `|A| ≥ 2` the only algebra morphism `Rel_A → ℕ` into a
commutative monoid is trivial, and Prop. 3.1.4 is the analogue for `Eq`.
**You cannot hang an additive cost number on a wiring-diagram semantics
and have it respect wiring.** The estate has a cost ladder (T0–T4) and a
strong instinct to print a composite's price. The tradition says a
composite's tier is *not* the sum of its parts' tiers in any way the
diagram respects. Whether the tier can therefore ride only the
one priced act, or whether some non-additive presentation is possible, is
**V-Q9**.

Spivak's own bridge to §1.1 is worth the citation: adding the outer box
to a string diagram turns it into a wiring diagram, which reads as a
one-dimensional oriented cobordism, and then **each of the traced-category
axioms is vacuous from the cobordism perspective** because both sides are
the same cobordism up to diffeomorphism (Spivak, Schultz and Rupel,
*JPAA* 221(8):2064–2110, 2017). A traced category and an algebra on the
wiring-diagram operad carry exactly the same data; the operadic
presentation buys the axioms by turning them into invariance of the
picture. That is the property a visual register would be trying to buy for
the estate's laws, and it is the strongest argument for taking the
diagrammatic traditions seriously rather than borrowing their look.

### 1.3 Penrose — the closest kin, and the fork it hands us

**Read.** Ye, Ni, Krieger, Ma'ayan, Wise, Aldrich, Sunshine and Crane,
*Penrose: From Mathematical Notation to Beautiful Diagrams*, ACM TOG
39(4) art. 144 (SIGGRAPH 2020), DOI `10.1145/3386569.3392375`.

**What it contributes.** The three-language split, which is the estate's
own three-layer split arriving from the other direction. *Domain* declares
types, functions, predicates and constructors, and is "purely abstract:
it does not define an internal representation… allows multiple visual
representations to later be applied to objects from the same domain."
*Substance* carries assertions only — all graphical data is excluded by
design, with coordinates, sizes and colours "specified in Style or
determined via optimization." *Style* is selectors plus declarations,
where selectors match **objects and relationships** rather than source
strings. The paper's own name for what the mapping produces is the phrase
this note wants: a mapping in this framework "defines an **executable
visual semantics**… a specific, visual, and computable interpretation to
what were previously just abstract logical relationships." And its third
goal is many styles over one substance — one Substance program rendered
under Euclidean, spherical and hyperbolic Styles, with independently
written packages composing "by doing little more than concatenating
source files."

**The estate's upgrade over it, and it is the whole reason to write this
note.** Penrose leaves the invariant layer *implicit inside Style*: there
is no separate statement of what a mark must mean regardless of style.
Splitting it out, making it corpus data, and content addressing all three
layers with lineage is what the estate's register discipline would add —
Penrose's Style is one artifact a person edits, whereas a denotation map
under that discipline is generated from and cannot drift. §2 develops the
split; §3.4 asks what shape the data would take.

**What it refuses or cannot do**, each an inherited bound for any
Penrose-shaped renderer: the sets of objectives, constraints and
primitives are fixed, and new constraints are authored in TypeScript
rather than in Style; **everything written in Style must be
differentiable**, which is a real tax; there is no validity guarantee,
only graceful degradation (of 2000 random programs, 1058 had conflicting
constraints and all failed gracefully); the output is **a family of
solutions rather than one diagram**, with local minima only; it is not
interactive, since optimization is the bottleneck and some figures took
minutes; and selectors are conjunctive-only.

**The fork this forces** is §4.4, and it is the sharpest external
constraint in the note: a randomized-initialization solver cannot give
byte-identical re-renders, which is exactly what §2.5's replayable
aesthetic history requires.

**The honest third-party critique.** The Bluefish paper (UIST '24, DOI
`10.1145/3654777.3676465`, §7.1) argues the other side: colocating data
and display buys encapsulated reusable relations and atomic edits, while
separating them buys whole-diagram restyling. Its concession is the
sentence that decides the case for the estate — for "mathematical domains…
with a fixed set of primitive elements and relations, this separation is
especially useful." An eight-generator alphabet with a closed composition
list is precisely that domain. Bluefish also notes that Penrose's Style
lacks first-class reusable relation abstraction and that its solver scales
superlinearly, both of which count against fork A.

**Edgeworth** (L@S '24, DOI `10.1145/3657604.3662034`) contributes the
mutation discipline: mutate **Substance**, never Style, with typed
add/delete/edit operators and seeded randomness, so variants are styled
uniformly and therefore comparable. That is the estate's negative-control
battery arriving in the visual register (§4.5). Its own limits are worth
carrying: mutants can typecheck and mean nothing, and isomorphic variants
recur — which experts valued, because they break canonical-drawing
fixation.

### 1.5 Bertin — which channels are allowed to carry an order

**Read**, through secondary summaries of Bertin, *Sémiologie graphique*
(1967; English *Semiology of Graphics*, University of Wisconsin Press,
1983), including the Axis Maps visual-variables guide
(`axismaps.com/guide/visual-variables`) and InfoVis:Wiki. The primary text
was not read this session; the classification below is consistent across
both secondary sources.

**What it contributes**, and it is the note's hardest single derivation.
Bertin classifies the visual variables against four levels of
organization — associative, selective, ordered, quantitative — and the
classification is not symmetric:

| Variable | Ordered? | Quantitative? | Selective? | Associative? | Fit |
| --- | --- | --- | --- | --- | --- |
| position (the plane's two dimensions) | yes | yes | yes | yes | numerical; the richest variable |
| size | yes | yes | yes | no | numerical |
| value / lightness | yes | no | yes | no | ordinal |
| colour hue | **no** | no | yes | yes | **nominal** |
| orientation | no | no | partly | yes | nominal |
| texture / pattern | no | no | — | yes | nominal |
| shape | no | no | **no** | yes | nominal only |

The guide's own warning is the estate's constraint in other words: "avoid
ordered variables for things that have no natural order… don't use
differences in lightness to represent ancestry groups." And "colour hue is
an example of a non-ordered variable: there is no clear ordering of, say,
red, green, and blue."

**Why this is load-bearing here.** The estate has exactly two orders. The
perceptual system offers three ordered channels — position, size/length,
lightness. Spending any of them on something that is not one of the two
orders asserts an order the algebra does not have, in a channel a reader
cannot help reading as ordered. So the assignment of §3.4 is forced:
positions and lag take length, the derived order takes containment, the
declared order takes rank, lightness is spent on nothing, and identity
and kind go to hue, contour and texture because those are the channels
that discriminate without ranking.

**What it refuses.** Shape is the only variable Bertin thought is *never*
selective — you cannot scan a field of glyphs and pick out all of one
shape quickly. That is a real cost of putting kind on contour, and the
map pays it rather than hiding it: selecting by kind is an interaction
over a declared fold (a different fold digest), not a perceptual scan.

### 1.6 Iverson — notation as a tool of thought

**Read.** Iverson, *Notation as a Tool of Thought*, 1979 Turing Award
lecture; canonical text at `jsoftware.com/papers/tot1.htm` (the `tot.htm`
frameset is empty). Cited by section, since sections are stable across
printings.

**What it contributes.** Four things, in descending order of use here.

1. **A ready-made rubric.** §1's five characteristics — ease of
   expressing constructs, suggestivity, subordination of detail, economy,
   and amenability to formal proofs — are a scoring sheet for any
   candidate denotation map. §4.7 scores this one against them, weak rows
   named. Note the misquote trap: the list is §1, not the introduction.
2. **Two lawful readings of one form** (§5.1): an unparenthesized
   expression reads "analytically from left to right… and constructively
   from right to left." One form, two readings, both correct. §4.6 turns
   that into a round-trip wall for the diagram.
3. **Operators as function-to-function, and phrases as the unit** (§1.3):
   `+/` is a *phrase*, and the derived function is what the reader
   actually manipulates. That is the grammar for how marks compose into
   larger marks. Iverson's word is "phrase"; "idiom" is later FinnAPL
   community vocabulary and is not his.
4. **Mnemonic symbol design as a principled route**, from the *Dictionary
   of APL* (1987): `⌊` argued from its resemblance to an L for lower, `⊥`
   from being shaped like a base. Symbols argued from resemblance, not
   art-directed. §3.3 resolves this against the estate's
   function-of-the-datum rule by cardinality.

And one measure worth adopting outright: **introducibility in context**
(§0, §5.2) — a notation suited as a tool of thought "should permit easy
introduction in the context of that topic." §4.7 makes it a test.

**What it refuses.** Iverson's own §5.1 critiques of conventional
notation are mostly about function definition and precedence and do not
transfer. What does transfer is his 1986 postscript, which deprecates the
paper's own notation and names the chief use of an executable analytic
notation as **teaching** — a caution against overclaiming what a notation
buys a working practitioner as opposed to a learner.

### 1.7 Tufte — and a measure the coordinator proposes from him

**Read**, from the printed second edition of *The Visual Display of
Quantitative Information* (Graphics Press, 2001) and *Envisioning
Information* (1990).

**Data-ink, exactly.** VDQI p. 93 defines data-ink as "the non-erasable
core of a graphic, the non-redundant ink arranged in response to
variation in the numbers represented," and the ratio as data-ink over
total ink, equal to 1.0 minus the proportion erasable "without loss of
data-information." The five principles at p. 105 are: above all else show
the data; maximize the data-ink ratio; erase non-data-ink; erase
redundant data-ink; revise and edit. Chartjunk (p. 107) is ostensive and
comes in three kinds — unintentional optical art, the grid, and the
self-promoting duck.

**A candidate analogue, recorded as a coordinator suggestion rather than
an adopted measure.** The coordinator's read of this chapter proposes
what it calls **denotation-ink**: the proportion of a rendered surface's
marks that denote a datum or a law, with the complement erasable without
loss of denotation. The argument for it is that the criterion would be a
lookup rather than a judgment — every mark either matches a row of the
map or it does not — which would make it mechanical where Tufte's is
interpretive. The argument against adopting it here is that it presumes
the map exists and presumes what counts as a countable "mark", both of
which are open (§3). It is noted for the design lane and is **not** this
note's measure.

**Small multiples, and why they are the estate's native comparison.** The
argument at VDQI p. 42 is the one worth quoting: "once viewers understand
the design of one slice, they have immediate access to the data in all
the other slices… the constancy of the design allows the viewer to focus
on changes in the data rather than on changes in graphical design." *EI*
p. 33 adds that multiplied smallness "enforces local comparisons within
our eyespan, relying on an active eye… rather than on bygone memories of
images scattered over pages," and *EI* ch. 4 opens with the question the
whole estate's frontier view is asking: "At the heart of quantitative
reasoning is a single question: Compared to what?"

**Constancy of design corresponds to one pinned style digest.** That is
the correspondence: a small-multiple family is one substance family drawn at
**one style**, which is both §2.5's discipline and §4.5's battery
condition. The eye reads data deltas because the design frame is
byte-identical across slices — which the estate could *guarantee* rather
than achieve by care, if the determinism fork of §4.4 goes that way.
Lanes across consumers, refusal rates across reasons, and rebinds across
names are all small-multiple shaped, which is an argument for the form
and not yet a choice of it.

**Sparklines are the frontier at typographic resolution.** A sparkline is
"a small intense, simple, word-sized graphic with typographic
resolution"; data graphics "should have the resolution of typography"; a
sparkline "can be everywhere a word or number can be: embedded in a
sentence, table, headline, map, spreadsheet, graphic" (*Beautiful
Evidence*, ch. 2). The design rule is max[data], min[design] — "design
minimization, not data minimization." A word-sized lane history embedded
in a table row is precisely *draw the frontiers, resolve the dots on
demand* at the smallest scale the register has, which makes the sparkline a serious
candidate form for a lane rendering rather than a decoration.

**1+1=3, and the hazard it names for any compositional register.** *EI*
attributes to Albers (p. 53) and states as doctrine (p. 61) that two
elements produce a third visual activity, and that "most of the time,
that surplus visual activity is non-information, noise, and clutter,"
with noise proportional to value contrast (p. 62). **This is a denotation
hazard specific to a map like this one, and it deserves naming rather
than a footnote:** the map guarantees that every *declared* mark denotes,
and guarantees nothing about what appears when two declared marks are
placed near each other. A bright channel between two heavy strokes, a
moiré in a dense graduation, an implied alignment between two lanes that
§4.2 explicitly refuses — none of these would appear in any map row, and
all of them are legible. §4.8 states the problem; nobody here solves it.

**Tufte's own scope hedge, carried into the honest bounds rather than
dropped.** VDQI
p. 96 qualifies the principles — "maximize the data-ink ratio, *within
reason*" — and states plainly that the principle works "for perhaps
two-thirds of all statistical graphics. For the others, the ratio is
ill-defined or is just not appropriate." Any analogue inherits that caution, and in
particular says nothing about a teaching surface whose whole job is
redundancy.

### 1.8 Bret Victor — the step-down rule, and information software

**Read**, at `worrydream.com`.

**What it contributes.** Two claims that survive translation into this
estate, and one that does not.

*The step-down rule*, from *Up and Down the Ladder of Abstraction*
(2011): "every point on a visual abstraction typically corresponds to a
particular concrete state," and the insights are born "in the transitions
between" levels. That is **resolve-on-demand** stated as a perceptual
requirement rather than a cost argument: pointing at any frontier mark
must step down to the dot or anchored state it denotes. The CAS-motion
note already ruled *draw the frontiers, resolve the dots on demand* for
cost reasons; Victor supplies the independent reason to want the same
thing.

*Abstraction is a wildcard, and stepping down is partial application* —
Ladder's Appendix formalizes it as lambda abstraction. In the estate that
is R9's provision algebra exactly: a view abstracted over a parameter is
a program with a hole, and a drill-down is a `fill`. So the register's
drill-down interaction is not a UI mode; it is a filled program, which is
a declaration, which is citable. §3.5 records it that way.

*Magic Ink* (2006) classifies software as information, manipulation, or
communication, argues most software is information software misclassified
as manipulation, and puts interaction **last** among ways to infer
context: "information software design is the design of context-sensitive
information graphics," and navigation is excise. The estate's read
surface is almost wholly information software — anchored reads rendered
as graphics — and the only manipulation surfaces are the eight
generators. That is the independent argument for why §3.5's affordance
list is so short.

**What it refuses, and where the estate must part company.** *Media for
Thinking the Unthinkable* (2013) rests on a structure/behaviour split —
words describe structure, pictures depict behaviour — and on systems
"built out of live data, not dead symbols" whose behaviour over time is
the thing to understand. **The estate's truth plane has no time
coordinate and does not move.** So the register borrows the step-down
rule and the information-software classification, and refuses the
behaviour-over-time framing: the pictures here depict structure, and the
only motion is accretion at frontiers, driven by positions rather than by
a clock — see §3.3's discussion of what positions can and cannot buy.

*Explorable Explanations* (2011, with its 2024 postscript) supplies one
more refusal the note should keep: knobs are not an explanation. Victor's
own words are that a spreadsheet "is merely a dataset and model; it
cannot be read. An explanation requires an author," and his 2024
retraction narrows the claim to "a written argument whose assertions are
backed by explorable computational models… The reader rebuts by
modifying the models." Read across to this estate: a surface is a
declared statement — somebody's sentence, with attribution — not a panel
of controls over a data source. And the 2024 formulation, *facts,
assumptions and calculations all visible and editable*, is
served-equals-derived extended from code to arguments, which is what the
grill sheet would become if it were ever drawn in this register.

**Citation caution carried from the source pass:** *Inventing on
Principle* has no author-controlled transcript and should be cited as
talk plus timecode only; the Ladder's step-down requirement should not be
conflated with *Learnable Programming*'s create-by-abstracting, which is
about a learner generalizing code rather than a designer exploring a
system.

### 1.9 Petri nets against Kahn networks — the monotone question, settled

**Read**, through the sources named. This is the pair that decides which
dataflow tradition the estate belongs to, and the answer is not the one a
reader would guess from the pictures, because both traditions draw the
same picture: nodes with in-arcs and out-arcs.

**Petri net state is subtractive.** A Petri net is a pair of functions
from transitions to the free commutative monoid on places (Baez and
Master, *Open Petri Nets*, arXiv:1808.05415, Def. 3; the founding result
is Meseguer and Montanari, "Petri Nets Are Monoids", *Information and
Computation* 88(2):105–155, 1990). A marking is a multiset; firing a
transition computes `m − s(τ) + t(τ)`. **The subtraction is the whole
point.** Tokens are consumed. There is no cpo of partial information
whose least fixed point is the net's behaviour, reachability is not
knowledge-accumulation, and a marking can strictly decrease.

**Kahn network state is cumulative.** Kahn, "The Semantics of a Simple
Language for Parallel Programming", *Information Processing 74*, pp.
471–475. Channel histories live in `D^ω` under the **prefix order**, with
the empty sequence as bottom and lubs for increasing chains. Processes are
**continuous**, hence monotone, and Kahn's own gloss on why monotonicity
is the crucial property is the estate's own argument in other words:
receiving more input can only provoke a station to send more output, and
that is what allows parallel operation, since a machine need not have all
its input to start computing. His Property 1 (Kleene) gives the least
fixed point as an iteration from bottom; his Property 2 (Scott) is the
**compositionality theorem** — the solution is a continuous function of
its parameters, so arbitrary interconnection is legitimate.

| | Petri net | Kahn process network |
| --- | --- | --- |
| arc state | marking — what is **left** | history — what has **happened** |
| order | monoid order; execution **subtracts** | prefix order; execution only **extends** |
| network behaviour | reachability, and only **lax** under composition | least fixed point, compositional |
| determinacy | none; conflict is primitive | Kahn principle: determinate, schedule-independent |

**The estate is Kahn-shaped, not Petri-shaped, and the visual register
must be too.** A lane is a history under the prefix order; a fold is a
continuous function of it; nothing is consumed by being read. Any mark
borrowed from the Petri tradition — a token that moves from one place to
another, a counter that goes down, an item that leaves a queue — would be
a lie about the plane. That is a constraint on the option space of
§3.2, and it rules out a family of marks that would otherwise look
natural.

Three further gifts from this pair. **Kahn's admission criterion** (§6):
a new primitive process may be added provided its output history is a
continuous function of its input histories — one soundness obligation per
node, which is structurally the estate's own rule that the alphabet grows
only by ruling, with the licensing law named. **The Brock–Ackerman
anomaly** (LNCS 107, 1981, pp. 252–259): two composites with identical
input/output relations, wired into feedback, do not behave the same — so
nondeterminism does not merely lose determinacy, it **destroys the
compositionality of the denotation**, which is the strongest external
argument for the estate having exactly one coordination point. And
Baez–Master's own asymmetry (Thms 17 and 23): what an open net *can do*
composes strictly, while what it *can reach* composes only laxly — a
caution against any surface that claims a reachability-shaped fact
compositionally.

### 1.10 Feynman diagrams, circuit schematics, music engraving

**Read**, through the sources named. Three short lessons, each a
candidate rule.

**Feynman diagrams: composition is glue-and-sum, and a single diagram is
not a number.** The Feynman rules are a local, typed homomorphism from
graph structure to integrand — internal edge to propagator, vertex to
coupling, loop to an integral, and a symmetry factor from the
automorphism group of the diagram (Weinzierl, *Feynman Diagrams*,
arXiv:2501.08354, §§2–3; Feynman, *Phys. Rev.* 76:769, 1949). But the
amplitude is the **sum** over all topologically distinct diagrams, and an
individual diagram is ultraviolet-divergent and gauge-dependent — the
gauge parameter sits inside the propagator, and only the sum obeys the
Ward identities. Dyson (*Phys. Rev.* 85:631, 1952) showed the whole series
diverges. **The lesson for a denotation map: a mark that only
means something inside a global sum is a trap**, and a candidate mark
should be checked against it — can this be read with the rest of the
surface absent? Shaikh and Gogioso (*Categorical Semantics for Feynman
Diagrams*, arXiv:2205.00466) show the glue-and-sum can be made the
composition operator itself, which is the formal version of the same
warning.

**Circuit schematics: the notation was changed to remove a syntactic
ambiguity.** The standards fix the alphabet, not the sentence — IEC 60617
is a symbol lexicon, and the drawing rules live in a different standard
(IEC 61082-1, whose §7.1.3 covers connecting lines and whose figures 29–31
cover joining and crossing). A schematic denotes a netlist: connectivity
is the semantics, the layout is presentation, and hierarchy is
definitionally transparent inlining. The load-bearing history is the
junction dot: because one dropped dot silently changes the denoted
netlist, modern practice **bans the four-way crossing**, staggering wires
into two T-junctions instead. **The candidate rule it suggests: no mark
whose accidental omission silently changes the denotation should exist.**
Applied to attribution, that is the argument for making it a required
field rather than a validated one — the option is in §3.2 and the choice
is not made here. And the schematic's other failure is
one the estate already answers: the lumped-matter discipline is
presupposed and **the notation has no symbol for its own domain of
validity** (Agarwal and Lang, *Foundations of Analog and Digital
Electronic Circuits*, ch. 1). The estate has an answer available — the
standing fences, which ride the surface rather than the documentation —
and whether they ride the *drawing* is an open placement question.

**Music engraving is the outlier, and it is the one that spends an axis
on order.** Seeger ("Prescriptive and Descriptive Music-Writing", *The
Musical Quarterly* XLIV(2):184–195, 1958) names the two identifications
as conventions: elapsed time with left-to-right position, pitch height
with height on the page — and observes that this makes music space and
music time separate, independent factors, with the staff lines and the
stems as the prototypes of a graph chart's two coordinates. Horizontal is
sequential composition, vertical is simultaneity. But the price is
visible in the craft: Gould (*Behind Bars*, Faber, 2011) puts rhythmic
spacing in §1, "Ground Rules", **not** in layout, because horizontal
distance is monotone in onset and deliberately **not linear** in duration
— and stem direction, a vertical-axis fact, perturbs horizontal spacing.
The axes are orthogonal semantically and coupled typographically.

Two refusals transfer. Seeger's own critique is that the notation is
prescriptive rather than descriptive and **presumes an interpreter with
out-of-band knowledge** — which is exactly Iverson's introducibility test
failed (§4.7), and the reason the map has no legend. And Byrd's survey of
extremes records that conventional notation has no crisp boundary at all:
its semantics is ill-defined and even what counts as *valid* notation is
ill-defined. A closed alphabet with a totality check is
available to this estate in a way it was never available to music, and
that availability is worth spending (§3.4).

**The cross-cutting observation worth keeping.** Of the traditions
surveyed, music engraving is the only one that spends an axis on order —
and every algebraic notation here gets its power precisely by refusing to
spend an axis that way. If this estate spends length on **positions**,
that is an index into a history rather than a time, and a narrower claim
than music's horizontal axis makes — but it is still spending an axis,
and §3.3's first decision is where that has to be justified.

---

## 2. Substance, denotation, style — the three layers

This section is the operator's direction, and it is load-bearing rather
than framing: it is the structure that makes §3's questions askable, by
saying which layer each question belongs to.

### 2.1 The claim

The kernel algebra is generic across languages. An algebraic expression
is a **sentence**, and the estate already projects one sentence into
three surfaces — the wire projection (MCP tools), the TS projection (the
builder), and the prose projection (docs and teaching frames) — each
walled served-equals-derived, so a disagreement between them is a digest
mismatch and therefore a finding rather than a doc bug (kernel algebra
§5.6). The visual register is a fourth projection of the *same* sentence,
and a full design language is what a fourth projection looks like when
its target medium is pixels rather than identifiers.

### 2.2 The split

| Layer | What it is | Identity | Who may vary it |
| --- | --- | --- | --- |
| **Substance** | the term itself — a composition of generator applications over sorts, the thing all four projections share | one digest | nobody; it is the value |
| **Denotation** | the invariant map — what a mark must mean, what a composition must preserve, what no style may vary | corpus data (§3.4), so it would have a digest too | a ruling, through the corpus, never a stylesheet |
| **Style** | typeface, rhythm, density, stroke weights, the palette *function*, graduation scale, annotation policy | a declared value with a digest | anyone, per audience, without touching substance or denotation |

The drawing function is therefore binary:

```
draw : Statement × Style → Surface
```

**Naming, before it collides.** The template algebra already owns the
word `render` — `render = assemble ∘ compile` is the no-second-assembler
law (kernel algebra R9, §5.5). This note therefore writes `draw`, since
one name for two different things is the incoherence the naming rule
exists to prevent. Whether the shipped surface keeps that word is not a
question worth a ruling; the collision is.

### 2.3 A style is a template fill, so the no-drift law is already proved

The natural worry about admitting a second argument is that it opens a
second render path. It does not, and the reason is already in the
grammar. R9 says a template is a program value with typed holes, `fill`
is simultaneous substitution whose disjoint fills commute, and rendering
is **defined** as compilation into the one assembler. A style is exactly
a fill for a drawing template's aesthetic holes. So:

- a style is a **declared value** admitted through the one door, with a
  digest, with lineage, pinned by whatever surface uses it;
- swapping aesthetics is swapping a pinned datum — house style becomes a
  digest rather than a vibe, and "which style was that screenshot?" is
  answerable;
- no new assembler exists, because R9 already forbids one;
- disjoint style fills commute, which is what makes a style composable
  from a base plus an audience override without a cascade.

**Open, and flagged as such:** which declaration *kind* a style takes.
Kind ranks are wire-stable — `encodeAct` writes `kind.rank` into an act's
canonical framing — so minting a thirteenth kind is a wire change and not
this note's to make. `template` (rank 10) is the argued candidate on
the reasoning above. Raised as **V-Q1** in §6.

### 2.4 The consequences worth stating

**A screen is a rendered sentence.** UI-L1 already said a view is a
declared fold read at an anchor under a writ. The three-layer split
sharpens it: the surface's identity is the **pair** `(statement digest,
style digest)`, and a surface with an unpinned style is undeclared in
exactly the way UI-L1 means — a pixel with data in it and no declaration
behind it is an unlogged egress.

**Panning and zooming are style changes, and the surface says so.**
Changing units-per-position mints a different style digest; choosing a
different fold mints a different statement digest. Both are citable, and
they are citable *differently*, which is the whole reason to have the
split. Neither is a hidden UI state.

**Per-audience styling is lawful and forks nothing.** A dense operator
style and a sparse teaching style are two style digests over one
substance. There is no second component tree, no second data path, and no
possibility that the teaching surface teaches something the operator
surface does not show — because both are `draw` of the same statement.

**Parity extends to the visual register.** An agent reads the sentence
through the MCP projection; a human reads the same sentence through the
visual projection. The parity claim is digest equality of the substance,
and it is checkable by the same served-equals-derived wall the other
three projections already run.

**Aesthetics become evaluable rather than argued.** The KM-18 eval
harness compares surfaces on lawfulness rate and wrong-slot rate over
tasks generated from the corpus. Style A versus style B, same substance,
same tasks, same two mechanical metrics, decision rule pre-registered.
The honest bound rides unchanged: that measures one model family at one
version on synthetic tasks, and a green arm licenses shipping a style —
never a claim about taste.

**The asymmetry this introduces, stated rather than hidden.** The visual
register is the first projection that is **not a function of the
statement alone**. The prose register's second argument is a closed
two-element set; Style is an open declared value. The consequence for the
wall is small but real: "byte-identical regeneration" becomes
"byte-identical regeneration at a pinned style digest", and an unpinned
style is a shape-check failure. Raised as **V-Q2**.

### 2.5 Aesthetics is monotone — the plane's own law, applied to style

The operator's sentence is that aesthetics is like meaning: never
extinguished, only grown, refined, and deepened. That is not a
sentiment once styles are declared values; it is the monotone plane
applied one level up, and it has four consequences that are checkable
rather than felt.

**The style space accretes.** A style is admitted through the one door
and named by its digest. Nothing unbecomes: a new style does not delete
an old one, and retiring a style strands no identity, because every
rendering pins **both** its substance digest and its style digest. The
same three sentences the catalog already runs about declarations run
here unchanged — a style nobody pins is inert, a style someone pinned
resolves forever.

**Refinement is a successor declaration pinning its predecessor.** There
is no `update` on an aesthetic any more than there is one on a value.
Version two of the house style is a new declaration that pins version
one, so an aesthetic has **lineage** — "house style" is a growing family
with a history you can walk, not a mutable current state that a
stylesheet edit silently replaces. The DAG discipline is the same one
`c7_pin_well_founded` already covers.

**Many styles inhabit one denotation at once.** A dense operator style
and a sparse teaching style are simultaneous, not sequential; per
audience, per context, per surface, all over one substance. Comparison
between them is the KM-18 eval — same tasks, same two mechanical
metrics, decision rule pre-registered — and the loser is **not
extinguished**. It is a style with a digest that fewer surfaces pin.
Nothing in the estate has a mechanism for deleting it, which is the
point.

**The same holds one level down, for the map itself.** Multiple lawful
visual *constructions* — candidate denotation maps — may coexist over one
substance, exactly as multiple algebras earn one rung. That is why §3 is
an option space rather than a map: a denotation map would grow by grill
item, never by overwrite, and a second map satisfying the same invariants
would be a second declaration rather than a correction of the first.

**The consequence worth stating on its own line, because no conventional
design system can say it:** an artifact re-drawn years later at its
pinned style digest is byte-identical to the original. **Aesthetic
history is replayable.** A design system whose current state lives in a
mutable stylesheet cannot reproduce what a screen looked like in a past
release; a design language whose styles are declared values reproduces it
by construction, and "what did this look like then" is a `resolve`
followed by a `draw`, not an archaeology exercise.

**One technical choice could break all of it, and it is not settled.**
Byte-identical replay requires that `draw` be a function of its two
digests. A randomized-initialization constraint solver is not, and that is
the fork of §4.4 — the single place where this ruling has a cost that has
to be paid rather than admired.

Two open questions follow. Whether a style successor must *declare what
it refines*, the way a revision pins its predecessor, or whether pinning
is enough, is **V-Q7**. And whether the served-equals-derived wall ranges
over styles at all is **V-Q2**.

---

## 3. The structure of the question, construct by construct

### 3.1 How to read the table

This replaces what the commission called the denotation map. It is the
same row set, but the columns ask rather than answer.

**What must be decided** — the open question for that construct, stated
so it can be closed by a decision rather than by drift. **Candidate
approaches** — at least two, each with what it buys and what it costs; a
row with one candidate is flagged as such, because a single option is
usually a sign the question has not been opened far enough. **What the
traditions contribute** — the machinery from §1 that bears on the choice.
**What the algebra fixes regardless** — the part that is not a design
choice, because it follows from a ruled fact, a proven law, or the
closure list. That last column is the envelope; everything inside it is
the design lane's.

Two constraints sit outside the table because they apply to every row.
**Nothing disappears** — the plane is monotone, so a candidate that
mutates or removes a mark is inadmissible; the fenced act is the only
non-monotone act in the algebra, and its row asks how the drawing stays
monotone through it. **No clock** —
no length, rhythm, or motion may be a function of wall time; the
available substitute is positions, and whether positions are enough is
itself a question (§3.3).

### 3.2 The option space

| Construct | What must be decided | Candidate approaches, priced | What the traditions contribute | What the algebra fixes regardless |
| --- | --- | --- | --- | --- |
| **dot** (a value) | whether a dot is a mark in its own right or only ever an endpoint of a wire; and whether its appearance is computed, argued, or absent | (a) computed mark from digest bytes — buys identity-by-construction, costs a bit-budget question (§4.3); (b) an unmarked terminal, identity carried only by adjacent text — buys total honesty, costs recognition; (c) argued glyph per kind with text for identity — buys legibility, costs a per-kind ruling | visual-hash literature for (a); string diagrams supply (b) directly, since a state `f : I → A` is just a box with no input wire | a dot is anchor-free and never stale, so nothing about it may imply staleness or a refresh; equal digests are equal values |
| **digest identity** | which channel carries it, and whether the mark is ever permitted to *stand for* the digest rather than accompany it | (a) hue plus interior pattern — buys discrimination, costs colour-vision safety (§7); (b) text prefix only — buys exactness, costs scanning; (c) both, with the mark never load-bearing alone | Bertin: hue is selective and associative but **not** ordered, so it is available for nominal facts; identicon practice for the computed mapping | identity is nominal, not ordinal — no ordered channel may carry it |
| **kind** | whether kind marks are derived from the kind datum or argued from resemblance, and whether kind is allowed any perceptual salience at all | (a) derived from the kind name — buys no-human-in-the-loop, costs legibility; (b) argued glyphs carried as corpus rows with their arguments, bijection-checked — buys legibility and auditability, costs 12 rulings; (c) no kind mark, kind as text | Iverson's mnemonic-symbol argument (`⌊` from L, `⊥` from a base) is the case for (b); Bertin's finding that **shape is never selective** is the cost of any glyph approach | 12 kinds, closed; `kind.rank` is wire encoding and not meaning, so no candidate may render rank as an ordered channel |
| **lane** | whether a lane is a wire (a sort) or a region (a container), and where its origin sits | (a) wire — buys the whole string-diagram apparatus; (b) region/lane-as-track — buys density, costs the composition story; (c) neither, lane as a table key | string diagrams: a wire is an object, and wires compose only through boxes | append-only; the origin never moves; `past-mutation` is closure-list row 12 |
| **position** | whether distance encodes positions at all, and if so under what graduation | (a) linear, one unit per position — buys exactness, costs long-lane legibility; (b) a declared **monotone** reparameterization carried as a digested value — buys scale, costs a second thing to read; (c) positions as text only, no spatial encoding | string diagrams give **no** length semantics, so spending length is an addition to justify, not an inheritance; music engraving is the cautionary case of a spatial axis that is monotone but not linear | positions are per-partition coordinates; `cross-sort-identifier` refuses comparison across partitions, so any shared axis across lanes is a question (§3.3) |
| **head** | what a terminus may imply, given that "more is coming" is a liveness claim | (a) blunt terminus — refuses the claim; (b) directed arrow — reads naturally, asserts a future; (c) no distinct head mark, head implied by where drawing stops | Selinger's wires are directed by convention, and the convention must be stated in the first figure | the strongest sentence available is *productive through anchor p*; no "live" badge, no absence claim |
| **anchor** | whether an anchor is a point (a cursor) or a boundary (the end of an accreted region) | (a) boundary of a growing segment — makes advance an accretion; (b) cursor — reads as a position but *moves*, which is the thing the monotone plane refuses; (c) both, with the cursor demoted | Kahn: the channel history is what has *happened*, so the accreted-prefix reading has a semantics behind it (§1.9) | consumers are read-plane state; `f3_resume_exact` makes resumption exact; re-reading from an older anchor is a different read |
| **lag** | whether lag is a length, a number, or both — and whether lag lengths compare across lanes | (a) length in the same units as position — buys immediate comparison, raises §3.3's commensurability problem; (b) number only — always honest, harder to scan; (c) length within a lane, number across | Tufte's small multiples argue that comparison is what the eye is for, but only under a constant design frame | `head − anchor` in positions, exactly, with no clock; a spinner is a liveness claim and "last updated" is a `clock-read` |
| **cell** | what a lattice value looks like when its contents are a set and its order is derived | (a) the set of contributions laid out by the derived order — buys the law's visibility, costs space; (b) the joined state alone — compact, hides the structure the law is about; (c) state plus a contribution count | the derived order is free at every semilattice-branded algebra, so a Hasse-shaped layout needs no declaration | permutation- and duplication-invariance are `f1_cell_merge_aci`; extensionality is `f1_cell_extensional` — any candidate must be invariant under both |
| **join** | what visual operation the algebra's join must equal | (a) set union of marks — idempotent and commutative on the visual side, so the laws transfer; (b) accumulation into a single mark — compact, loses idempotence visually; (c) a Hasse-order raise | this is where §0.7's homomorphism question is sharpest, and where the candidates genuinely differ in what they can be tested for | join is inflationary (`cell_absorb_inflationary`); no candidate may render a replacement, and no last-write-wins carrier exists |
| **fold** | whether a fold is drawn as a box over a lane segment, as a feedback loop, or not drawn at all | (a) box with lane, algebra, state and anchor wires — string-diagram native; (b) **feedback** with an `F`-guarded loop — matches the estate's semantics most exactly, since a fold *is* a state space plus a step function and the anchor is the guard; (c) 2-categorical universal-property diagram — provable but a different dimension | Di Lavore–de Felice–Román: trace = feedback + yanking, and yanking is the claim a loop is instantaneous, which the estate cannot make; Marsden draws fold's universal property and proves Lambek's lemma graphically | R4: `fold(xs ++ ys) = foldFrom(fold xs) ys`; parallel folds are licensed only at an earned commutative brand |
| **anchor-read** | whether a state value can ever be drawn apart from its anchor | (a) inseparable stamp — makes the category error undrawable; (b) adjacent chip — conventional, separable; (c) anchor in a caption | Victor's step-down rule argues every mark should resolve to the concrete state it denotes | reads are `resolve` (anchor-free) or a `fold` state at an anchor (head-relative); `readLatest` is refused as an ambient input |
| **register** (the carrier) | whether a register is drawn when nothing is contending | (a) always drawn — absence is not representable; (b) drawn on contention — compact, makes an absence claim; (c) drawn in a demoted band | wiring operads: an outer box is the thing string diagrams usually omit, and adding it is what makes nesting operadic | the register key **is** a declaration digest, so no anonymous decision exists |
| **fence / decide** | what a non-free act looks like when everything else is free, and what happens to the losers | (a) constriction all candidates pass through, losers terminating as refusals — keeps the drawing monotone through a non-monotone act; (b) a winner-only rendering — simpler, erases evidence; (c) a demoted band | §1.1's premonoidal result: the only way to serialize is a wire everything touches, so whatever plays that role **is** the fence, and nothing else may play it accidentally | `at_most_one_landed_commit`; G23 rides it verbatim — at most one landed outcome is not at most one external side effect |
| **token** | whether token monotonicity is shown, and against what | (a) position on a graduated token axis — makes regression undrawable; (b) an opaque key mark — honest, shows nothing; (c) text only | — (single-candidate rows aside, this one has little tradition behind it) | `token_monotone`, `grant_or_steal_strict`; tokens never compare across registers |
| **writ** | whether authority is a region, a tree, or a list | (a) region — makes the meet drawable as intersection; (b) tree — familiar, invites an org-chart reading G35 refuses; (c) list of grants | Spivak's nesting-is-composition is the argument for regions | the writ is a declared value; no topology is implied by the algebra |
| **meet / attenuation** | how a clamped request is shown, given that the law clamps rather than refuses | (a) containment with the over-request drawn and clipped — shows what was asked and what was granted; (b) containment only — clean, hides the ask; (c) a refusal-shaped mark, which would misstate the law | `f9_tree_attenuation` is a containment statement, so nesting is the tradition-free choice here | authority shrinks by meet; over-grant is unrepresentable rather than reviewed-for; an escalating request **clamps** |
| **trigger** | whether a fired trigger is distinguishable from a declared one, and whether either can un-draw | (a) permanent arrow with an accreted fired-mark; (b) state change on one mark — compact, mutates; (c) two separate marks | `f10_stability` says a predicate that holds keeps holding, so permanence is licensed | five productions, closed; absence, negation and deadline have no constructor to draw |
| **emit / envelope** | how much of an envelope is drawn at its position — body, attribution, kind, or a composite | (a) composite tick carrying all three — dense, raises the 1+1=3 hazard (§4.8); (b) tick plus resolve-on-demand — matches draw-the-frontiers; (c) tick only | Tufte's sparkline argues for word-sized density; Victor's step-down argues for resolve-on-demand; the two are compatible | `f2_trace_invariant` — duplication and reordering are harmless, so identical bytes may legitimately appear twice |
| **declare** | whether pins are drawn, and if so along what coordinate | (a) hairlines along a rank coordinate — makes a cycle undrawable, since `pin_rank_lt` descends; (b) pins undrawn, lineage in text; (c) pins on demand | the catalog is a DAG by construction, and a layout by admission rank inherits that | a pin names an already-admitted digest; a cycle needs a hash preimage |
| **register-band (outside meaning)** | whether liveness machinery appears at all | (a) demoted band, structurally separated — diagnostic without being grammar; (b) omitted entirely — the strongest fence, loses diagnostics; (c) a separate surface | — | grant, steal, renew and heartbeat are outside meaning; no fold on any surface may read them |
| **refusal** | whether a refusal is drawn as content on the plane, and whether the repair is drawn or written | (a) taught stop plus, for machine-applicable rows, the lawful twin **drawn**; (b) taught stop with the repair as text; (c) refusal in a separate surface | Penrose's inconsistent programs "fail gracefully, providing visual intuition for why the given statements cannot hold" — the closest prior art for a drawn refusal | refusal parity is total — reason, law, repair, applicability, all four or malformed; no toast, no modal, no error state to design |
| **claim-tier fact** | how the saying is separated from the said | (a) boundary with weight demotion; (b) two marks with an explicit relation; (c) a badge on the claim | — | the journal records that A said X as truth; X stays untrusted testimony until verified; promotion must be accretive |
| **placement fact** | whether placement is a property of the dot or a separate fiber | (a) separate facet band — keeps the dot's rendering invariant under placement changes; (b) a badge on the dot — convenient, couples the planes | KM-23's two-plane split is the argument for (a) | batching is invisible to meaning, so a placement change must not change what the value's mark means |
| **attribution** | whether attribution is a required field of every mark record or a rendering option | (a) required field, so anonymity is unrepresentable; (b) validated but optional; (c) attribution in a side panel | circuit schematics: the four-way-junction ban exists because one dropped dot silently changes the denoted netlist — the argument for making omission structurally impossible rather than merely wrong | attribution rides every fact; displayed attribution is the envelope's claim under a credential, **never** a proof of a person |

### 3.3 The six decisions that cut across every row

These are the ones that cannot be settled construct by construct, because
a choice in one row forces choices in others.

**(1) How to spend the ordered-channel budget.** Position, size and
lightness are ordered; the algebra has two orders — the derived lattice
order and the declared score/identity order — plus positions, which are a
per-lane coordinate rather than an order over values. That is three
things wanting ordered treatment and three ordered channels, which looks
like a fit and is not, because containment is not on Bertin's list and
because lightness carries an order weakly. **What must be decided:**
which of the two orders takes rank, whether containment counts as an
ordered channel at all, and whether positions may spend length given that
they are a coordinate rather than an order.

**(2) Whether lanes share an axis.** Positions never compare across
partitions — `cross-sort-identifier` is the refusal — so a shared origin
across two lane wires invites a comparison the sorts refuse, with the
full authority of a picture. But refusing a shared axis also refuses the
small-multiple reading that Tufte's argument makes most valuable, and lag
is the one number an operator most wants to scan across lanes. **The
options:** no shared axis and no cross-lane length comparison; a shared
axis for lag only, with units printed; or a shared axis with an explicit
non-comparability mark. All three are defensible and they are not
compatible.

**(3) Where the reading datum keys.** N-1 established that the plain-word
register needs a phrasing datum **per operator** while the algebraic
register needs none, because the symbol carries the distinction. The
visual register's key is open, and the candidates are distinguishable by
a concrete test:

| Candidate key | What it predicts | Status |
| --- | --- | --- |
| per operator | as expensive as the plain register; every declared algebra needs its own mark | not ruled out |
| per rung | `max` and `distinct-set` draw identically, since they share their laws | **ruled out** by a counterexample: `join` (`∨`) and `spawn` (`⊓`) share the bounded-semilattice rung and would need opposite geometries, union outward versus containment inward |
| per (rung, sense), `sense ∈ {join, meet}` | same-rung-same-sense operators draw identically; cheaper than prose, coarser than algebraic | the surviving candidate, **untested** |

The falsifier for the third is concrete and worth running before anything
is built: **find two operators at the same rung and the same sense that
must draw differently.** `hyperloglog` is the sharpest candidate — same
rung and sense as `distinct-set`, but its presented answer is
`Approximate` and its estimator has no donor. If the `present` row
absorbs that difference the candidate survives; if not, the key is per
operator. Note the methodological point: N-1 was found by *running* the
renderer, not by designing it.

**(4) Argued marks versus derived marks.** Iverson argues symbols from
resemblance, one at a time, by a person; the estate's rule is that a mark
be a function of the datum. The axis that separates the cases is
**cardinality**: closed, small, named sets (12 kinds, 8 generators, 16
refusals) can carry argued marks as corpus rows with their arguments
attached and a bijection check — which is exactly how the 16 refusal rows
already carry hand-written law and repair prose — while open, unbounded
sets (digests, credentials, declared algebras) admit no bijection check
and no per-mark argument. **What must be decided:** whether the map runs
one tier or two, and if two, whether the tier is a field on the row (the
same two-tier honesty the `evidence` field carries for donor-backed
versus suite-backed brands).

**(5) Where the denotation/style boundary falls.** This is the operator's
own framing of the central question, and §3.2's rows do not answer it.
Penrose's `ensure`/`encourage` split is a candidate formal reading: what
must hold compiles to hard constraints, what is merely wanted compiles to
soft objectives, and the boundary becomes a compilation target rather
than a convention. Under that reading the style-free parameters
would be exactly the `encourage` terms. The contested cases are visible
already: a declared monotone reparameterization of the position axis is
still a length claim; accretion motion is position-driven but *how much*
motion is itself a claim; and stroke weight looks like style until one
mark has to be the heaviest.

**(6) What the composition operator is.** §0.7 requires the map to be a
homomorphism if it is to be testable, but the target algebra is open. Set
union, region intersection, series and parallel composition, and Hasse
raising are all candidates, and they differ in what can be tested: union
makes idempotence a byte comparison, accumulation does not. **The
decision is which visual operations the algebra's operations must equal**,
and it is the decision on which the whole testability argument rests.

### 3.4 The corpus-row question

The register discipline requires the map be data. What shape that data
takes is open, but the estate's idiom constrains it: NDJSON, `record`
names the group, members sorted in canonical form, integers only, no
floats. A row shape consistent with that would need to carry, at
minimum, the construct, the sort it denotes, the channels it spends, the
composition operator, the invariant stated so a test can diff it, the law
or ruling behind it, the refused renderings, and the parameters released
to style. Whether the donor/evidence two-tier discipline extends to marks
(§3.3, decision 4) determines whether two further fields are needed.

Two properties are not optional if the map is to be a register at all,
because they are inherited from N-1 rather than chosen. **Totality with
no generic fallback** — a construct with no row does not draw, and the
absence is a shape-check failure, because a design that had not been run
would have shipped the generic template. And **the style-released set
must be explicit per row**, since that is what makes §3.3's decision 5
checkable rather than rhetorical: a style that sets a parameter no row
released is refused against the map.

### 3.5 The affordance question

The commission's constraint is that every interactive affordance denote
one of the eight generators, and that a control with no denotation not
exist. Mapping the obvious surface acts onto the alphabet is mostly
mechanical — opening a value is `resolve`, contributing an observation is
`join`, minting a successor is `declare`, acknowledging is `emit`,
pressing the priced act is `decide`, declaring a reaction is `trigger`,
requesting narrower authority is `spawn`, and choosing or advancing a
declared reduction is `fold`. The absences follow: no refresh, no delete,
no save, no sort-by-latest.

Three acts do **not** map mechanically, and they are the question.
**Drill-down**: Victor formalizes stepping down a ladder of abstraction as
partial application, which in this grammar is R9's `fill` — so a
drill-down would be a filled program and therefore a `declare`, which is
a defensible reading and also a surprisingly heavy one for a click.
**Zoom and pan**: if they change units-per-position they change a style
parameter, which would mint a style digest rather than a statement digest
— citable, but as a different kind of change, and whether that
distinction should be visible to the user is open. **Cite this surface**:
an `emit`, if acknowledgement is evidence. If any of the three resists
absorption, that is a K-1 growth-discipline item and not a UI patch,
which is why it belongs in §7 rather than in a component.

---


## 4. Technical machinery, and the forks inside it

What follows is not a set of adopted walls. It is the machinery a visual
register could be built on, the checks that machinery makes available,
and the forks that must be taken before any of it can be used. The
organizing criterion is falsifiability — a map that cannot be falsified
is a stylesheet with better prose — so the question asked of each
candidate is what test it would make possible.

### 4.1 The rung constrains what a diagram is allowed to assert

This is the sharpest single consequence available, and it holds under any
candidate that uses juxtaposition for parallelism. Suppose a partition
fold is drawn as *n* boxes side by side with no wire between them. By the coherence theorem of §1.1, that drawing **asserts** that the
boxes are unordered. The algebra licenses the assertion exactly when the
algebra carries the earned commutative brand (`f4_partition_fold`).
Therefore:

> Drawing an unbranded algebra's fold in parallel would not be a style
> mistake. It would be a diagram that says something false — an argument
> that the renderer should refuse rather than draw it, and a reason the
> rung has to reach the read path before the parallel form is drawn at
> all.

The check this makes available: plant a fold at a magma-rung algebra, ask
for the parallel drawing, and require a refusal. Then the mutation arm the estate already
demands — weaken the renderer's rung requirement and confirm the planted
control stops refusing. A negative-control suite without a mutation arm
is the failure mode the kernel-model notes already name.

### 4.2 The shared-axis problem

Positions are per-partition coordinates and never compare across
partitions; `cross-sort-identifier` is the refusal. A shared x-axis
across two lane wires would invite exactly that comparison with the full
authority of a picture. One candidate response is blunt — lane wires
are not aligned to a common origin, and no background grid spans two
lanes — and it is not the only one. §3.3's second decision gives three
options and notes that they are incompatible.

Lag lengths are the weaker case, and the note states the bound rather
than resolving it. Lag is a count of positions on its own lane, so two
lags are commensurable only as counts, and a position on a busy lane and
a position on a quiet one are not the same quantity of anything. Whether
a printed unit is enough to make a cross-lane length honest, or whether
the comparison should be refused outright, is **V-Q3**.

### 4.3 The bit budget of a computed identity mark

A digest-derived mark consumes some number of bits of the digest. Two
distinct digests whose consumed bits collide draw identically, and a
human reading the surface would take them for the same value. That is a
real failure mode of visual hashes and the estate cannot wave at it. A
fence is available, and it is cheap:

- make the bit budget a **declared** field of the mapping function,
  printed wherever the mark is used as evidence;
- keep a short text prefix beside the mark, so identity is never carried
  by the mark alone;
- treat the mark as an aid to recognition and never as a proof of
  equality — the proof is the digest, and comparing digests is what
  `resolve` does.

Compressed: **an identity mark would be recognition, not verification**,
and anything the estate would refuse to decide on a truncated digest it
would refuse to decide on a mark. The budget itself is **V-Q4**, and §7
records that the primary sources for it did not land in this pass.

### 4.4 The fork: is layout an optimization or a fold?

This is the one place where the closest kin in the literature and the
operator's own ruling pull in opposite directions. It is priced here and
not decided.

Penrose solves layout by **optimization** — `ensure` compiles to hard
constraints, `encourage` to soft objectives, the pair becomes a
constraint/objective graph, and autodiff plus an exterior-point method
with L-BFGS finds a point (§1.3). Its own paper is explicit that the
output is a **family** of solutions rather than one diagram, that the
solver finds local minima only, and that everything written in Style
must be differentiable.

That posture conflicts head-on with §2.5's requirement that an artifact
re-drawn at its pinned style digest be byte-identical to the original.
A randomized-initialization solver does not have that property. Two
resolutions, both real, priced here:

| Fork | What it buys | What it costs |
| --- | --- | --- |
| **A · pin the solve inside the style** — seed, iteration budget, tolerance, and solver version become fields of the style value, so `(substance, style)` determines the raster | keeps the constraint language, keeps whole-diagram restyling, keeps `ensure`/`encourage` as the formal reading of the denotation/style boundary | inherits the differentiability tax; a solver-version bump is a style successor and re-draws everything; "byte-identical" is only as strong as float reproducibility across platforms, which is exactly the reason the corpus admits no floats |
| **B · layout is a deterministic fold** — the drawing is a reduction over the term, and position is computed rather than searched | byte-identical by construction; integral coordinates; no floats anywhere; the renderer is itself a declared fold, which makes the whole drawing citable and replayable by the machinery the estate already has | gives up the constraint language and the free whole-diagram restyle; every layout idiom must be written as a reduction, which is more work per idiom and less expressive for dense graphs |

**The argument each side has, stated without a verdict.** For B: the
corpus admits no floats because a rounded double in a content-addressed
declaration is a different value on a different platform (schema §1.2),
and a layout whose coordinates come out of a float optimizer is that
hazard one layer up; B would also make the drawing an instance of the
generator the estate has the most theory about. For A: the constraint
language is genuinely more expressive, whole-diagram restyling is exactly
the property §2.5 wants, and a pinned seed with a pinned solver version
may be enough determinism in practice. It is **V-Q8**, and it is the
largest commitment in the register.

**What survives either fork.** Penrose's `ensure`/`encourage` split is a
candidate *formal* reading of the denotation/style boundary regardless of
how layout is computed: denotation is what must hold, style is what is
merely wanted. Under that reading the style-released parameters of §3.2
would be exactly the `encourage` terms, and a style that tried to relax
an `ensure` would be refused against the map. That is an option for
§3.3's fifth decision, not a resolution of it.

### 4.5 The mutation arm, as planted substances

Edgeworth's discipline is to mutate **Substance** and never Style —
typed add/delete/edit operators over the content, re-solved under one
uniform style, so the variants are comparable (§1.3). That is directly reusable as a
negative-control battery for a visual register:

- planted **unlawful** substances (a fold at a magma rung drawn in
  parallel; an unfenced decide; a cross-lane position comparison) must
  produce a refusal mark and no diagram;
- planted **lawful variant** substances (a re-join, a permuted join
  order, a segment split) must produce byte-identical rasters, which is
  §0.7's homomorphism requirement checked;
- and the arm that makes the battery load-bearing: weaken the renderer's
  rung requirement and confirm the planted controls stop refusing.

One style is pinned across the whole battery, so a raster diff means a
substance difference and nothing else.

### 4.6 The two-readings target

Iverson's sharpest structural claim is that one unparenthesized form
admits **two** lawful readings — analytically left to right, and
constructively right to left (§1.6). A visual register that can only be read one
way would have lost it. The diagrammatic traditions can keep it: a
diagram read along the wires in the direction of composition is the
construction order, and the same diagram read outside-in, box by
enclosing box, is the analytic reading.

The check this makes available is a round trip — parse the drawing back
to a term in each reading direction and require both to equal the
substance digest. Whether two readings is a requirement or merely
desirable is a decision; what matters here is that it is *testable*,
which is unusual for a property this soft.

### 4.7 Introducibility in context, as a candidate measure

Iverson makes introducibility a *measure* of a notation: a notation
suited as a tool of thought should permit easy introduction in the
context of the topic itself. Applied here it is a test with an obvious
verdict condition: **a visual register you must leave the surface to
learn has failed it.** Two mechanisms already in the estate would help a
candidate pass — refusals taught on the plane, with law and repair; and
Victor's step-down rule, under which every mark resolves to the concrete
datum it denotes when pointed at (§1.8). The corollary is a usable test
for any candidate mark: if it needs a legend, its meaning is not in its
form.

Iverson's five characteristics are also usable as a scoring sheet for
candidate maps. Scored against the *option space* of §3 rather than
against any chosen map, so the entries say where the question is strong
and where it is exposed:

| Characteristic | Where the question stands |
| --- | --- |
| ease of expressing constructs | the eight generators and the frontier constructs all have candidates; **nothing is known** about compositions more than two deep, which is where diagram languages usually break |
| suggestivity — form similarity is semantic similarity | this is what §3.3's reading-datum decision is really about: keying on (rung, sense) would make form similarity *be* law similarity, and keying per operator would not |
| subordination of detail | well served by resolve-on-demand, which the cost argument and Victor's step-down argument support independently |
| economy — utility up with range, down with vocabulary | roughly 25 constructs over 8 generators; economy degrades if the reading datum turns out to key per operator |
| amenability to formal proofs | the strongest reason to take the diagrammatic traditions seriously: the invariants can be stated as equations, and §0.7's homomorphism requirement turns a law violation into a raster diff |

### 4.8 The emergent-activity problem, which nothing here solves

**A coverage check is available and cheap.** Whatever the map turns out
to be, "every mark in a rendered surface matches a row, or it is
erasable" is a lookup rather than a judgment: enumerate the drawing's
primitives, join against the map, report the unmatched. The refuted
mock's twelve colour tokens would be exactly the unmatched set. This is
the mechanical core of the coordinator's denotation-ink suggestion
(§1.7), and it is worth having independently of whether any ratio is
minted as a measure. Its scope is Tufte's own caution (VDQI p. 96).

**The problem it does not touch.** A map guarantees that every declared mark denotes.
It guarantees nothing about what appears when two declared marks are
placed near each other — and Tufte's doctrine is that two elements
reliably produce a third visual activity, mostly noise, in proportion to
value contrast (*EI* pp. 53, 61–62). Concretely, in this register: a
bright channel between the gate's heavy stroke and an adjacent wire; a
moiré in any dense position graduation, which a one-tick-per-position
candidate would be close to by construction; an implied alignment between two lane wires that §4.2 refuses
in the map and the eye supplies anyway.

**This is the weakest joint in the whole approach, and it is weak in a
specific way.** Every other property discussed here can be stated as an
equation a renderer is held to. This one is a property of the output that
only a reader — or a perceptual model nobody here has — can evaluate. The
best available placement is that **emergent activity is a style-level
obligation**, since weights, spacing, and contrast are all style
parameters, so a style producing a strong non-denoting alignment would be
a defective style rather than a defective map, and the eval of §2.5 is
where it would surface. That is a placement of responsibility, not a
solution, and **V-Q10** records it as unsolved.

### 4.9 What the premonoidal result says about this algebra

§1.1's converse is worth restating in the estate's own terms, because it
is a derivation rather than an emphasis. Unordered-by-default is the
definitional content of ⊗ being a bifunctor, and the only way to impose
an order between two otherwise-independent boxes is a wire that both of
them touch. This algebra has exactly one candidate for that wire: the
fence. Every contending act touches it, which is why they cannot slide
past each other; nothing else in the algebra touches it, which is why
everything else stays free.

Two consequences for whoever designs the language. The visual
singularity of the priced act is **forced** rather than chosen — it is
what a runtime string looks like when it is drawn. And the failure mode
is precise: **a second mark that every act had to touch would silently
serialize the whole register, whatever it was drawn to mean.** That is
worth naming early, because it would not look like a mistake. A shared
background grid, a global timeline, a common baseline, and a single
enclosing frame every act sits inside are all candidates for accidentally
becoming that second wire.

### 4.10 Host machinery — candidates, with maturity noted

The register also needs a host: something that holds the reactive graph,
paces each view, and turns pushed deltas into redraws. Two candidates are
under evaluation in a scratch vertical slice on the board — **evaluated,
not adopted** — and are recorded here as elements rather than
recommendations.

**foldkit** (`foldkit.dev`) — an Elm-architecture Model-View-Update layer
on Effect: one immutable Schema-typed model, typed messages, a single
`update` returning a model and commands with effects as returned values,
pure views, subscriptions, a Story/Scene test split, and time-travel
devtools. **Technical relevance:** MVU's `update` is a catamorphism over
the message stream, so the framework's shape coincides with fold-at-the-UI
rather than merely permitting it, and its time-travel is
replay-from-position by construction rather than by instrumentation.
**Maturity: beta**, which is a real consideration for anything the
register's determinism claims would rest on.

**effect-atom** (`@effect-atom/atom`, `@effect-atom/atom-react`) — lazy,
reference-counted reactive atoms holding values, Effects or Streams, with
`Atom.family` for keyed atom sets, `Atom.runtime` built from Layers, a
`Result` type carrying Initial/Failure/Success, and `keepAlive` as the
retention knob. **Technical relevance:** the reference-counted lazy graph
is a flow-control primitive for the per-view pacing the UI note's §4
requires, `Atom.family` is digest-keyed resolve-on-demand almost
literally, and the `Result` trichotomy offers a ready slot structure for
the absence/refusal/value distinction the register has to make somewhere.

**What neither settles.** Both are host machinery, and §7's bound stands:
pixels are carriage. Neither answers §4.4's determinism fork, neither
supplies a denotation map, and the fact that one of them is
fold-shaped is an argument about fit rather than evidence of it.

---

## 5. What any staging has to respect

The commission asked for a minimal-first build path. Choosing the path is
the design lane's; what follows is the part that is not a choice — the
dependency order the algebra imposes, and the demonstration each step
would owe.

**The smallest semantically honest rendering is fixed by the sort
system, not by taste.** A view is a declared fold read at an anchor under
a writ, so the smallest thing that is not a lie needs a lane, a head, one
consumer's anchor, and lag as a measured quantity. Anything smaller
either drops the anchor — making it an unanchored read, which the
algebra refuses — or drops the lag, which makes the surface silent about
its own staleness. That floor is a consequence, and every candidate
language meets it or fails.

**The dependency order.** Some steps cannot precede others regardless of
which visual vocabulary is chosen:

| Depends on | Why |
| --- | --- |
| any composite drawing → the single-construct drawings | §0.7's homomorphism requirement is vacuous until there are at least two renderings to compose |
| the parallel form of a fold → rung brands reaching the read path | the parallel drawing *asserts* order-freedom, and the assertion is licensed only by an earned commutative brand; until brands are surfaced there is nothing to check the assertion against — this is the algebraic-register record's commit B, and the visual work should not race it |
| the `mark` corpus group → any generated rendering | before the group exists, every mark is hand-written, which is the condition the register discipline exists to end |
| the style value → every invariant being green at more than one style | §2.5's replayability claim is untested until two styles exist over one substance |
| the refusal renderings → the taught corpus being served | refusal parity is total, so a partial refusal rendering is not a partial feature, it is a malformed one |

**What each step owes, whatever it draws.** Three demonstrations recur,
and they are the reason to stage at all rather than build a surface and
inspect it:

1. **Determinism.** Drawing the same substance at the same style twice is
   byte-identical. This is the precondition for every other check, and
   §4.4 is the fork that decides whether it is available at all.
2. **A law as an equation on the output.** Whichever composition operator
   is chosen (§3.3, decision 6), the step should be able to state one law
   as a diff: idempotence as an unchanged raster, commutativity as an
   unchanged raster under permutation, R4 as an unchanged output mark
   under segment splitting.
3. **A planted control and its mutation arm.** Edgeworth's discipline is
   to mutate **substance**, never style, so variants are comparable
   (§4.5). A step contributes an unlawful substance that must produce a
   refusal and no drawing, a lawful variant that must produce an
   identical drawing, and — the part that makes the controls
   load-bearing — a mutation that weakens the constraint and confirms the
   control stops refusing.

**One sequencing observation offered without a recommendation.** The
constructs divide into those needing no corpus change (lane, position,
head, anchor, lag, and whatever carries attribution) and those needing
the `mark` group to exist first. That division does not dictate an order,
but it does mean the cheapest useful demonstration and the cheapest
useful *ruling* are not the same step, and whoever plans the path should
decide which of the two they want first.

---

## 6. Open questions for the grill

The six cross-cutting decisions of §3.3 are questions in their own right
and are not repeated here. What follows is what remains after they are
settled, plus the questions about the register's own machinery.

| # | Question | Why it is not this note's to settle |
| --- | --- | --- |
| **V-Q1** | **Which declaration kind does a style value take?** `template` (rank 10) is an argued candidate, because R9's `render = assemble ∘ compile` would then supply the no-drift law for free and a style would be a fill rather than a second render path. A thirteenth kind is wire-breaking, since `encodeAct` writes `kind.rank` into canonical framing | kind ranks are wire-stable; this is the schema owner's ruling |
| **V-Q2** | **Does the served-equals-derived wall range over styles?** A visual register would be the first projection that is not a function of the statement alone — the prose register's second argument is a closed two-element set, while a style is an open declared value. "Byte-identical regeneration" would become "byte-identical regeneration at a pinned style digest", and an unpinned style a shape-check failure | it changes what a green gate means |
| **V-Q3** | **Are lag lengths commensurable across lanes at all?** §3.3's decision 2 gives three incompatible options. The strict reading — that a position on a busy lane and a position on a quiet one are not the same quantity of anything — would remove the one number an operator most wants to scan | it trades an honest-but-coarse affordance against a possible category error |
| **V-Q4** | **What is the bit budget of a computed identity mark, and where must such a mark be refused as evidence?** Two digests whose consumed bits collide would draw identically. A fence is available — the mark is recognition, never verification, and anything the estate would refuse to decide on a truncated digest it refuses to decide on a mark — but the budget is a number nobody has chosen and the perceptual near-collision rate is unmeasured | it needs a measurement no session here has run |
| **V-Q5** | **Does the visual register need a ninth generator to exist?** Drill-down, zoom, and cite-this-surface were absorbed into `declare`, a style change, and `emit` respectively in §3.5. If any resists absorption, that is a K-1 growth-discipline item | the alphabet grows only by ruling |
| **V-Q6** | **Does the refusal's lawful twin belong to the register or to the repair machinery?** Drawing the repaired diagram beside the refused one would be the strongest teaching move available, and it requires the renderer to draw a candidate that was never admitted — a real capability with a real risk | it touches what the door and the renderer each own |
| **V-Q7** | **Aesthetic lineage: must a style successor declare what it refines?** §2.5 makes styles accrete and refinement a successor declaration. Whether the successor must *pin* its predecessor the way a revision does — making house style a walkable DAG — or whether coexistence without stated lineage is enough, decides whether "this style refines that one" is a fact or a story | it is a declaration-content ruling with a digest consequence |
| **V-Q8** | **Is layout an optimization with a pinned seed, or a deterministic fold?** The fork, both sides priced, is §4.4. It decides whether the register inherits Penrose's differentiability tax and float hazard, or gives up the constraint language to get byte-identical replay. The operator's replayable-aesthetic-history ruling is what makes it urgent | it is the largest engineering commitment in the register, and it belongs with the seat that owns the corpus's no-floats rule |
| **V-Q9** | **Can a composite's price be shown at all?** Spivak's Prop. 3.1.2 says no additive cost invariant respects wiring, so a composite's tier is not the sum of its parts' in any way a diagram respects. The estate has a cost ladder and a strong instinct to price a surface. Either the tier rides only the one priced act, or a non-additive presentation has to be invented | it is a claim about what a surface may assert, which is a fence question |
| **V-Q10** | **Who owns emergent non-denoting activity?** A map can guarantee that every declared mark denotes and cannot guarantee what appears when two of them are adjacent (§4.8). The only available answer is that it is a style-level obligation, since weights, spacing, and contrast are style parameters — which is a placement of responsibility, not a solution | it is the one property of the output that no equation in the map can reach |

---


## 7. Honest bounds

1. **This note reaches no design conclusions, by instruction.** It
   supplies elements, technical approaches, and the structure of the
   question. Every row of §3.2 is an option space, and a reader who takes
   any cell as a recommendation has read it wrong. There is no exemplar
   drawing here for the same reason: an exemplar is a design act.
2. **Nothing here is measured.** No renderer was built and no reader was
   tested. Every claim about how a mark is perceived is inherited from
   the cited literature and is a **lead** until the estate runs it. The
   candidate reading-datum key of §3.3 in particular is untested, and the
   methodological warning stands: N-1 was found by running a renderer,
   not by designing one.
3. **Nothing is ruled, added, or changed.** No corpus row, no count, no
   gate, no ticket, no seam status. §3.4's row shape is a sketch of what
   the estate's idiom would require, not a proposal on the table.
4. **Cadences remain unmeasured.** Every rate word is an ordering claim
   until AE-7 runs. Where this note discusses motion it is deliberately
   position-driven, precisely so that it does not need a rate to be
   honest.
5. **Safety only.** No sentence here claims liveness, convergence, or
   termination. *Productive through anchor p* remains the strongest
   aliveness sentence any surface may print.
6. **Attribution fence.** Any credential shown is a credentialed
   connection acting under a writ. A register displays the envelope's
   attribution; it does not and cannot display a person.
7. **Pixels are still carriage.** Layout solving, rasterization,
   accessibility, input handling, and virtualized drawing are host
   engineering the algebra is silent on.
8. **Two inherited limits from the traditions, stated because they are
   easy to forget.** Adding copy and discard to a string-diagram language
   costs the "topology is the whole theory" property — coherence for
   finite-product categories holds only up to isomorphism of diagrams
   *plus* postulated diagrammatic equations (Selinger Thm 6.1 against
   Thm 3.12). And no additive cost invariant respects wiring (Spivak
   Prop. 3.1.2), which is V-Q9. Neither is avoidable by choosing a
   different vocabulary.
9. **Colour vision is unaddressed.** If hue carries nominal facts, a
   computed hue function has no way to avoid confusable pairs unless the
   mapping is designed to. That is a property of the mapping function —
   a style-level object — and no source surveyed here settles it.
10. **Citation hygiene, carried from the research pass.** Bertin was read
    through secondary summaries, not the primary text. Kaiser's page
    numbers, Gould's page numbers, Ross p. 77, and the IEC clause text
    are secondary or paywalled and are cited at the level they were
    verified. Tufte's own scope hedge applies to any erasability-style
    measure: he states the data-ink principle works "for perhaps
    two-thirds of all statistical graphics. For the others, the ratio is
    ill-defined or is just not appropriate" (VDQI p. 96). The
    "denotation-ink" coinage in §1.7 and §4.8 is a **coordinator
    suggestion recorded for the design lane's consideration**, not an
    adopted measure and not the operator's.
11. **The identicon and visual-hash literature did not land in this
    pass.** §3.2's computed-mark options and V-Q4's bit budget rest on
    the general practice rather than on primary sources read this
    session, and that gap should be closed before any computed-mark
    option is chosen.
