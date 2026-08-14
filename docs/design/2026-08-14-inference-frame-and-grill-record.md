# The inference frame, and the grill record that ratified it

Operator grill, 2026-08-13 (coordinator-run, recorded same session).
Authority for the rulings: the type-population dossier
(`docs/design/2026-08-15-type-population-from-data.md`, branch
`worktree-agent-a7077fe80ecb149d8` until merged) and the codegen-services
dossier (`docs/design/2026-08-15-codegen-services.md`, branch
`worktree-agent-acffb764559941aba` until merged). Cycle decision register:
issue #62. This file is the durable record; the dossiers argue, this rules.

## Codegen rulings

**C1 — seam order.** Library import first (`packages/codegen`, existing
consumer `proto/ts/src/mcp.ts`), build-time CLI second, MCP tool third. The
daemon request kind is REFUSED for the flagship.

**C2 — the corrected refusal rationale (supersedes the dossier's
"substrate decides" shorthand).** The schema IS data — and its canonical
data form already exists: the `flb.type.v0` term. The Effect Schema value
is a local projection of that term, recomputed per consumer by the walled
fold (derive-compile-refold-same-digest). A daemon kind serving "the
schema" could only return either the term (pointless — `type.get` exists)
or a serialization of Effect's internal AST — a SECOND encoding of a
meaning the catalog already owns one encoding of, version-coupled to the
`rc.108` pin. Two encodings for one identity is the defect class this
review cycle existed to kill (#31, F5). The stdlib-only Go constraint is
the secondary fact; the second-encoding argument is the law. Corollary,
load-bearing for the foundry and systems-as-data: term → schema is total
and lawful; schema → term is lawful only for the fragment the grammar
names. The grammar is the boundary of what is data; the estate grows the
data fragment by growing the grammar, never by serializing host objects.

**C3 — the MCP tool derives from its own cataloged term.** Codegen's input
shape is published as an `flb.type.v0` term and the tool derives from it
(dossier option b). A hand-written second tool source is refused as the
#43 parallel-table class.

## Type-population rulings (the six dossier questions)

**Q1 — provenance root.** The staged journal's chain head. The corpus is
the journal the bytes landed in (`{"k":"opaque"}` staging); its head
already commits to every `raw_digest` in order. The inferrer cites that
head; no second corpus identity is minted.

**Q2 — the ambiguity report is a journaled evidence record**, with
pre-dialogue semantics: it is a pure function of the corpus, emitted
before any interaction, and it is an immutable snapshot — new data means a
new report citing the new head, never a mutation. Per position it carries:
the decided fragment (tell-tale-equipped positions only), the hole and its
ambiguity class (the dossier's 11-row catalog), what could decide it (more
data / dialogue only / never), the finite candidate set with evidence
counts where one exists, and the ranked questions. Dialogue outcomes are
deliberately NOT in it — answers arrive as `type.fill` moves through the
concierge and are journaled as session evidence. Report = S-state
snapshot; fill stream = where G-moves and human authority live. Two
evidence kinds, one journal, no overlap.

**Q3 — rich holes live in `flb.type.partial.v0`, not the daemon
grammar.** The inferrer's own output language carries width-holes,
optionality-holes, and the F1 classes freely; `flb.type.v0` and its
one-hole-kind tripwire stay untouched; ticket 025 stays deferred with this
ruling as recorded evidence for its eventual grill. Branches collapse to a
concrete term only at certification. The concierge is LICENSED TO PRESENT
GUESSES — refutable candidates scored alongside questions — because a
refuted guess is an equivalence query, the highest-information move (see
frame, below). Refuted guesses persist via the certification corpus
(task 32).

**Q4 — Decode refuses non-round-tripping integers.** Same law as the
ratified u64 ruling: stated domain, typed refusal beyond it. A silently
rounded number on a path that feeds inference and digests is the
refuse-don't-substitute class.

**Q5 — ranking is an advisory layer over the frontier.** The frontier
stays grammar-derived truth (no-dead-ends law intact); the corpus-derived
ranking is an evidence-derived ordering hint the concierge may apply for
presentation. Data prioritizes; it never filters legality.

**Q6 — `opaque` stays bare.** Labels on opaque would smuggle S-information
(what data happened to show) into a G-position (what the type claims).
Candidate sets are evidence and live in the journaled report.

**Q7 — approximate breadth remains an unratified dormant fallback.** It has
no effect on `flb.type.v0`, `flb.type.partial.v0`, frontier legality, ranking,
Task 32 certification records, or certified outcomes, and no experimental
machinery is licensed while it is dormant. Reopening requires all of: a
concrete consumer, a named infinite-domain position, demonstrated failure of
the exact policy for that consumer, and a proposed measurable loss budget
with an external oracle. Meeting that gate authorizes a new operator grill,
not implementation. That grill must decide generator support versus a
concrete type term, the target family, subset-only error, the loss measure,
stopping evidence, and separation from identity and certification. There is
no scheduled reconsideration; the option is event-triggered only. The
literature synthesis records why the cited approximate-breadth theorem does
not itself supply finite-time certification or establish applicability to
the full current family.

## The frame these rulings implement

Kept here because the rulings are corollaries of it, and the operator
flagged it as crucial to understand.

**The ordering.** Types are ordered by denotation — set inclusion of
accepted values. The space of candidates is a lattice; `opaque` is its
top.

**The version space.** After any corpus, the types still consistent with
every example form an interval on that lattice: floor S (most specific
consistent — exactly the union of values seen) and ceiling G (most
general consistent). A hole in `partial.v0` denotes this interval — one
hole IS every open branch at once, held exactly, no enumeration, no
approximation. This is what "the frontier virtualizes" means, made
precise.

**The asymmetry theorem.** Positive examples move S up only. No positive
example can ever move G down, because any value consistent with a specific
type is consistent with every more general one — `opaque` agrees with
every observation that will ever be made. On data alone, G is pinned at
`opaque` forever. An inferrer that claims otherwise is lying; the honest
one emits the S-side as decided fragments and reports the interval as a
hole.

**Angluin's tell-tale (why some positions still decide).** A type is
learnable from positive data alone iff it has a finite tell-tale: a finite
observation set no smaller candidate in the class also explains. `bool`
has one ({true, false}); `string` has none — any finite sample of strings
is explained by the literal-union of exactly those strings AND by
`string`, and no future positive example separates them. Run the test over
the thirteen node kinds: the data-decidable fragment is exactly the finite
types (null, bool, literal, finite unions, closed structs over them).
Everything else is undecidable by construction, not by algorithmic
weakness. The MVP is sized by this number.

**Refutation is the only G-mover; guesses are its strongest form.**
Negative evidence — a certifier refusal, a human "no" — cuts the interval
from the top. Every structural refusal is a minimal counterexample whose
(Law, Path) pair is a precomputed G-refinement: this is the
learning-by-refutation thesis running in the inference direction. In
Angluin's teacher model, asking "is it a string?" is a membership-style
query; presenting a candidate and being corrected is an EQUIVALENCE query,
and its counterexample collapses more of the interval than any question.
Hence the guess-license (Q3), conditional on the wrongness coming back as
a typed, journaled refutation — which is what task 32 persists.

**Where probability enters, and where it is forbidden.** The lattice is
exact: no branch consistent with evidence is ever dropped, so truth never
touches statistics. Attention — which question or guess to spend the next
interaction on — is decision under uncertainty: a prior over the interval
(informed by corpus shape and by provenance: who sent the data, how it
arrived), each candidate move ranked by expected version-space collapse.
A wrong prior costs interaction order, never soundness. This is Q5's
division of labor: exactness for legality, probability for priority.

**The machinery map.** The report is a snapshot of (S, G) per position;
a fill is the human committing the collapse; the certifier is the referee
whose refusals are the negatives; the certification corpus is where the
negatives accumulate, content-addressed so one journal's refutations
become every future session's precomputed G-moves; and the ranking layer
is the only place a prior lives.

## Consequences

The type-population MVP's contract is now fully decided: zero daemon
verbs, staged-journal provenance (Q1), journaled pre-dialogue report (Q2),
rich holes client-side with certification-time collapse and guess-license
(Q3), integer-fidelity refusal (Q4), advisory ranking (Q5), bare opaque
(Q6). The codegen promotion's first slice is likewise decided (C1–C3).
Both dossiers can dispatch once their branches merge. Priority ruling by
the operator, same session: the tool comes first — the frame is recorded
here so the build does not have to re-derive it, and academic depth beyond
what the build needs is deferred.
