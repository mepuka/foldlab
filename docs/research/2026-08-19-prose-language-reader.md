# A reader on prose language for the estate

Circulated 2026-08-19, ahead of the prose-register taste sitting. It
prepares that sitting and **rules nothing**. The sitting's rulings are
the operator's; this reader's only job is to hand every seat the same
names, so a ruling can be stated as a ruling rather than as a
preference. Where the taste-pass dossier lays out the five choice
points, this reader supplies the concepts those choices exercise.

Read it once before the sitting. It is short on purpose.

Measurements below were taken first-hand at the branch point
(`origin/main` = `e46ebec`): 66 taught runtime payloads, 51 distinct
minted kinds, 44 roster kinds, 60 draft meanings (16 model reasons +
44 runtime kinds), 22 walked declarations, 8 generators. The dossier
read 64 payloads at `6ef8bf1`; the roster has grown since, which is
itself worth knowing — the corpus of estate prose is a moving body.

---

## 1. What a sentence is here

The estate's prose is not documentation *about* the kernel language.
It is a third concretization of the same abstraction, standing beside
the Lean model and the generated TypeScript — the KM-18 discipline,
which places notation in three lawful homes and no fourth, and demands
that two registers be two renderings of one datum rather than two texts
that happen to agree.

The consequence is the whole reason this reader exists:

> **Prose can be wrong the way code is wrong.**

Not unclear, not off-voice — *wrong*. A sentence that says the merge
converges when the merge accumulates has stated a falsehood about the
algebra, and no amount of polish repairs it. This already happened
once, in the two-register exemplar: a single generic plain-word
template rendered a shard-merge as *"comes to include at least"* — the
join reading — and quietly said something false about an operator that
does not bound, it sums. The finding (N-1) is the estate's proof that
voice can outrun truth without anyone noticing, and it was found by
*running* the renderer, not by reading it.

Three things follow, and they are the reader's spine.

**Prose has an authority, or it has none.** Every sentence on an
official surface answers the question *what makes this true?* The
walked declarations answer "the model's own docstring, read from the
environment, and a missing one refuses the walk." The taught refusals
answer "the model's teaching function, total by construction." The
sixty draft meanings answer "reviewed house data, marked draft until
the sitting rules" — which is why every one of them renders behind a
marker line saying so. A sentence with no answer to that question is
not house prose; it is an unsourced claim on a byte-gated surface.

**Determinism is a prose property.** The printers here emit hard breaks
only and never reflow, so page bytes are not a function of terminal
width; numbers render in minimal decimal with no grouping separators,
because a separator imports a locale and locale is exactly the ambient
input the language refuses. A prose page that re-sorted its rows would
misreport what the value says. These are not typography rules. They are
the same rule the language holds against itself, applied to the surface
that describes it.

**Derivation beats agreement.** Three copies of the eight speech-act
sentences currently agree byte for byte and nothing holds them so.
Agreement between hand-authored twins is the failure mode this estate
names in its walls: two implementations sharing a mistake agree
perfectly. One source, projected, or the surfaces are a consensus and
not a fact.

---

## 2. The verb system

Eight verbs. Everything lawful is one of them or a composition of them.
A verb's meaning is fixed by three things the model actually carries —
the sorts its constructor demands, the checks the door runs on it, and
the refusals that fence it. Those three are derivable. The one-line
gloss is not, and that gap is the first thing the sitting should see.

**What the model says about the verbs, verbatim.** There is exactly one
docstring over the eight, and it glosses three of them by name:

> One lawful kernel sentence: the eight generators, each constructor
> demanding exactly the sorts its licensing law names. `resolve` is
> anchor-free because a digest names one value forever; every
> head-relative read is `fold` at an anchor — the
> immutable/head-relative split carried by the constructors themselves.
> `decide` is commit-with-token: the token's type pins the register, so
> an unfenced or cross-register commit has no derivation.

There is **no per-constructor docstring**. The eight one-word glosses
in circulation — declare is christening, resolve is reading-by-name,
emit is deposition, join is convergence, fold is reading-at-an-anchor,
decide is the irreversible act, trigger is conditional standing, spawn
is delegation — are hand-authored, live in three ungated files, and
derive from nothing. They are good glosses. They are also, right now,
the estate's largest body of unsourced prose about its own grammar, and
the sitting either gives them a source or keeps them as a reviewed
sketch that says so.

**What each verb's meaning is anchored by.** This is the derivable
half — read it as the floor any gloss must stand on.

| Verb | Sorts demanded | The door's own check | Fenced by |
| --- | --- | --- | --- |
| declare | kind, value, writ under a policy digest | argument sweep, then writ-universe containment, then writ catalogued | forward-reference, off-writ-referent, past-mutation, minted-identifier, secret-carrier, closure-introspection |
| resolve | kind, a digest branded by that kind | an anchor present at all is refused; then catalogue membership | anchored-resolve, unverified-read, forward-reference |
| emit | a lane digest, a body value | argument sweep, then lane catalogued | forward-reference, and every unlawful atom |
| join | a resource-cell digest, a contribution, a declared algebra | last-writer-wins refused before anything else; then cell and algebra catalogued | last-writer-wins, forward-reference |
| fold | an index digest, a partition, an anchor typed by both, a query | a missing anchor refuses; an anchor from another fold refuses; then argument sweep | ambient-query-input, cross-sort-identifier, clock-read, absence-claim |
| decide | a program register, a token typed by that register, an outcome | a missing token refuses; a token from another register refuses | unfenced-decide, cross-sort-identifier |
| trigger | one of five monotone predicates, a program declaration | the predicate is checked against the closed five before anything else | absence-trigger, and the four unlawful predicate shapes |
| spawn | a parent policy digest, a request policy digest | the child writ is the meet; escalation is clamped, never refused | (attenuation is a theorem, not a door check) |

Every cell in the two right-hand columns is model text or model
structure. Every gloss in the paragraph above them is not. That asymmetry
is the shape of choice point C2.

**How verb meaning drifts, and how to hear it.** Drift is the same word
doing different work on two surfaces. Three audible kinds:

- **Widening.** A verb picks up a second sense on one surface. *Emit* on
  the model side is deposition onto an evidence lane and nothing else;
  used loosely on a runtime surface it starts to mean "send", which the
  language has no primitive for. The tool sketch already guards this
  explicitly — *"Not a send: no point-to-point primitive exists; lanes
  mean, subjects route."* That sentence exists because the drift was
  audible.
- **Borrowing.** A verb is used for an act the language routes
  elsewhere. *Merge* is the standing trap: it disambiguates into state
  join, shard merge, ordered interleaving, and candidate arbitration —
  four operations at three different rungs, one of which is not an
  algebra operation at all. A sentence that says "merge" without saying
  which has not said anything checkable.
- **Softening.** A verb keeps its denotation but loses its force.
  *Decide* is the one irreversible, priced act in the language; prose
  that uses it for "choose" or "determine" spends the word. Once spent,
  the sentence that needs it has nothing left to say it with.

The test is mechanical, not aesthetic: substitute the verb's anchored
meaning into the sentence. If the sentence stops being true, the verb
has drifted; if it becomes unreadable, the verb was carrying weight it
does not have.

---

## 3. Register, and why the estate has three

Three registers are in use today. They are not three styles of the same
statement. They are three different **acts**, with different obligations
and different audiences, and the reason the estate has all three is that
each buys something the others cannot.

**Performative** — *teaches by enacting*. It puts the sentence in the
mouth of the actor: *"Let this value exist, under the name that is its
own bytes."* It is how an agent learns the language, which is why the
eight speech-act paragraphs are cut into the architecture reference.
Buys transfer. Costs a reviewed phrasing datum per production, and N-1
is the standing proof that a generic template will eventually make one
of them false. Also awkward on values: a sentence that says *let this
value exist* must then name the value, and the name is a thirteen-digit
number.

**Descriptive** — *total, derivable, never false*. A fold over the
constructor and its fields, saying nothing the shape does not already
carry. Buys totality for free: it needs no datum the grammar lacks, so
it cannot say something the algebra does not. Costs voice, and partly
duplicates the encoding table.

**Law-and-repair** — *speaks at the moment of refusal*. Reason, the law
by its real name, the legal next move, and whether the repair is
machine-applicable. Buys the half of the grammar that is already
pinned — sixteen taught rows and sixty-six byte-pinned payloads all
speak this way. Costs the lawful half: it has nothing to say about an
admitted sentence beyond *nothing to repair*.

The dossier renders all three side by side on two real corpus vectors —
a lawful declare and a refused clock-reading fold — and those are the
worked examples. Read them there; they are not repeated here. What this
reader adds is the frame for judging them:

> **A register is a promise about what the sentence owes.** Descriptive
> owes derivability and totality. Performative owes a source of
> authority that is not the printer. Law-and-repair owes the law's real
> name and a next move the presenter can actually make.

Two corollaries the sitting will want:

- **A register is not a tone.** "More formal" and "more readable" are
  not registers. If two texts differ only in tone, one of them is
  redundant.
- **A page may carry two registers if the seam is stated.** The
  dossier's C2(c) is exactly this proposal — performative at the
  grammar level, descriptive at the value level. That is lawful if the
  page says where the seam is. It is drift if the page does not.

There is a fourth act in play that is easy to mistake for a register,
and the sitting should not: the **meaning** field. A law and a repair
speak *at the moment of refusal, to whoever presented the candidate,
about this one presentation*. A meaning speaks *about the reason
itself, standing, to anyone reading the vocabulary*. Same subject,
different act, different audience, different tense. That distinction is
already written into the generated page, and it is the reason the
meaning cannot simply be extracted from the teaching.

---

## 4. What makes generated prose sound good

The craft section. Everything here is measured on the estate's own
corpus, not asserted.

**Parallelism across rows is a feature, not fatigue.** All sixty draft
meanings share one skeleton: sentence one states the fact that was
refused; sentence two states what that closes, joined by *so*. The
measurement: 60 of 60 are exactly two sentences; 58 of 60 use the
literal connective *", so "*. The sixty-six taught payloads share a
stricter skeleton still — kind, law, expected, next — and 57 of 58
repair notes open on an imperative verb. Ritual form carries trust. A
reader who has read three rows knows the shape of the fourth, and can
therefore spend attention on the content instead of the frame. Breaking
the skeleton is a claim that this row is different; make sure it is.

**Fact, then implication.** The cadence is not decoration; it is the
order the reader needs. The fact is what happened or what is; the
implication is what that closes off. Both halves are checkable
separately, which is why the form survives review:

> A trigger fires on silence rather than on a fact. The trigger grammar
> is closed at five monotone productions, so acting on the absence of
> evidence has no production to be written in.

**One idea, one sentence.** The meaning field's one-to-two-sentence
bound is a *form constraint*, in the sense a sonnet's fourteen lines
are: it does not describe the prose, it produces it. The corpus bears
this out — median sentence length nineteen words, shortest five,
longest forty-three. The long ones earn it by carrying a definition
inline; they are the exception the median makes visible.

**Template monotony is a virtue in a table and a lie in a paragraph.**
An inventory, a vocabulary, a verdict list — these *should* read the
same way row after row, because the reader is scanning for the one
field that differs. The moment a template is asked to render a
*meaning* rather than a *shape*, it starts making claims, and a claim
that comes from a template is a claim nobody wrote. That is N-1, in one
line: the generic reading template said something true of join and
false of shard-merge, and the fix was one phrasing datum per operator.
The rule of thumb:

> Templates may render structure. They may not render meaning. Where a
> template must render meaning, the meaning is a reviewed datum the
> template *quotes*.

**Concreteness, always.** The estate says:

> An incarnation is one life of a store — the store a name resolved to
> at the moment a fence was taken against it. A store reborn under that
> name is a different store answering to it and owes nothing to its
> predecessor's fences, so a fence from the dead incarnation names a
> store that no longer exists rather than a round that has merely moved
> on.

It does not say *stale state is invalidated*. The concrete version is
longer and it is better, because every noun in it is a thing the reader
can point at, and because the abstract version is compatible with three
different mechanisms while the concrete one is compatible with exactly
this one. Test: if a sentence would survive replacing its subject with
a different subject, it is about nothing.

**No unowned abstractions.** Every noun in a sentence should be a thing
the language can name. The live counterexample is in front of the
sitting already: *"the environmental band"* appears exactly once, inside
one model-emitted repair, and no type, docstring, generator, or plane
defines it. It reads as vocabulary, so it flowed outward into the
corpus, the generated tables, and a drafted meaning that echoed it for
consistency — one metaphor propagating across four surfaces because it
was shaped like a term. That is what an unowned abstraction costs. The
concepts under it are real and nameable; the phrase is not one of them.
Note also, because the sitting turns on this: the repair text is
*model-emitted*, so changing the words is a model edit riding
regeneration, never a prose tweak.

**Two small mechanical habits, both load-bearing.** Say the number
plainly — minimal decimal, no separators, no abbreviation — because a
grouped number imports a locale and a truncated digest is lossy on a
byte-gated surface. And name the law by its real name; the taught rows
do, and it is the difference between a refusal that can be looked up
and a refusal that must be believed.

---

## 5. Coherence across everything

One vocabulary, many surfaces. The same kind name, the same verb gloss,
and the same meaning sentence surface on the prose page, in a refusal
rendered to a terminal, in a tool schema description, and in an SDK doc
comment. Coherence is not achieved by everyone writing carefully. It is
achieved by there being **one source**, and the estate already has
three working ones:

- **The model's docstrings**, read out of the environment by a walk
  that refuses a missing one rather than defaulting. This is why the
  twenty-two walked declarations cannot drift: nobody types them twice.
- **The taught table**, whose teaching function is total, so a reason
  with no law and no repair cannot exist. The laws and repairs travel
  in the corpus and land verbatim on every surface downstream.
- **The reviewed roster**, which carries what the corpus has no field
  for — the standing meanings — and projects them into the shipped
  union's doc comments and onto the generated page, pinned by the
  vocabulary wall.

Note the split in the third one, because it is the mechanical wrinkle
the sitting must absorb: a meaning for a *model* reason belongs in the
model's own table and reaches the page through the emitter; a meaning
for a *runtime* kind belongs in the reviewed roster. One concept, two
homes, two review paths. Whatever the sitting rules about voice applies
to both, and the ruling has to say so explicitly or the two homes will
diverge on the first edit.

The rule of thumb, and it is the most useful sentence in this reader:

> **If two surfaces need to say the same thing differently, that
> difference IS a register, and it gets a name. If it is not a
> register, it is drift.**

Worked both ways:

- A terminal refusal is terse and a prose page is expansive. Is that a
  register? Yes — and it has a name: law-and-repair speaks at the
  moment of refusal, meaning speaks standing. Two acts, two audiences.
  Named, so lawful.
- The eight verb glosses appear in a projection page and in two skill
  references. Is that a register? No. Same act, same audience, same
  words. Three copies of one text with nothing holding them equal —
  drift that has not happened yet.

The diagnostic question, when a seat proposes new wording for one
surface: *what is the other surface's obligation that makes this
different?* If the answer is a real obligation — totality,
derivability, timing, audience — name it and both surfaces are safe. If
the answer is "it reads better here", the difference is a preference,
and a preference on a byte-gated surface is drift with a good excuse.

A final coherence note about counts. The roster does not currently
agree with itself — kinds in the vocabulary, kinds actually minted, and
kinds carrying meanings are three different sets. That is a finding on
the dossier, not this reader's business, except in one respect the
sitting cannot skip: **a ruling about voice is total only over a named
set.** Ruling "every kind carries a meaning in voice V" requires the
sitting to say which kinds. That is choice point C5, and it is a
counting question before it is a taste question.

---

## 6. The closing checklist

Ten questions to ask of any estate sentence. This is the sitting's
working tool: read a candidate sentence, walk the list, and any *no*
is a specific, nameable objection rather than a feeling.

1. **Does the verb keep its meaning?** Substitute the verb's anchored
   meaning — declare christens, resolve reads by name, emit deposits,
   join converges, fold reads at an anchor, decide lands once, trigger
   stands conditionally, spawn narrows — into the sentence. If the
   sentence stops being true, the verb has drifted. If it becomes
   unreadable, the verb was carrying weight it does not have.

2. **Is every noun nameable?** Can the language name each noun here — a
   declaration kind, a digest, a writ, a lane, a cell, an anchor, a
   token, a refusal reason? A noun the grammar cannot name is either a
   missing declaration or a metaphor. Say which, out loud.

3. **What makes this true, and where does that live?** Every sentence
   on an official surface has an authority: a model docstring, the
   taught table, a reviewed roster row. "It reads correctly" is not an
   authority. A sentence with no source is a claim, not house prose.

4. **Does the sentence survive its register's obligation?** Descriptive
   owes derivability and totality — nothing said that the shape does
   not carry. Performative owes a reviewed source that is not the
   printer. Law-and-repair owes the law by its real name and a next
   move the presenter can actually make.

5. **Could this sentence be false?** Name the fact that would falsify
   it, and where that fact lives. A sentence that cannot be false is
   either a tautology or is not saying anything. If it *could* be false
   and nothing checks it, that is the finding.

6. **Would the parallel row beside it use the same skeleton?** Read the
   row above and the row below. Same opening footing, same order, same
   grammatical rank? Breaking the skeleton claims this row is
   different — make sure it is.

7. **Is it one idea in one sentence, fact then implication?** Two ideas
   welded by *and* usually want a full stop. Three want a table. The
   fact half and the implication half should be checkable separately.

8. **Is the concrete thing named, or its category?** The reborn bucket,
   not the invalidated state. The borrowed sequence number, not the
   consistency violation. If the sentence would survive swapping its
   subject for a different subject, it is about nothing.

9. **Does anything ambient leak in?** A clock, a locale, a grouping
   separator, a path, a command, a ticket number, a machine, a session.
   Prose about a language that refuses ambient inputs may not smuggle
   them in its own spelling.

10. **Where else must this sentence appear — and if it differs there,
    is the difference a register?** Name every surface carrying this
    fact: prose page, refusal rendering, tool schema, doc comment. One
    source, or name the register and what it buys. An unnamed
    difference is drift wearing the clothes of voice.

---

## What this reader does not do

It names no winner among the three registers, rules nothing about the
verb glosses' authority, does not pick a home for the meanings, and
counts nothing toward the roster question. Those are the sitting's, and
the dossier lays them out as C1 through C5 with what each buys. This
reader only insists that whatever is ruled, the ruling can be stated
in these terms — a register with an obligation, a source with an
authority, a skeleton with a reason — so that the next sentence anyone
writes can be judged against it rather than argued about.

---

## Sources read

Tracking-land, so paths are lawful here. Every one was read first-hand
at the branch point; none is quoted at length.

- The model: `verify/kernel/Kernel/Definitions.lean` (the `Act`
  inductive, the door's `admit`, the taught table), `Kernel/Laws.lean`.
- The generated page: `docs/generated/kernel-language.generated.md` —
  16 taught refusals, 44 runtime kinds, 60 draft meanings, the type
  vocabulary.
- The shipped union: `packages/plait/src/truth/RefusalKinds.generated.ts`
  (meanings as doc comments); the roster source
  `packages/plait/scripts/kernel-runtime-refusals.ts` and its wall
  `scripts/refusal-vocabulary.ts`.
- The runtime teachings: `packages/plait/test/RefusalPayloads.taught.txt`.
- The toolkit's two-register page:
  `verify/projections/artifacts/prose.md`.
- The eight speech-act sentences: `verify/kernel/projections/prose.md`,
  with its two skill copies under `.claude/` and `.agents/`.
- The tool-schema sketch: `verify/kernel/projections/tools.schema.json`.
- The KM-18 ruling and the N-1 finding:
  `docs/research/2026-08-18-kernel-model-notes.md`,
  `scratch/km-algebra/two-registers.ts`.
- The taste-pass dossier and the sitting's live line items: the
  register ticket's thread.

— mac writing lane (prose reader)
