# Implication refusals, formalized: the arrow is a declared relation with a scope, not a transition

Session note, 2026-08-14. Companion to
`2026-08-14-learning-limits-literature.md` (which proposed, at §7.4,
extending `flb.certification.v0` with "(Law, Path→Path) pairs") and to the
audit of that proposal delivered against issue #64 this session. The audit
concluded that the ICE analogy was hand-waving because no domain, relation,
or teacher check had been selected. This note does the selection work: it
states the ICE signature precisely, adjudicates every candidate
instantiation in the estate, proves a small lemma about why the ground
(concrete-pair) reading can never earn a seat, defines the object that
survives, and derives the walls that would make it testable. One shipped
defect was found and **verified by execution** along the way (§5).

Mechanized companion: `verify/implication/` — the collapse lemma (§2)
and the projection walls (§5, §8.3) in Lean 4 (no `sorry`) and TLA+,
with the shipped constructor refuted by TLC as a faithless control and
the repaired rule proved/checked clean; `run.sh` is the five-verdict
gate, and the claim is ledgered in `VERIFICATION.md`.

Discipline: every repository claim carries file:line, read on `main` at
`21d77220c` this session. Literature marks: **[verified-this-session]**
(read in primary text this session, by this session's audit),
**[inherited]** (cited by an estate doc whose lane read it), **[unverified]**
(stated from general knowledge; must be read before load-bearing use).

---

## 0. Verdict, one paragraph

The bare pair `Path→Path` is uninterpreted, exactly as the audit said — the
four glosses it listed are four different relations and the path pair
distinguishes none of them. But the repair is not to abandon the idea; it is
to notice that the arrow was never the object. The object is a **relational
law**: a law whose truth condition spans two or more paths of the submitted
term. The grammar already contains at least four of them, enforced today at
`walk.go:170-283`, and the certifier already computes their two-path facts
and then projects them onto the single-path refusal shape — in one case
projecting into the wrong coordinate system, which is a shipped, reproducible
W7 violation (§5). ICE-style *ground* implication counterexamples (concrete
pairs witnessed by a transition relation) are provably redundant here,
because foldlab's certifier decides membership pointwise (§2). What survives
of ICE is one idea — deferred blame between two coordinates — and the honest
literature home for the machinery is constraint acquisition, not invariant
synthesis (§7). Recommendation A on issue #64 stands, strengthened: freeze
`flb.certification.v0` as `{Certified | Refused}`, reserve nothing, and gate
any future relational-refusal kind on the preconditions in §8.

---

## 1. The ICE signature, stated so it can fail

ICE (Garg, Löding, Madhusudan, Neider, CAV 2014
**[verified-this-session]**, DOI 10.1007/978-3-319-08867-9_5) is a game with
four pieces:

- a domain `D` of concrete configurations;
- an unknown target and a candidate `H ⊆ D` proposed by the learner;
- a relation `R ⊆ D × D` known to the teacher (the program's transition
  semantics) — **the teacher's knowledge is relational**;
- a teacher who checks the candidate against `R` and, on failure of
  inductiveness, returns a concrete pair `(x, y) ∈ R` with `x ∈ H`,
  `y ∉ H`.

The pair is a *disjunctive constraint on every future candidate*: exclude
`x` or include `y`. Crucially, the teacher cannot decide membership in the
target invariant — if it could, there would be nothing to learn. Its power
is exactly and only `R`.

The transfer question is: choose `(D, H, R, teacher)` in foldlab so that a
`(Law, Path→Path)` record is a sound implication counterexample. §3
enumerates the candidates. First, a lemma that kills half of them at once.

## 2. The collapse lemma: a decidable certifier leaves no seat for ground implications

**Lemma.** Let the teacher's knowledge be a *decidable unary predicate*
`A ⊆ Terms` (here: certifiability at a pinned grammar digest and catalog
head — total and deterministic, `certify.go:18-42`). Then every sound
evidence object of the form "the pair `(x, y)` constrains candidates
disjunctively" that this teacher can emit is a function of the two ordinary
answers `A(x)`, `A(y)`. A pair-valued evidence kind changes no learnability
boundary and improves no query bound by more than the constant factor 2.

*Proof.* Soundness means the emitted constraint holds of the target. The
teacher's only access to the target is `A` (it holds no other relation), so
the constraint it emits must be entailed by facts of the form `A(t)` for
finitely many terms it has evaluated — in the implication shape, by `A(x)`
and `A(y)`. A learner with query access to `A` obtains both facts with two
queries and derives the same constraint itself. Hence any protocol using the
pair kind is simulated, at ≤2× the queries, by the protocol without it. ∎

The contrast with ICE is the precondition: ICE's teacher *cannot* decide the
target pointwise; its relation `R` is knowledge the learner cannot
reconstruct from membership answers. This is the same collapse the referee
pass already forced once at the other end of the literature doc — "a
decidable predicate on the hypothesis space is not an oracle"
(`2026-08-14-learning-limits-literature.md:287-289`, the withdrawn NCEx
claim). The two withdrawals are one theorem: **against a decidable
certifier, no evidence kind about concrete term pairs can carry information
beyond its unary projections.** Any value a two-path record has must
therefore be *universal* (about the grammar), not *ground* (about two
submissions). That is the fork everything below follows.

## 3. The four readings of the arrow, adjudicated

The audit listed four possible meanings for `fields/a → fields/b`. Each is
now either killed by the lemma, deferred to a different channel, or absorbed
into the surviving object.

**(i) Transition over authoring states.** The estate does have a genuine
transition relation: session fill/unfill steps over partial terms
(`walk.go:139-141` even records that fill/unfill at a path are exact
inverses). Take `D` = partial terms, `R` = fill steps, `H` = "viable"
states. But viability with respect to the grammar (a hole admits a closed
completion) is decidable by the certifier, so the lemma applies: an
implication counterexample `(u, u′)` teaches nothing the frontier does not
already say pointwise. Viability with respect to *intent* is precisely what
no oracle in the system has (the completeness gap, literature doc §9).
Dead on both branches.

**(ii) "Filling a causes b to become legal."** Frontier dynamics — the same
domain as (i), same collapse. Dead as evidence; it is the *consumer* side
(§6), not a refusal.

**(iii) "Evidence at a constrains the hypothesis at b."** A statement about
the learner's bookkeeping, with no truth condition on the teacher's side.
Not an evidence object at all; nothing to put on a wire. Dead as a refusal
kind.

**(iv) "If the term is thus at a, it must be so at b" — a law whose truth
condition spans two paths.** This one is universal (about every term in the
language, not about two submissions), so the lemma does not touch it, and it
turns out to be *already shipped*. It is the surviving object. §4 defines
it.

One more candidate the audit's table did not list, recorded for
completeness: the only genuinely *relational* knowledge the daemon holds is
the **catalog DAG** — `ref` resolution relates a term coordinate to a world
coordinate. The estate already ships refusals over that relation: the
absence-sorted kinds (`unknown-ref`, `refusal.go:41`), whose second
endpoint is the catalog head that later presence repeals. Read this way,
**absence refusals are the estate's existing two-endpoint refusals** — one
endpoint a path, one endpoint a world state — and issue #64's required
`catalog_head` field is exactly the discipline of recording the second
endpoint. No new kind is needed; the precedent is instructive because the
second endpoint there has a *defined coordinate system*, which is what
`Path→Path` lacked.

## 4. The surviving object, defined

**Definition 1 (paths as address expressions).** A path `π` is a sequence
of edges per `proto/wire/CONTRACT.md:56-58` (`of`, `base`, `fields/<name>`,
`of/<index>`, `optional/<index>`, envelope prefix `structure`). Paths are
total as syntax; evaluation `t|π` (the subterm of closed term `t` at `π`)
is partial. Write `Exists(t, π)` for definedness. A path with no inhabitant
is not meaningless — `Exists(t, π) = false` is a decidable fact about `t` —
which dissolves the audit's "a nonexistent subtree has no coordinate"
objection *for paths into the submitted term*. (It stands for subtrees of
terms that were never submitted; nothing below refers to any such thing.)

**Definition 2 (coordinate law).** Every refusal path addresses the
**submitted** term: the walk runs before normalization
(`catalog.go:138` vs `:164`), so submitted coordinates are the only
coordinate system a refusal may report. This has never been written down;
§5 shows one constructor violating it.

**Definition 3 (relation bias).** A *bias* `B` is a finite set of named
relations, each `ρ` with an arity, a *scope pattern* (which path tuples the
law ranges over — possibly value-dependent), and a decidable evaluator
`⟦ρ⟧(t, σ) ∈ {0,1}` that is a function of the submitted bytes alone. (The
name is constraint acquisition's: the bias is the declared vocabulary of
relations a learner may be taught; see §7.)

**Definition 4 (relational law; relational refusal).** A relational law is
a pair `(lawId, ρ)` with `ρ ∈ B` such that the grammar entails
`∀ t ∈ L(G)`, for every in-scope tuple `σ`: `⟦ρ⟧(t, σ) = 1`. A relational
refusal is a record `(lawId, σ)` asserting two separable things:

- **instance falsity** — `⟦ρ⟧(t_submitted, σ) = 0`, a fact about the
  submitted bytes alone (hence *structural* in the #18 sort: catalog-
  invariant, permanent evidence, corpus-admissible);
- **law validity** — the universal entailment above, a fact about the
  grammar, not the submission.

The refuted class is `{ t : ⟦ρ⟧(t, σ-pattern) = 0 }` — a universal
counterexample in exactly the sense the fine-grainedness theorem gives the
single-path `(Law, Path)` (`2026-08-14-learning-by-refutation.md` §1.1),
with the path generalized to a scope tuple. **The arrow contributes
nothing; the declared `ρ` is the entire semantics.** `fields/a → fields/b`
under Definition 4 is ill-formed until a `lawId` names which relation the
pair instantiates — which is the audit's central objection, now a theorem
of the definition rather than a complaint.

On decidability of law validity: for walk-enforced laws it holds *by
construction* — the walk is the definition of `L(G)`, so any law the walk
enforces is entailed definitionally. No general entailment checker is
claimed or needed; note that subtree equality at two positions is not a
regular tree relation (tree automata cannot compare siblings —
**[unverified]**, standard, TATA ch. 1), so a general checker would be
nontrivial. The walls in §6 therefore check *report coherence* and
*cross-implementation agreement of the evaluator*, not abstract entailment.

**Finding 1 (the bias is already inhabited).** Four shipped laws are
relational under Definition 4, all verified at file:line on `main`:

| proposed lawId | evaluator `⟦ρ⟧(t, (π₁, π₂))` | scope pattern | site |
| --- | --- | --- | --- |
| `union-member-uniqueness` | `¬ byteEq(canon(nf(t|π₁)), canon(nf(t|π₂)))` | `π₁ = ν·of/i`, `π₂ = ν·of/j`, `i ≠ j`, `ν` a union node | `walk.go:170-176` |
| `optional-name-declared` | `t|π₁ = "a" ⟹ Exists(t, ν·fields/a)` | `π₁ = ν·optional/i`; `π₂` **value-dependent**: `ν·fields/⟨t|π₁⟩` | `walk.go:266-270` |
| `optional-name-uniqueness` | `t|π₁ ≠ t|π₂` | `ν·optional/i`, `ν·optional/j`, `i ≠ j` | `walk.go:271-275` |
| `optional-order` | `utf16Less(t|π₁, t|π₂)` | adjacent `ν·optional/(i−1)`, `ν·optional/i` | `walk.go:279-283` |

`optional-name-declared` is the exact shape §7.4 wanted: an existence
implication between two paths — "if this name is at `optional/i`, a
declared field of that name must exist" — shipped, sound, and currently
reported as a single-path projection. `optional-order` shows scopes need
not be implications at all (a strict order is not Horn). The bias, not the
record shape, is where the variety lives.

## 5. The mislocation defect: what the missing definition already cost

Because the refusal shape forces one `Path`, every relational law's
constructor projects its scope to a single path. Definition 2 says the
projection must land in submitted coordinates. The union-uniqueness
constructor does not: it sorts a local copy of the members by canonical
bytes (`walk.go:167-169`), detects the duplicate at an index **of the
sorted copy**, and reports that index as a path into the **submitted** term
(`walk.go:172`), with `Got` set to the **normalized** member
(`walk.go:174`), not the submitted bytes at any coordinate.

**Verified by execution this session** (in-package probe against
`walkStructure`, since removed; transcript in the session log). Submission
`{"k":"union","of":[{"k":"string"},{"k":"string"},{"k":"bool"}]}`:

```
law  = "flb.type.v0: union members must be unique after canonical-byte sorting"
path = structure/of/2          got = {"k":"string"}
submitted term at structure/of/2 = {"k":"bool"}
```

The true scope in submitted coordinates is `{of/0, of/1}` (the two
strings). The report names `of/2`, which holds `bool` — so `Path` and `Got`
contradict each other, `Path` lies outside the scope entirely, and the
`Example` field teaches a repair at a position that was never wrong. A
control submission already in canonical order (`[bool, string, string]`)
reports coherently, which is why every fixture and test passes: the
fixtures submit sorted unions. W7's sentence — path locates the violation,
got is what arrived there (`proto/SPEC.md:53-56`) — is violated on `main`
for every duplicate-bearing union whose submitted order differs from
canonical order.

Three remarks, sized honestly. First, this is a genuine bug but a
boundedly harmful one: the refusal still refuses, soundly; what breaks is
the teaching payload and any corpus keyed on `(Law, Path)` — the key would
bin the same mistake under coordinates that depend on where the *sorted*
copy put the duplicate. Second, the cause is exactly the absent definition:
nobody had written down what the path of a two-path fact means, so the
constructor chose a coordinate system by accident. The formalization did
not merely describe the code; it found the divergence on its first contact
with it. Third, the fix (report the second duplicate's **submitted** index,
`Got` = the submitted member's bytes; or widen to the full scope when a
relational kind exists) changes refusal bytes and therefore needs fixture
regeneration authority — it belongs in the #64 pre-build grill, not in a
drive-by patch.

## 6. What the device buys against the depth floor: one edge, sideways, today

The literature doc's §2 sentence — implication refusals are "the one device
against the depth floor … able to refute subtrees not yet hypothesized"
(`2026-08-14-learning-limits-literature.md:97-99`) — is now measurable
against the actual bias. All four shipped relational laws have their entire
scope inside one node's metadata: sibling positions under a single struct
or union node. Committing enough of a term to trigger the law already
commits the shared parent `ν`; the constrained-but-uncommitted position
(e.g. `fields/a` forced by `optional/i`) sits at depth(ν)+1. So under the
current grammar:

> A relational refusal constrains uncommitted structure at most **one edge**
> beyond what is committed, sideways within a node. It shaves additive
> constants off the Ω(depth) round floor; it does not beat it.

The §2 sentence should be read as scoped to biases with long-range
relations — which `flb.type.v0` does not have and which ticket 016's
"graph structure as a predicate on product shape"
(`2026-08-14-learning-limits-literature.md:438-441`) would be the first to
introduce. Pre-registered prediction, falsifiable when 016 lands: the value
of a relational-refusal kind is proportional to the bias's maximum scope
span, and at span ≤ 1 (today) a dedicated wire kind cannot pay for itself.
A corrections entry for the §2 sentence is proposed for ratification, not
applied here (that doc's discipline is supersession by dated section, and
the edit is the operator's call).

There is one buyer even at span 1: **deferred blame**. A two-path scope is
a disjunction — repair `π₁` or `π₂` — and a single-path projection
destroys it and biases repair toward the reported coordinate. That is the
one idea that genuinely transfers from ICE (its pairs also defer the
in/out decision between two points). Whether the disjunction improves
repair yield is an empirical question that ticket 015's benchmark can
carry; it is the only claimed benefit at the current bias, and it is
untested.

## 7. The honest literature home

ICE remains the citation for deferred blame only. The machinery — a
declared finite vocabulary of relations, evidence that names a relation
plus the tuple of positions it binds — is **constraint acquisition**:
QuAcq's bias and scope are these definitions' namesakes, and its
`FindScope`/`FindC` subroutines are what a relational refusal hands over
for free, extending the literature doc's existing "the (Law, Path) refusal
is QuAcq's FindC obtained for free"
(`2026-08-14-learning-limits-literature.md:105-108`) to: **the relational
refusal is FindScope ∘ FindC obtained for free** — the certifier names both
the relation and its scope in one reply. [inherited: Bessiere et al.,
constraint acquisition, cited by the literature doc §2.] The Horn-shaped
middle ground — learning from constraints that are implications between
labeled points rather than labeled points alone — is Horn-ICE (Ezudheen,
Neider, D'Souza, Garg, Madhusudan, OOPSLA 2018 **[unverified]**; read
before citing in anything ratified). Note the direction of the mismatch
with both: in ICE/Horn-ICE the constraints are *ground* (concrete
configurations, teacher-witnessed by executing `R`); here they are
*universal* (grammar-entailed laws instantiated at a scope). The collapse
lemma (§2) is why the ground kind can never matter here; the universal kind
is just laws — which the estate already believes in.

## 8. Consequences

1. **Recommendation A on #64 stands, with a proof where a smell was.**
   Freeze `flb.certification.v0` as `{Certified | Refused}`; reserve no
   implication fields. The reason is no longer "undefined" but "provably
   redundant in ground form (§2), and premature in universal form because
   the record's preconditions (below) are unmet."
2. **Preconditions for any future `relational-refusal` kind** (v1, behind
   ratification): (a) law identity — stable `lawId`s, which is already the
   learning-by-refutation dossier's top obligation (§5.1 there; prose law
   sentences cannot key relations); (b) a declared bias with evaluators in
   both implementations; (c) walls W-COHERENCE, W-EVAL, W-SCOPE below,
   green; (d) a ratified consumer — frontier pruning, which itself waits on
   FINDING-FRONTIER-001's disposition and ticket 025's metadata holes,
   since today's partial grammar cannot even represent the hole that
   `optional-name-declared` would prune (holes occupy `T` positions only,
   `FINDING-FRONTIER-001`). Until (d), the two-path facts keep shipping as
   single-path projections, which are sound once §5 is fixed.
3. **The walls**, stated so each can fail:
   - **W-COHERENCE**: for every `invalid-structure` refusal whose law
     speaks about node content, `canon(t_submitted|path) = canon(got)`.
     *Falsified on `main` today* by §5; becomes green with the fix;
     property-testable by fuzzing submissions.
   - **W-SCOPE**: the reported path of a relational law's refusal is a
     member of the scope, in submitted coordinates, chosen by a
     deterministic stated rule (candidate rule: the scope's last position
     in submitted order — matching the existing "first violation in one
     depth-first pass" discipline). Also falsified today (`of/2 ∉ {of/0,
     of/1}`).
   - **W-EVAL** (the R0/R1 repair): the TS side independently re-evaluates
     `⟦ρ⟧(t_submitted, σ)` from the submitted bytes for every relational
     refusal received and asserts falsity. This answers the audit's "two
     implementations deterministically recording the same invented arrow
     would still be two implementations agreeing on unsupported evidence":
     with a declared evaluator, cross-implementation testing checks
     *recomputed truth of a decidable relation*, not encoding agreement.
     The evaluator is the wall.
   - **W-FRONTIER** (gated on precondition d): committing the committed
     part of a scope prunes the frontier at the uncommitted part by
     exactly the completions falsifying `ρ`. Unbuildable until metadata
     holes exist; recorded so the dependency is visible.
4. **File the §5 defect** as its own issue (found by this formalization,
   verified by execution; fix requires fixture-regeneration authority; the
   sorted-fixture blind spot means the conformance suite needs one
   unsorted-union case regardless of the fix chosen).
5. **Proposed correction, for ratification**: annotate the literature doc's
   §2 depth-floor sentence per §6 — the device's power is bounded by the
   bias's scope span, which is 1 today.

## 9. Provenance

ICE (CAV 2014): primary text read this session by the operator-side audit;
DOI 10.1007/978-3-319-08867-9_5. Constraint acquisition / QuAcq:
[inherited] via `2026-08-14-learning-limits-literature.md` §2. Horn-ICE
(OOPSLA 2018): [unverified], named for orientation only. TATA
sibling-equality non-regularity: [unverified], standard. All `walk.go`,
`catalog.go`, `certify.go`, `refusal.go`, `SPEC.md`, `CONTRACT.md` claims
read on `main` at `21d77220c` this session. The §5 execution transcript:
in-package Go test, run and removed this session; the probe and its output
are preserved in the session log. Verified: `[string,string,bool]` union
submission yields `path=structure/of/2`, `got={"k":"string"}`, while the
submitted member at `of/2` is `{"k":"bool"}`; the sorted control
`[bool,string,string]` reports coherently.
