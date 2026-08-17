# Dvořák, "Pursuit of Truth and Beauty in Lean 4" — excerpts and estate mapping

Source: Martin Dvořák, *Pursuit of Truth and Beauty in Lean 4 — Formally
Verified Theory of Grammars, Optimization, Matroids*, PhD thesis,
Institute of Science and Technology Austria, March 2026,
arXiv:2602.12891v3.

License: CC BY 4.0. The thesis states its own grant on page 3 — the
contents "are licensed under a Creative Commons Attribution 4.0
International License. Under this license, you may copy and redistribute
the material in any medium or format. You may also create and distribute
modified versions of the work. This is on the condition that you credit
the author." Every block quoted below is verbatim from that work and is
reproduced under that license; credit is to Martin Dvořák. PDF-extraction
artifacts (spurious mid-word spaces, hyphenation across line breaks) have
been repaired; wording, punctuation, and the author's stylizations
(MathematiCS) are untouched. Reference numerals in brackets are the
thesis's own citation markers, retained as printed.

Why this matters: the thesis committee included Terence Tao and Jasmin
Blanchette (co-supervisor), so §1.3 is an outside, expert-reviewed
articulation of disciplines this estate already runs — a trusted-code
boundary drawn around statements rather than proofs, an axiom-footprint
check on the dependency tree, reading a definition's API instead of its
body, and layout as a carrier of conceptual structure. Two of his
techniques are not in our practice yet: the axiom check placed in-file at
elaboration time (`#guard_msgs in #print axioms`) rather than parsed out
of shell output, and a single presentation file that restates every
headline result and pins each restatement to the implementation by
`recall`/`example`. The rest of the value is confirmation: an independent
worker in a different domain arrived at the same rules, which is the
cheapest evidence available that the rules are not house idiosyncrasy.

## Excerpt A — trusted code

§1.3.1 "Truth", PDF pages 19–20. Trimmed to the load-bearing paragraphs;
the preceding history-of-inquiry passage is omitted.

> However, having my result formally verified is not the only requirement
> for achieving the truth. There is also room for potential deception in
> the description of my results and naming of the definitions. I believe
> that a requirement for ultimate truth is not only the absence of lies
> but also the absence of deception.
>
> I should be ready for a potential reader who might assume that I don't
> present my results in good faith. What if I proved something trivial
> but then masked it with misleading notation or misnamed definitions so
> that it looks like a different theorem — one that would look like a
> difficult and valuable result?
>
> There are voices in the Lean community saying that definitions don't
> matter much, only API is important. I disagree. First of all, API needs
> to be built around something. Technically, one could build API only,
> not backed by definitions, but create axioms instead. Since axioms can
> lead to inconsistencies (as a result of which everything is provable),
> I cannot recommend this approach. The only viable approach is to start
> with definitions. Once definitions are written, unlimited layers of
> abstractions can be built around them. Now that we have established
> that we need some definitions, I want to argue that we need good
> definitions. From the pragmatic point of view, present IDEs allow the
> user to click "Go to definition", and it is good if the user can read
> and understand what she finds there. No matter how well the API is
> developed, the definition is still the first thing the user will see if
> she follows the most convenient way to examine the notion in question.
> From the philosophical point of view, we need a basis of trust in the
> definitions.
>
> The trust in definitions brings us to the topic of trusted code. While
> Lean ensures correctness in the sense of logical consistency, there are
> certain parts of the code that the reader must check herself in order
> to make sure that not only the proofs are correct but also the very
> things we proved are correct. We refer to the statements of the final
> results and the definitions they (transitively) depend on as trusted
> code [62]. There are many other definitions in the code, which are used
> only to prove main results and not to state them (they are often used
> in the statements of auxiliary lemmas, but if they are ill-defined or
> mis-stated, it creates issues only for what the proofs of the main
> results depend on and not for what the statements of the main results
> depend on), which means that they don't have to be checked before we
> can believe the main results — we say that these definitions are not
> part of the trusted code (some people, preferring to rather say what
> something is than to say what something isn't, would say that these
> definitions are implementation details; however, the phrase
> "implementation detail" is used with many different flavours,
> subjectively depending on what each person considers to be
> "implementation" and "detail", hence we refrain from the phrase
> "implementation detail" altogether; we will only distinguish what is
> and what isn't part of the trusted code, where the subjectivity goes
> only as far as deciding what the main results are).
>
> In the Seymour project (Chapter 4), trusted code is presented in a file
> Seymour.lean separate from the implementation, because the
> implementation is too large and too complicated for a casual reader to
> browse. In the other presented projects, finding the trusted code
> should be easy enough for a reader who knows what to search for,
> directions for which are present in this thesis in abundance.
>
> The text of this thesis primarily emphasizes definitions, followed by
> theorems, while giving minimal attention to proofs. The reader is
> expected to run the Lean compiler to check that the proofs are correct.
> Occasionally, we will comment on proofs, too, but only when we want to
> highlight a particular proof technique or explain how the proof is
> decomposed into lemmas.

The methodology paragraph that operationalizes the above, §4 "Seymour
project", PDF pages 95–96:

> Our formalization is conceptually split into two parts —
> "implementation" and "presentation". Implementation is contained in the
> Seymour folder and encompasses all definitions and lemmas used to
> obtain our results. Presentation is contained in the Seymour.lean file,
> which repeats selected definitions and theorems comprising the key
> final results of our contribution. Every definition in the
> "presentation" file is checked to be definitionally equal to its
> counterpart from the "implementation" using the recall or the example
> command. Similarly, we recall every theorem presented here and then use
> the #guard_msgs in #print axioms command to check that the
> implementation of its proof (including the entire dependency tree)
> depends only on the three axioms [propext, Classical.choice,
> Quot.sound] which are standard for Lean projects that use classical
> logic. In other words, we identified what is the trusted code, and we
> repeated all nontrivial trusted code in the Seymour.lean file, so that
> our results can be believed.

## Excerpt B — beauty

§1.3.2 "Beauty", PDF pages 21–23. [The autobiographical opening —
childhood drawing classes, Pokémon optimization, undergraduate study at
Charles University, and the turn from pen-and-paper notation to Lean — is
omitted here; the excerpt resumes where that story hands off to the
argument.]

> And this story brings me to the second main philosophical dimension of
> my work — beauty. Roger Scruton [63] said on the subject of beauty:
>
> > "We live in a world which has been, in many ways, uglified — and it
> > is the world we want to redeem, so that we are part of it once again.
> > And our fulfillment is as if it were reflected back to us in the
> > things we encounter, and that is really part of what I mean by
> > 'redemption'. And that is the function of the aesthetic."
>
> Scruton's words point to a deep human need — to experience the world as
> meaningful and harmonious rather than fractured and hostile. It isn't
> merely a decorative claim. Scruton reminds us that ugliness is not
> merely about appearance but about alienation. Ugliness, in this sense,
> arises when form ceases to be transparent to meaning, when the surface
> no longer carries the depth it ought to express. Beauty redeems by
> reuniting form and content, by allowing us once again to recognize
> ourselves in what we encounter.
>
> Mathematical writing always navigates the balance between clarity and
> economy, between the desire for perfection and the pressures of time
> and publication. For many of us, the written culture of contemporary
> MathematiCS has grown inhospitable. Papers often trade precision for
> brevity, hide essential steps behind references or tradition, and
> present arguments in a style that assumes an audience already
> initiated. For the reader, it often results in estrangement; the ideas
> may be profound, but the form obscures rather than reveals them. What
> should be a path towards clarity becomes an experience of
> disorientation.
>
> The practice of theorem proving in Lean offers a form of redemption. In
> this medium, no detail is lost — every assumption is stated, every
> inference justified, every algebra laid bare. In this setting, beauty
> is not an ornament but a structure. It is the alignment of thought and
> expression. It is the absence of gaps where understanding could slip
> away. What once felt elusive becomes visible; what was hidden in the
> shadows of "it is clear that…" now stands plainly in the light. To
> engage with Lean is to step into a world where MathematiCS has regained
> its rigor and transparency. What emerges is a landscape in which the
> reader can truly see the grand outline of the proof and the fine
> texture of its details, coexisting in harmony.
>
> This harmony is deeply satisfying because it answers the very longing
> Scruton describes. To work within Lean is to encounter MathematiCS that
> reflects back to us the fulfillment of understanding, the joy of seeing
> each part in its rightful place. The uglification of opacity and
> omission is replaced by the beauty of transparency and precision. In
> Lean, the proofs don't only convince; they allow us to dwell within
> MathematiCS as something whole, intelligible, and beautiful.
>
> That said, clarity of thought is not all there is on the subject of
> beauty in MathematiCS. There is a full stack of form, from the tactile
> to the transcendental, starting from a good font and a nice color
> scheme, through helpful notation, up to the most abstract mathematical
> beauty.
>
> Beauty begins with what first meets the eye. The font is the opening
> gesture, the frame in which everything else evinces. A good font makes
> no demands; it distinguishes l from 1 and I and |. Its grace lies in
> its invisibility. It doesn't call attention to itself, but allows the
> reader to attend to the structure of an argument without the friction
> of deciphering marks.
>
> I chose JuliaMono [64] because it has exceptional Unicode coverage, the
> symbols are easily distinguishable from each other, and the majority of
> its symbols look similar to corresponding symbols in other fonts, which
> makes the transition from reading other fonts to reading JuliaMono
> relatively easy. The letter r is probably the only character that looks
> a bit weird in it. The way I perceive it, JuliaMono is a font whose
> qualities whisper rather than shout. I use JuliaMono both in IDE and
> for code snippets in this thesis.
>
> Upon this quiet stage, lexical highlighting introduces color. Here the
> page takes on depth; variables, constants, operators, and keywords
> separate into distinct voices. What was once monochrome becomes
> luminous; what was once bleak becomes alive. Meaning begins to shimmer
> towards the surface. The syntax itself starts to breathe, and the
> machinery of logic turns to melody where each symbol finds its own
> rhythm in the polyphony of reason. The eye learns the grammar before
> the mind does; perception leads understanding. Color, then, is not
> embellishment but orientation. It teaches the gaze where to rest and
> where to move, letting the structure of reasoning appear not as a wall
> of text but as a landscape that can be traversed, not just parsed.
> Color softens the entry into precision, giving warmth to the rigor. In
> Lean, lexical highlighting becomes a kind of pedagogy of the senses. It
> trains us to see patterns as music rather than machinery.
>
> One common mistake in the design of a color scheme is setting the
> default color of the text to black on white background or to white on
> dark background. Black on white exhausts the full range of contrast,
> leaving no headroom for emphasis — highlighted symbols then appear
> weaker and, as a result, their intended prominence is diminished or
> even reversed. In IDE, I use light pastel colors on dark background. In
> this text, I use dark colors on white background to optimize this
> thesis for printing. Subtlety respects hierarchy — the colors sing
> rather than scream, guiding the eye without distraction.
>
> If color is the music of syntax, then notation is a choreography of
> thought. It is where the aesthetic of MathematiCS meets the
> architecture of language. A good notation does not merely abbreviate;
> it liberates. It gives form to intuition, allowing complex ideas to
> move with the lightness of a single symbol. When designed with care, it
> carries meaning like a poem carries emotion — precise, structured, yet
> full of resonance.
>
> Custom notation in Lean extends this beauty into the formal realm. It
> allows the mathematician not only to express an idea but to sculpt the
> very language in which the idea lives. Each symbol, each binder, each
> operator becomes a decision about how thought should flow. Poor
> notation interrupts; good notation moves thoughts forward. When the
> notation fits its purpose, one doesn't just read computer code; one
> reads MathematiCS — pure and whole.
>
> In Lean, the discipline of formal precision meets the artistry of
> expressive design. Here we see that beauty and rigor are not
> adversaries but companions. The formalist's demand that every symbol
> have meaning and the aesthete's desire that meaning take elegant shape,
> turn out to be two faces of one pursuit.
>
> Another subjective element of writing code in Lean is that I think it
> is better to not name variables that are used only once. Fortunately,
> Lean allows one to forgo unnecessary names. Temporary constructions or
> one-off functions need not be forced into permanence; they can exist
> just long enough to carry the proof forward. This freedom reduces
> clutter, letting the mind follow the current of the argument with less
> distraction. In doing so, it honors both clarity and elegance — the
> proof breathes naturally, and the eye lingers where the progress truly
> resides.
>
> Another principle I try to follow in Lean is that what belongs
> logically together should also appear visually together. For example,
> the Mathlib definition Matroid.disjointSum doesn't comply with this
> principle because, when called in practical settings, it will look like
> M.disjointSum N hMN for example, making M and N stand far from each
> other, while N and hMN are close to each other visually, without a good
> motivation for such visual presentation. In contrast, the Mathlib
> definition Matrix.submatrix perfectly follows this principle because
> calling it like A.submatrix f g makes the matrix stand on one side and
> both indexing functions stand on the other side (together). The same
> principle extends to larger settings beyond a single line of code, such
> as grouping related definitions together and grouping similar lemmas
> together. In this alignment, the eye perceives the harmony of the
> argument even before the mind has traced each step. Logical and visual
> proximity converge, and the code itself becomes a landscape in which
> understanding flows naturally.
>
> When this visual rhythm stretches through longer passages, it becomes
> apparent that spacing plays a structural role. For greater visual
> separation, two consecutive empty lines work well — they signal a
> genuine shift in thought, a new layer of abstraction, or a pause for
> the reader to reorient. However, they should be used sparingly. Just as
> excessive ornament dilutes beauty, excessive spacing erodes form. The
> code must breathe, but not lose cohesion. When spacing reflects
> conceptual hierarchy rather than mere whim, the reader senses the
> architecture of the argument before even reading the contents. In this
> balance between air and density, visual design becomes a silent helper
> in reasoning.
>
> Beyond notation and visual grouping, beauty in Lean also emerges from
> the principles of good software engineering. Clear folder and file
> structures, reusable definitions, and well-designed abstractions are
> not merely pragmatic conveniences; they are expressions of elegance.
> When the code is organized thoughtfully, proofs become easier to read,
> maintain, and extend, and the relationships between ideas are revealed
> rather than obscured. The discipline of engineering — once seen as
> purely functional — becomes another source of aesthetic pleasure.
> Simplicity, coherence, and composability combine with each other to
> form a system in which logic and intuition move in harmony, and the
> mind can dwell within a landscape that is both rigorous and graceful.
>
> Ultimately, beauty in Lean is felt in the smooth passage from thought
> to expression. When the language, notation, and design decisions allow
> an idea to be encoded almost as quickly as it is conceived, the mind
> encounters minimal resistance. Friction between intuition and
> formalization lightens, the current of reasoning moves more freely. The
> act of formalization becomes a medium rather than a barrier; one can
> move seamlessly from insight to proof, from concept to code,
> experiencing the ideas themselves with minimal distraction or
> interruption.
>
> Lean fully embodies the sense of wholeness. It enforces coherence not
> only as a constraint, but as a promise, that what is written will
> stand, that what is proved will endure. The formal language becomes a
> vessel for the eternal language of mathematics, uniting the mechanical
> and the creative. From the curve of a glyph to the architecture of a
> theory, from syntax highlighting to theorem hierarchies, beauty runs
> continuously through the stack — one harmony, perceived at different
> scales.

## Excerpt C — read the API, not the definition

§2.3.2 "Multiset", PDF page 35. The definition is quoted first so the
discipline has something to bite on.

> We will again need a map function. Its implementation in Mathlib is a
> bit cryptic:
>
> ```lean
> def Multiset.map {α β : Type} (f : α → β) (s : Multiset α) : Multiset β :=
>   Quot.liftOn s
>     (fun l : List α => (l.map f : Multiset β))
>     (fun _ _ p => Quot.sound (p.map f))
> ```
>
> Reading the definition probably didn't illuminate what it actually
> means. Hence, before we proceed to trust the definition, we will
> examine its API to reassure ourselves that it really does what we think
> it does:
>
> ```lean
> theorem Multiset.map_singleton {α β : Type} (f : α → β) (a : α) :
>     ({a} : Multiset α).map f = {f a}
>
> theorem Multiset.map_cons {α β : Type} (f : α → β) (a : α)
>     (s : Multiset α) :
>     Multiset.map f (a ::ₘ s) = f a ::ₘ Multiset.map f s
> ```
>
> The operator ::ₘ on multisets is similar to the operator :: on lists
> (see Multiset.cons_coe for the exact correspondence between them).
> Indeed, Multiset.map does what we expect from it.

## Estate mapping

- **Axiom footprint `{propext, Classical.choice, Quot.sound}`** — the
  same triple the fabric gate enforces. `verify/fabric/run.sh` writes a
  scratch `.lean` file holding one `#print axioms Fabric.<name>` per
  roster entry, elaborates it with `lake env lean`, then parses the
  bracketed lists out of stdout and fails on any name outside
  `^(propext|Classical\.choice|Quot\.sound)$`. DELTA: his
  `#guard_msgs in #print axioms` puts the same check in the source file
  at elaboration time, so it travels with the code and fails for anyone
  who compiles it, whereas ours lives in shell and holds only when
  `run.sh` runs. Candidate defense-in-depth hardening on top of the
  gate, not a replacement for it — the gate also checks roster
  completeness against discovered theorems, which an in-file annotation
  cannot. Note only; no ticket.

- **Trusted code in one file (the `Seymour.lean` pattern)** — cousin of
  the roster plus the verdict-truth binding in
  `verify/fabric/Fabric/Corpus.lean`, where every row constructor takes
  the proof term as an argument (`verdictOfEq (left right) (_ : left =
  right)`, and siblings) so a drifted verdict is a type error rather
  than a wrong emitted byte, with the theorem name carried in the row's
  `witness` field. His form is the half we lack: one presentation file
  that restates the headline claims and pins each restatement to the
  implementation. The transferable shape is a `Results.lean` whose
  claims are checked by `example : stmt := thm`.

- **Descriptive theorems over definition-reading** — Excerpt C is our
  own rule stated from outside: comments state the law rather than cite
  a decision number, and walls are executable statements of what the
  code must satisfy (`docs/LAWS.md`, whose `BOUND` status requires the
  law ID to sit inside the test that binds it). Worth quoting as
  confirmation that the practice is not house idiosyncrasy — an
  independent worker in matroid theory reached the same rule for the
  same reason, that a definition body does not disclose its meaning.

- **Argument-order visual proximity (`A.submatrix f g`)** — a review
  heuristic for the affordance surfaces in
  `docs/design/2026-08-17-plait-effect-affordances.md`: check that the
  `casJoinLoop` options object and the `Replay` builder chains keep
  co-varying arguments adjacent at the call site rather than split by an
  unrelated parameter.

- **Logical-visual grouping and spacing as conceptual hierarchy** —
  matches API log entry 0018 (`docs/design/plait-api-log.md`), which
  rules that a module carries the plain word for its concept
  (`Resource` kept, `Schedule` not minted): the same instinct applied at
  the module boundary rather than the argument list.

- **Unnamed one-use variables** — already house Lean style in
  `verify/fabric`; the proof-term arguments in `Corpus.lean` are bound
  as `_` precisely because they are used once, by the elaborator. No
  delta.

## Further reading

Full text: `C:\Users\kokok\Dev\2602.12891v3.pdf` (thesis-printed page ≈
PDF page − 12). Two chapters are noted for later and not excerpted here:
§5.3 "Closure properties of general grammars" (union, reversal,
concatenation, Kleene star for general grammars, with the note that
concatenation and Kleene star cost far more than the first two) as
reference for the moves/wire-grammar lane; and the Seymour retyping
machinery in §4.5 (`Subtype.toSum`, `Matrix.toMatrixUnionUnion`) as
reference should a carrier-retyping need arise.
