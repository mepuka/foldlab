# Learning by refutation: why an algebraic surface makes better negative examples

FROM OPERATOR-DIRECTED RESEARCH

Author: learning-by-refutation lane (Opus), 2026-08-14, isolated worktree.
Design only — an argument, event shapes, and obligations; no machinery. Consumer-gated
to tickets 003 (the concierge), 015 (the grammar foundry), 016 (the ontology
explorer), and to GitHub issues #17, #18, #19, #35.

This dossier stands on `docs/research/2026-08-14-counterexample-algebra-dossier.md`
and does not repeat it. That dossier established the asymmetry and the algebra;
it also refuted two things the operator's picture wanted, and this one honors
both refutations rather than quietly reinstating them. Where the foundation
dossier's repository findings have since been **discharged on main**, this
dossier says so at file:line, because a finding that has been fixed and is still
being cited is a claim sized wrong.

Discipline, and it is the same one:

- Every repository claim carries file:line, verified against `origin/main` at
  `5a6def847` this session. `origin/main` advanced to `0c0955181` while this was
  being written; that range touches only `LICENSE`, `NOTICE`, `README.md`, and
  `package.json`, none of which is cited below, so every line number here holds
  at `0c0955181` as well. Claims about the unmerged branch `codex/refusal-sorts`
  are labelled as such and carry the commit sha.
- Every literature claim is either **[fetched]** (retrieved and read this
  session), **[inherited]** (verified in the counterexample dossier's session,
  re-cited here with the same URL, not re-read), or **[unverified]**. There is
  one **[unverified]** claim in this document and it is marked.
- Build state: **SHIPPED** (walled or tested in-repo), **RATIFIED-UNBUILT**,
  **BRANCH-ONLY** (built, unmerged), **ASPIRATIONAL**.

---

## 0. The argument in one paragraph

A refusal from a string-typed system tells you that something was wrong. A
refusal from foldlab tells you *which universally quantified sentence* was
violated, *at which node of which tree*, *what arrived there*, *what was
required*, and — for the structural half — *a value that would have been
accepted at that exact position*. That is not a better error message; it is a
different object. Because the grammar is a closed algebraic type — thirteen
tagged kinds, holes only at typed positions, unknown keys and unknown kinds both
refusing (`proto/go/protod/walk.go:19-24`, `:213-221`, `:329-347`) — the walk
that rejects a term returns at the *first* violating node, so the reported path
is minimal by construction rather than by effort. The pair `(Law, Path)` is
therefore a **version-space `G`-boundary refinement, precomputed by the
certifier**: in candidate elimination the expensive step is searching the
refinement lattice for the minimal specialisation a negative example forces, and
foldlab hands that step over as a field. The rest follows: because the refusal
is a canonical JSON value, it has a digest; because it has a digest,
deduplication is free and a corpus of them is a grow-only set under `setUnion`,
whose join laws are now generated property tests
(`packages/core/src/algebra.ts:444-453`; `packages/core/src/foldLaws.ts:209-235`)
— which is exactly the CvRDT condition, so two daemons that have never spoken
merge their negative evidence by union with no coordination. The sort split
(#18) is what keeps that sound: structural refusals are permanent evidence,
absence refusals are head-relative observations a later catalog head repeals.
And the same value that teaches a human — one live transcript shows repair from
`refusal.example` with no docs consulted — is a structured, minimal, machine-parseable
labelled datum of the exact shape a constrained-decoding or self-repair loop
consumes. **The MCP surface is where both readers meet, and today the refusal
crosses that seam undeclared** (`proto/ts/src/mcp.ts:71`). None of the corpus
exists. What exists is the datum, and the datum is the hard part.

---

# PART 1 — THE FINE-GRAINEDNESS THEOREM

## 1.1 The claim, stated as a structural claim

> **Fine-grainedness.** Under a pinned grammar digest, every structural refusal
> the certifier emits is a **minimal counterexample by construction**: it carries
> (i) the *law* — a universally quantified sentence over the grammar, not a
> property of the submitted term; (ii) the *path* — the exact address of the
> first node at which that sentence failed; (iii) *got* and *expected* — the
> observed and admissible values at that address; and (iv) a *witness* — a value
> that would have been admitted at that address. Clauses (i)–(iii) hold for every
> structural refusal in the shipped daemon. Clause (iv) holds for most and is
> **not yet a law**; §1.5 names the gap and §5 turns it into an obligation.

Three words in that statement are doing work, and each is checkable.

**"Minimal."** The walk is one depth-first pass that returns on the first
violation (`walk.go:36-50`, `:52-58`, and every `return structureRefusal(...)`
site). It does not collect a set of complaints and it does not report a subtree.
The path it returns is built by `append(path, edge)` as it descends
(`walk.go:243`, `:299`, `:120`, `:194`), so the reported address is the shortest
prefix at which the term stops being a member of the language. There is no
search and no shrinking step: minimality is a consequence of returning early
from a structural recursion over a closed grammar.

**"By construction."** A string-typed rejection ("invalid schema at offset 214")
localizes a *byte*, not a *node*, and the byte offset is a fact about the
encoding rather than about the term. Under RFC 8785 canonicalization the same
value has one encoding, so the offset would at least be stable — but it still
would not name a position in the *grammar*, and therefore could not name a class
of terms. `Path` names a position in the grammar
(`proto/wire/CONTRACT.md:56-58`: child edges are `of`, `base`, `fields/<name>`,
`of/<index>`; metadata positions refuse), and that is what makes the refusal
transferable to a different term.

**"Universally quantified."** This is the load-bearing one and it is the
foundation dossier's Claim D. `Law` is a *sentence about the grammar*, so a
refusal refutes not the submitted term but the class
`{ b : b violates Law at Path }`. Two examples from the shipped code, both
verbatim:

```
"flb.type.v0: union members must be unique after canonical-byte sorting"   walk.go:167
"C5: holes are authoring-only — a tree containing a hole never enters the
 catalog and never bears identity"                                          walk.go:85
```

Neither sentence mentions the submitted term. Each one, paired with a path, is a
constraint on every candidate the model will ever propose.

## 1.2 The granularity is `(Law, Path)`, not `kind` — and the numbers say so

This is the sharpest thing that can be verified about the surface, and it is not
recorded anywhere in the repository.

There are **nine** refusal kinds (`refusal.go:9-19`;
`proto/wire/CONTRACT.md:134-144`). If `kind` were the unit of information, the
surface would carry at most `log₂ 9 ≈ 3.2` bits per refusal and would be
worthless as a teaching signal. It is not the unit.

Counting the actual law sentences the daemon can utter:

| where | distinct law sentences | note |
| --- | --- | --- |
| `walk.go` (all `invalid-structure`) | **24 expressions at 26 call sites** | one is `fmt.Sprintf`-parameterized by kind (`:345`), and `checkKeys` is called with 13 distinct kinds (`:78`, `:80`, `:91`, `:110`, `:177`, `:198`, `:225`, `:289`), so it instantiates to 13 sentences |
| everything else (`catalog.go`, `concierge.go`, `dispatch.go`, `ingress.go`, `read.go`) | **18 at 18 sites** | no two sites share a sentence |

So one refusal kind — `invalid-structure` — carries **37 distinct law sentences**
(23 fixed in `walk.go`, 13 instantiations of the unknown-key law, and the
concierge's path refusal at `concierge.go:335`), and the daemon as a whole utters
**at least 55**. Crossed with `Path`, which ranges over every reachable
node address in a partial `flb.type.v0` tree, the counterexample space the
certifier can name is unbounded and *structured*. The kind is a routing tag. The
information is in the pair.

**Finding (new, unrecorded).** The estate documents the refusal surface by its
nine kinds — `CONTRACT.md:134-144`, the tangible-examples memo, the external
review's "agents cannot machine-check exhaustiveness over the nine kinds". Every
one of those is about the routing tag. **Nothing in the repository enumerates,
digests, or pins the law sentences**, and the law sentence is the datum the
thesis is about. §5.1 makes this the top-ranked obligation.

## 1.3 The `(Law, Path)` pair *is* the precomputed `G`-refinement

Mitchell's candidate elimination maintains two boundary sets — `S`, the
maximally specific consistent hypotheses, and `G`, the maximally general — and
the algorithm's asymmetry is that **a negative example specialises `G`
downward**: every `g ∈ G` that admits the negative must be replaced by its
*minimal* specialisations that exclude it. [inherited: Mitchell, "Generalization
as search," *Artificial Intelligence* 18(2):203–226, 1982.]

The expensive word there is *minimal*. Finding the minimal specialisation means
searching a refinement lattice: which restriction, applied where, excludes this
one example and nothing more than necessary. In every implementation of
candidate elimination that search is the algorithm.

foldlab does not make the learner search. `Law` is the restriction; `Path` is
where it applies. `Got` and `Expected` bound the restriction from both sides
(what was there, what the position admits). `Example` exhibits a member of the
refined boundary, which is what proves the refinement did not collapse it to
empty.

Stated as the correspondence:

| candidate elimination | foldlab |
| --- | --- |
| negative example `x` | the submitted candidate bytes |
| "which `g ∈ G` admit `x`?" | every hypothesis that permits `Law` to be violated at `Path` |
| minimal specialisation of `g` excluding `x` | **`(Law, Path)`, returned as a field** |
| check that `VS ≠ ∅` after refinement | `Example` — a witness the refined boundary is inhabited |

**Correspondence strength: STRUCTURAL.** The algebra is exact; the semantics
differ in one named way. Candidate elimination's `G` is a function of the
accumulated example set; foldlab's `(Law, Path)` is a function of the *grammar*,
which is stronger in one direction (it is correct before any example arrives,
and it is the same for every learner) and weaker in another (it cannot narrow in
response to what a particular agent has already gotten wrong). The estate has
already ratified that the second half must stay out of the frontier:
`docs/design/2026-08-14-concierge-sessions-and-catalog.md:200-208` — the frontier
is a function of state, never of history, and history-derived advice belongs to
a separate surface computed from the session journal.

## 1.4 Verified against W7's actual contract

W7 (`proto/SPEC.md:53-56`), verbatim:

> Replies teach: every fact carries what to do next (subjects, filled body
> templates); every refusal carries the law sentence that refused,
> `path`/`got`/`expected`/`example` where applicable, and `next` hints sufficient
> for self-repair without external docs.

Note "where applicable". That hedge is the whole audit. Here is every refusal
construction site in the daemon and which W7 fields it actually populates
(verified by reading each struct literal on `main`):

| site | kind | path | expected | example | next |
| --- | --- | --- | --- | --- | --- |
| `walk.go:364-380` (26 call sites) | `invalid-structure` | ✓ | ✓ | ✓ **except `checkKeys`** | ✓ |
| `concierge.go:332-341` | `invalid-structure` | ✓ | ✓ | ✓ (but see §1.5) | — added by wrapper |
| `concierge.go:377-387` | `malformed` | ✓ | ✓ | ✓ | ✓ |
| `read.go:52`, `:83`, `:93` | `bad-journal`, `bad-cursor` | ✓ | ✓ | ✓ | ✓ |
| `ingress.go:48-57`, `:62-72` | `bad-journal`, `malformed` | ✓/— | ✓ | ✓ | ✓ |
| `dispatch.go:86-94` | `malformed` | ✓ | ✓ | ✓ | ✓ |
| `catalog.go:92-115` | `unknown-ref` | ✓ | ✓ | **—** | ✓ |
| `catalog.go:118-128` | `digest-mismatch` | ✓ | ✓ | **—** | ✓ |
| `concierge.go:196-217` | `unknown-ref` | ✓ | ✓ | **—** | ✓ |
| `ingress.go:73-90` | `unknown-identity` | ✓ | ✓ | **—** | ✓ |
| `read.go:135-150` | `unknown-journal` | ✓ | ✓ | **—** | ✓ |
| `dispatch.go:62-76` | `unknown-request` | — | ✓ | **—** | ✓ |
| `dispatch.go:128-153` (3 sites) | `malformed` | — | ✓/— | **—** | ✓ |
| `ingress.go:96-104` | `malformed` | — | — | **—** | ✓ |

**Finding (new, and it is the good kind).** Look at the `example` column. The
five sites that omit the witness *and* are the sites where a witness is
semantically impossible — `unknown-ref`, `unknown-identity`, `unknown-journal`,
`digest-mismatch` — are **exactly the absence-sorted kinds of issue #18, plus
one**. This is not a coincidence and it is not a bug: for an absence refusal
there *is* no value that would have been admitted, because the repair is not a
change to the term but a change to the world (create the referenced type first;
publish a frame to bring the journal into being). The code's `next` hints say
precisely that (`catalog.go:100-108`, `ingress.go:81-88`, `read.go:145-150`).

So: **the presence or absence of `example` is already a shipped, observable
witness of the evidence/absence sort split**, discovered independently by the
authors of each refusal site and never written down. Issue #18 proposes marking
the sort on the kind; the surface has been marking it on the *witness* all
along. That is a stronger signal than a label, because it is forced by
semantics rather than asserted by a table.

`digest-mismatch` is the one exception and it is instructive. It is classified
**structural** on `codex/refusal-sorts` (`refusal-sorts.json`, `refusal.go`
first const block, sha `89292529a`) — correctly, since it depends only on the
submitted bytes — yet it carries no `example`. It could: the witness is the
digest the daemon derived, and that value is already in `Expected`
(`catalog.go:118-128`). This is a one-line W7 improvement and a test of the
thesis: if the fine-grainedness claim is right, adding the witness there should
be indistinguishable from adding it anywhere else.

## 1.5 Two defects the theorem exposes

Both are new, both are verified, and both matter more for the LLM reader than
the human one.

**Defect A — the most likely LLM error carries no witness.** `checkKeys`
(`walk.go:329-347`) is the function that refuses unknown keys on an otherwise
well-formed node. It is the enforcement point for "nodes are strict: unknown
`"k"` refuses; unknown keys refuse" (`CONTRACT.md:148`). Its refusal call is:

```go
return structureRefusal(append(path, extra[0]),
    fmt.Sprintf("flb.type.v0: a %q node carries exactly its declared keys — unknown keys refuse", kind),
    extra, allowed, nil)                                              // walk.go:344-346
```

The fifth argument is the `example`, and it is `nil`. Because `Example` is
`json:"example,omitempty"` (`refusal.go:39`), the field is *omitted from the
wire* — the client sees a refusal with no witness at all.

Now recall the foundation dossier's Claim C: an LLM's hypothesis about
`flb.type.v0` is systematically **over-general**, because the model has seen
vast quantities of JSON Schema, protobuf, and TypeScript type literals, and its
characteristic error is a plausible extra field borrowed from a neighbouring
schema language. **That error lands on `checkKeys`.** The single refusal an
over-general model is most likely to trigger is the one structural refusal that
ships no witness. §5.4 makes this a falsifiable obligation.

**Defect B — `example` is one field with three unrelated types.** It is `any` in
Go (`refusal.go:39`), `Schema.optionalKey(Schema.Unknown)` in TypeScript
(`proto/ts/src/wire.ts:29`), and `"example": ...?` in the wire contract
(`CONTRACT.md:125`). The shipped code puts at least three different kinds of
thing in it:

| site | what `example` is |
| --- | --- |
| `walk.go` (all 25 populated sites) | an **`flb.type.v0` node** that would be admitted at `Path` |
| `concierge.go:339` | a **path** — `[]string{"fields", "name"}` |
| `concierge.go:377-387`, `dispatch.go:86-94`, `ingress.go:62-72` | a **request body** — the whole `{structure: ...}` or `{type, payload}` envelope |
| `ingress.go:53` | a **subject string** — `"flb.ing.data"` |

For a human reading a refusal this is fine; the surrounding `law` sentence
disambiguates in every case. For a machine consumer it is a type error waiting
for a schema. It also breaks the fine-grainedness theorem's clause (iv) as
stated: `refusal.example` is a witness admissible at `Path` in the `walk.go`
cases and something else entirely in the others, so a client cannot write
`retry(refusal.example)` — which is precisely what the shipped smoke test does
(`proto/ts/test/smoke.test.ts:59`) and precisely what issue #17's `outputSchema`
would have to describe.

The honest restatement of clause (iv):

> Every **grammar-structural** refusal from the `flb.type.v0` walk carries a
> witness directly admissible at `Path`, with one exception (`checkKeys`).
> Refusals from the request/transport layer carry an example *request*, not an
> example *value*, and the two are not distinguishable by type.

## 1.6 The clause the grammar does not yet earn

Clause (iv) of the theorem says the refusal names "what the type admits there".
For the *refusal* path this is `Expected`, and it is honest. For the *frontier*
path — the forward-facing half of the same machinery — it currently is not, and
the reason is in the code and in a stopped task's finding.

`buildFrontier` computes `legal` **once, outside the loop over holes**, and
assigns the identical slice to every hole (`concierge.go:124-136`).
`frontierChoices` (`:138-167`) is a hand-written table of twelve fixed kinds plus
`ref` when the catalog has anything resolvable (`:160-165`). Ticket 003 ratified
the opposite — "The frontier becomes a DERIVED artifact: successor states of the
tree automaton compiled from the declared grammar, never a hand-written table"
(`docs/map/tickets/003-the-wrapper-prototype.md:58-60`) — and issue #19 is open
against exactly this.

But `FINDING-FRONTIER-001` (`proto/go/protod/FINDING-FRONTIER-001.md:1-53`), the
stop-and-report from task 28, establishes something stronger and less
comfortable: **`flb.type.partial.v0` has only one hole-bearing nonterminal.**
Every hole occupies `T` regardless of path, the field-name position has no
representation in which a hole can exist, and therefore "there is no truthful red
test that can require these two `Legal` kind sets to differ" (`:26`). The
constant table is not merely unratified — under today's grammar a *derived*
frontier would compute the same constant.

**Consequence for this dossier, stated plainly:** the fine-grainedness of a
refusal is bounded by the granularity of the grammar's positions. foldlab's
refusals are fine-grained in `Path` (every node address is distinguishable) and
**degenerate in `Legal`** (every hole admits the same thirteen kinds). Clause
(iv) is earned on the backward-looking half and not on the forward-looking half.
The disposition FINDING-FRONTIER-001 demands — keep holes only at `T`, add typed
metadata holes, or redefine legality as "admits a closed completion" (`:42-51`) —
is unratified, and it is the operator's call, not this dossier's. §5.7 records it
as an open question.

---

# PART 2 — CONTENT ADDRESSING IS WHAT MAKES NEGATIVES COMPOSABLE

## 2.1 Same refusal, same digest — and what "same" has to mean

A refusal is a canonical JSON value, so it has an identity by the ordinary
machinery: `bytes-sha256-v1`, SHA-256 over RFC 8785 canonical bytes
(`proto/SPEC.md:63-66`; `CONTRACT.md:176-179`). Nothing new is needed to give a
negative example a name.

What that buys, in order:

1. **Deduplication for free.** A thousand agents making the same mistake against
   the same grammar produce one corpus element. No counting, no keys, no
   coordination — the digest is the dedup.
2. **A corpus with an identity.** A set of refusal digests is itself a canonical
   value, so a teaching set has a hash. "Model M, prompted with corpus `c0ffee…`
   over grammar `deadbe…` at catalog head `abc123…`, achieved yield Y" is a fully
   recomputable experimental claim, in a field where the provenance of a prompt
   corpus is normally a paragraph of prose.
3. **A regression suite for the grammar.** Because a refusal is a deterministic
   function of (candidate bytes, grammar digest, catalog head), replaying every
   recorded candidate against a changed certifier produces a diff of exactly
   which previously-refused terms now certify and vice versa.

But (1) is only true if two refusals for the same reason produce the same bytes,
and that is a property of the *element encoding*, not of SHA-256. Two hazards on
the shipped surface:

**Hazard A — the truncation collision.** `decodeBody` reports the offending body
in `Got` via `truncateForReply` (`dispatch.go:130-135`, `:157-163`), which cuts
at 256 bytes and appends `…`. Two different malformed bodies sharing a 256-byte
prefix produce a **byte-identical refusal** and therefore the same digest. For a
`malformed` refusal this is arguably correct behavior (the law and the path are
what teach; the body is context), but it means the refusal digest is *not* an
injection from candidate bytes, and any corpus keyed on the refusal alone loses
the candidate. Whichever element encoding is chosen (§2.4), it must carry the
candidate digest separately — the language-surface record already does
(`docs/design/2026-08-14-the-language-surface.md:153-159`, `candidate_digest`).

**Hazard B — the law is prose.** The corpus key the foundation dossier proposes
is `(Law, Path, candidate digest, grammar digest)`. `Law` is a Go string literal
with no identifier and no version. Rewording a law sentence — an ordinary
docs-quality edit, and one this estate makes often — changes the key of every
archived corpus element that named it, and nothing anywhere would notice. §5.1
turns this into the top-ranked obligation.

## 2.2 The grow-only set: the algebra is now SHIPPED, and the dossier that said otherwise is out of date

The foundation dossier recorded, correctly at the time, that `setUnion`'s
idempotence and commutativity were "unchecked properties of five of the seven
declared primitives" and that the word *semilattice* appeared nowhere in the
repository (counterexample dossier §2.b). **That finding has been discharged.**
Issue #20 — "Generated fold law suite lacks commutativity and idempotence — the
semilattice/CRDT half of the federation claim is untested" — is **CLOSED**, and
the machinery is on `main`:

- `AlgebraLaws` (`packages/core/src/algebra.ts:198-201`) is a two-field record,
  `commutative` and `idempotent`, with the doc comment at `:180-197` stating
  exactly the thesis: "Together they turn a monoid into a join-semilattice, and a
  join-semilattice is exactly the shape that merges without coordination."
- `join: AlgebraLaws = { commutative: true, idempotent: true }`
  (`algebra.ts:400`), claimed by `setUnion` (`:444-453`), `max`, `min`, `any`,
  `all`. The header comment at `:467-473` calls these "the federating half of the
  registry".
- The claims are **generated property tests**, not remarks: `foldLaws.ts:209-224`
  adds a `combine commutativity` case when the algebra claims it,
  `:225-235` adds `combine idempotence`. The comment at `:205-208` states the
  discipline — "The claimed laws are ADDED, never stubbed… a suite that lists only
  what it checked cannot lie by omission."
- `product` propagates the claims conjunctively (`algebra.ts:513-516`), so a
  compound fold over refusals inherits the join only if every member is a join.

**Build state: SHIPPED.** A refusal corpus folded as a set of refusal digests is
not a new algebra; it is `setUnion` at a canonical element encoding, and the
join laws that license coordination-free merge are checked by a test that can
fail.

## 2.3 Federation without coordination

Shapiro et al.'s state-based (CvRDT) sufficient condition is: the state space is
a join-semilattice, `merge` is its join, and every update is inflationary. Under
those conditions replicas converge with no coordination whatsoever — Strong
Eventual Consistency. [inherited: Shapiro, Preguiça, Baquero & Zawirski,
"Conflict-free replicated data types," *SSS 2011*, LNCS 6976, 386–400.]

A grow-only set of structural refusal digests satisfies this exactly, and
`setUnion` now *claims and tests* the two laws that make it a join (§2.2). So:

> Two foldlab daemons that have never communicated can merge their structural
> refusal corpora by union and are guaranteed to agree — no lock, no consensus,
> no ordering.

This is not a new theorem; it is the CRDT result applied to a shipped algebra.
It is also exactly what the estate's own sort ontology already promised:
evidence "federates freely because equal bytes give equal digests anywhere"
(`docs/explanation/theory.md:47-50`). The refusal corpus is the first thing that
would *use* that promise for something other than a catalog.

The scope is a shared **grammar digest**. Ticket 016 already fixed the general
rule and got it right: "Merge is a colimit, not a join (ratified)… Joins remain
the shared-signature special case and inherit the CRDT results"
(`docs/map/tickets/016-the-ontology-explorer.md:43-46`). Union of refusal sets
over the same grammar digest *is* the shared-signature special case. Across
different grammar digests there is no free merge, because the refusals are about
different languages and the alignment between them is a decision.

## 2.4 The sort split is what keeps it sound — and it is built, unmerged, and half-ratified

A corpus that folded all nine kinds together would accumulate **false
negatives**: it would teach an agent that a construction is illegal when the
truth was only that a digest had not landed yet. Catalog lag is the noise
channel, and it hits precisely the kinds that are not evidence.

Issue #18 states the split and the stakes. The estate's build order (issue #22,
ratified 2026-08-14) sequences it as short-term item 2, immediately before item
3, "Refusal persistence: `flb.certification.v0` with required `catalog_head` —
the teaching loop's substrate."

**What is actually built.** Branch `codex/refusal-sorts`, commit `89292529a`
(15 files, +581/−178), **not merged, not on `origin/main`, not on any remote**:

- `proto/wire/refusal-sorts.json` — the cross-language pin:
  `structural: [malformed, invalid-structure, digest-mismatch, bad-cursor,
  unknown-request, bad-journal]`, `absence: [unknown-ref, unknown-identity,
  unknown-journal]`.
- `proto/go/protod/refusal.go` — kinds split into two `const` blocks, a
  `RefusalSort` type, a total `refusalSortByKind` map, `RefusalSortOf(kind)`,
  and the corpus law as a comment: *"a future fold over refusals may admit only
  `RefusalStructural`. Absence is retry-relevant head-relative state, never
  permanent evidence."* The classification is explicitly **server-side only**:
  *"W7's wire refusal stays unchanged."*
- `proto/ts/src/wire.ts` — the mirror, `DAEMON_REFUSAL_SORTS` and
  `refusalSortOf()`.
- The absence kinds' doc comments were rewritten to name the head: `unknown-ref`
  moved from "a ref digest does not resolve in the catalog" to "**at the current
  catalog head**".

**The best thing on that branch is the conformance test, and it deserves to be
named.** `refusal_sort_conformance_test.go` does not assert the labels; it
asserts the *property the labels claim*. `TestStructuralRefusalsAreCatalogInvariant`
drives two daemons — one with an empty catalog, one populated — issues each
structural kind against both, and asserts the reply **bytes are equal**:

```go
if !bytes.Equal(emptyReply, populatedReply) {
    t.Fatalf("structural refusal moved with catalog head: ...")
}
```

`TestAbsenceRefusalsAreRepealedByLaterPresence` is the dual: the same request is
admitted once the missing evidence lands.

That is the operational definition of permanence, and it is strictly better than
a declared sort, because it is falsifiable. A new refusal kind that quietly
depends on the catalog head fails conformance instead of silently entering a
corpus. **Build state: BRANCH-ONLY.**

**And it is half-ratified.** Issue #35 row 1 disputes the choice the branch made:

> **Refusal sort: persisted field or code property?** (task 30→32). #18 offered
> both, neither ratified. Code-only means re-sorting a kind silently rewrites
> archived refusals' meaning. → One spec paragraph: sort is a persisted field;
> kind→sort table frozen per grammar digest.

The branch's own `proto/DECISIONS.md` entry argues the opposite ("server-side…
does not ride on W7's wire refusal", flagged **load-bearing: yes**) and carries a
literal `D??` placeholder where the decision number belongs — the branch never
went through merge, so the number was never assigned. §5.2 puts this in front of
the operator rather than resolving it.

## 2.5 The corpus does not exist

Stated once, plainly, so nothing in Part 2 is mistaken for a description of the
repository. An exhaustive grep on `origin/main` finds no `certify(` entry point,
no `flb.certification`, and nothing that journals, appends, records, or persists
a refusal anywhere. Refusals are constructed by `refuse()` (`refusal.go:44-54`),
marshaled into a reply, and dropped. The only memory of a refusal is the model's
own context window.

Everything in §2.1–§2.4 is the design of a thing that has a decided ontology, a
mechanized definition of permanence, a shipped algebra, and no substrate.
**Build state: ASPIRATIONAL**, with the sort split BRANCH-ONLY.

---

# PART 3 — THE LITERATURE, HONESTLY

The foundation dossier surveys this ground and its citations are not repeated.
What follows is only what this argument needs, with the hypotheses stated and the
two refutations honored.

## 3.1 Gold 1967 — the actual result, not the folklore

E. M. Gold, "Language identification in the limit," *Information and Control*
10(5):447–474, 1967. [fetched: original Table I and Theorems I.4–I.5
read this session.]

The protocol: a learner receives an infinite presentation of a target language
`L` from a known class `C` and emits a guess after each datum; it *identifies `L`
in the limit* if after some finite point every guess is the same correct index.
**Text** presents exactly the members of `L`; **informant** presents all strings
over the alphabet, each labelled in or out.

The result, stated with its hypotheses: a class is *superfinite* if it contains
every finite language over the alphabet plus at least one infinite language. **No
superfinite class is identifiable in the limit from text.** From an informant,
identification succeeds for the regular, context-free, context-sensitive,
and primitive recursive classes, but not for the recursive or recursively
enumerable classes.

Three things the folklore gets wrong and this dossier does not repeat:

- It is **not** "you cannot learn a language without negative examples." It is a
  statement about *exact identification of an index*, in the limit, over a class
  known to the learner, by a computable learner. Angluin's 1980 tell-tale theorem
  gives the exact characterisation of which classes *are* learnable from text —
  and gives a non-trivial one, the pattern languages, that is. [inherited]
- It says nothing about approximation, about PAC-style guarantees, or about a
  learner that is allowed to be wrong on a measure-zero set.
- It applies to the **foundry** (ticket 015, where a grammar is induced) and
  **not** to the concierge (ticket 003, where the grammar is given and pinned by
  digest, so nothing is being identified). The foundation dossier flags this
  conflation as a specific slippage to guard against, and ticket 015's
  ratification 2 — "positive-only description-in/DSL-out is provably unlearnable,
  so the endpoint always runs the refusal round-trip"
  (`docs/map/tickets/015-the-grammar-foundry.md:26-30`) — is stated at exactly the
  right scope.

The mechanism is the part that transfers: a text for `Lₙ` is also a legal prefix
of a text for `L_∞`, so a learner that over-generalises can never be refuted from
text. Positive data cannot say "and not that." Negative data can, and it is the
only thing in the protocol that does.

## 3.2 Angluin's MAT — which half foldlab ships, and where the other half lives

Dana Angluin, "Learning regular sets from queries and counterexamples,"
*Information and Computation* 75(2):87–106, November 1987. [fetched:
bibliographic details, venue, volume/issue/pages, and the summary of the result
confirmed this session; the PDF at
`people.eecs.berkeley.edu/~dawnsong/teaching/s10/papers/angluin87.pdf` would not
extract, so the *verbatim* theorem wording is inherited, not re-read.]

A **minimally adequate teacher** answers two query kinds: a **membership query**
("is `w ∈ L`?") returning yes/no, and an **equivalence query** ("does hypothesis
`H` accept exactly `L`?") returning yes, or no **plus a counterexample** in the
symmetric difference `L △ L(H)`. `L*` identifies any regular set from a MAT in
time polynomial in the number of states of the minimum DFA and the maximum
counterexample length.

The load-bearing observation: membership queries alone cannot identify a regular
set. They explore; nothing forces the hypothesis to be *complete*. The teacher's
superior knowledge enters only through the counterexample, and the number of
equivalence queries is bounded by the state count — **counterexamples are the
only monotone progress measure in the algorithm.**

**Which half foldlab ships today.** The concierge answers membership: a client
submits bytes, the daemon labels them. There is no verb that asks "is my model of
the grammar the grammar?" — the writ is three verbs (`proto/SPEC.md:60-62`) and
the request kinds are five (`dispatch.go:51-62`), none of which is an equivalence
query. **What the concierge is today is a membership oracle plus a hint
channel.**

Ticket 015 carries the obligation as stated: "Theorem to write: the concierge is a
minimally adequate teacher for the grammar universe (frontier decides membership;
every refusal is a counterexample in the symmetric difference)"
(`015:26-30`). Honoring the foundation dossier's finding: **that theorem is not
dischargeable in 015 alone.** MAT is a technical term with two verbs, and
claiming MAT status on membership queries is a category error that Angluin's own
result forbids.

The other verb exists in the estate, in a different ticket. Attribute
exploration's proposed implication *is* an equivalence query restricted to the
implication fragment, and ticket 016 already ratifies both verbs as
theorem-forced: "Two task verbs, theorem-forced (Konev–Lutz–Ozaki–Wolter):
membership and equivalence — neither alone suffices" (`016:30-34`). **The estate
has both MAT verbs and they are in different tickets.** §5.8 records the
consequence.

## 3.3 Version spaces — where §1.3's claim comes from

Mitchell 1982, and the version-space algebra of Lau, Wolfman, Domingos & Weld,
*Machine Learning* 53(1–2):111–156, 2003. [inherited]

The formal content of "the version space narrows" is an antitone Galois
connection: `D ↦ VS(D)` is order-reversing, so more data means fewer surviving
hypotheses — *regardless of the sign of the examples*. Positives and negatives
both shrink `VS`. **Monotone accumulation is not what distinguishes negatives**;
what distinguishes them is Gold's directionality (§3.1) and, in foldlab's case,
the fact that the refinement is precomputed (§1.3).

The version-space algebra's contribution — composing version spaces by union,
join, and transform so a large program space stays polynomial — is the shape a
refusal corpus would need if it ever wanted to be more than a set. It is not
needed for the grow-only claim and is not claimed here.

## 3.4 RPNI and characteristic samples — negatives as merge-vetoes

Oncina & García, "Inferring regular languages in polynomial update time," 1992;
de la Higuera, "Characteristic sets for polynomial grammatical inference,"
*Machine Learning* 27(2):125–138, 1997. [inherited]

RPNI builds the prefix-tree acceptor of the positives and greedily merges states,
**rejecting any merge that would make some negative accepted**. Read what the
negative set does: nothing at all to build the hypothesis. It exists only to veto
merges. *The positives determine the search space; the negatives determine where
the search stops.* Without them the greedy merge runs to the universal automaton
— Gold's over-generalisation trap, as an algorithm.

De la Higuera converts Gold's limiting result into a finite one: for each regular
`L` there is a characteristic set `CS(L) = S⁺ ∪ S⁻`, polynomial in the minimal
DFA, such that any sample containing it drives RPNI to a DFA equivalent to `L`.
There is no such theorem for positive-only samples over the regular class, and by
Angluin 1980 there cannot be.

**What this contributes to the thesis and what it does not.** It contributes the
sharpest available statement of *why* a corpus of negatives is worth
accumulating: negatives are the stopping condition. It does **not** license
"foldlab's refusal corpus is a characteristic set." A characteristic set is
defined relative to a target language and an inference algorithm; foldlab has a
*given* grammar and no state-merging learner. The corpus is a training and
regression artifact, not a characteristic sample, and calling it one would be the
kind of overclaim this dossier exists to avoid.

## 3.5 FlashMeta and witness functions — the closest thing to `refusal.example` in the literature

Oleksandr Polozov & Sumit Gulwani, "FlashMeta: a framework for inductive program
synthesis," *OOPSLA 2015* (Proceedings of the 2015 ACM SIGPLAN International
Conference on Object-Oriented Programming, Systems, Languages, and Applications,
October 2015). [fetched: Microsoft Research publication page, this session; the
ACM DL abstract returned HTTP 403 and page numbers are therefore not cited.]

The framework's stated mechanism, quoted from the MSR page:

> "propagates example-based constraints on an expression to its subexpressions by
> leveraging associated *witness functions*, which essentially capture the
> inverse semantics of the underlying operator."

A witness function answers: *given a desired output at this node, what inputs
could have produced it?* The DSL designer supplies forward semantics and inverse
semantics; the meta-algorithm (the "D4" methodology, data-driven domain-specific
deduction) does the rest, and the paper reports that ten-plus industrial PBE
applications can be recast as instances.

**The correspondence, which is new to this dossier.** `refusal.example` — a value
directly admissible at `Path` — is the output of a witness function at that
node. The certifier already computes, at every position in the grammar, "what
would be admitted here"; that is the artifact FlashMeta requires a DSL designer
to hand-write per operator. `structureRefusal`'s fifth argument
(`walk.go:364-380`) is a hand-written witness table today, one entry per law, and
ticket 003's ratified derived frontier — tree-automaton successor states, "never
a hand-written table" (`003:58-60`) — is the same table computed.

**Correspondence strength: STRUCTURAL.** The algebra matches; the direction
differs and the difference is nameable. FlashMeta's witness functions propagate a
*specification* (an output example) downward to constrain subexpression search.
foldlab's examples propagate an *admissibility fact* outward to a client. There
is no search on foldlab's side and no synthesis; what is shared is the object —
per-node inverse semantics, serialized. Ticket 015 already names the tier
(deliverable 5: "declared serializable inverse semantics per step; anonymous
witnesses refuse identity", `015:43-46`), and this dossier's contribution is only
to point out that the `example` field is the first instance of it already
shipping, undeclared and untyped (§1.5 Defect B).

## 3.6 The LLM-era thread — established, and the two costs

**Grammar-constrained decoding guarantees syntax.** Geng, Josifoski, Peyrard &
West, "Grammar-constrained decoding for structured NLP tasks without
finetuning," *EMNLP 2023*, 10932–10952. [inherited] Masking the sampler with a
formal grammar guarantees the output parses. Established: syntactic validity.
Not established: quality.

**Cost 1 — the distributional cost.** Park, Wang, Berg-Kirkpatrick, Polikarpova
& D'Antoni, "Grammar-aligned decoding," *NeurIPS 2024*. [inherited] Constrained
decoding distorts the model's learned distribution: outputs are grammatical but
appear with likelihoods not proportional to the model's own. Already in
foldlab's ledger as a stated limitation (`015:47-51`; VERIFICATION.md:351-353).

**Cost 2 — the format tax, measured.** Tam, Wu, Tsai, Lin, Lee & Chen, "Let Me
Speak Freely? A Study on the Impact of Format Restrictions on Performance of
Large Language Models," arXiv:2408.02442 (submitted 5 August 2024). [fetched:
abstract retrieved verbatim this session. The paper is commonly cited as EMNLP
2024 Industry Track; the arXiv landing page states no venue, so the venue is
**[unverified]** here.] From the abstract:

> "Surprisingly, we observe a significant decline in LLMs reasoning abilities
> under format restrictions. Furthermore, we find that stricter format
> constraints generally lead to greater performance degradation in reasoning
> tasks."

This is the honest counterweight to the whole design, and it belongs in the
argument rather than in a footnote: **the surface that makes refusals precise is
the same surface that constrains the model's output space**, and constraining
output space measurably costs reasoning. The mitigation is architectural and the
estate already ratified it — the guarantee lives at **admission**, not at
sampling (`docs/design/2026-08-14-the-language-surface.md:298-334`: "The model
proposes; the grammar disposes — at admission, not at sampling"). A model that
decodes freely and is certified at admission pays no format tax and loses no
guarantee; it loses only *yield*. Constrained decoding remains a legitimate
efficiency device and must never be the guarantee.

**Feedback quality dominates repair yield.** Olausson, Inala, Wang, Gao &
Solar-Lezama, "Is self-repair a silver bullet for code generation?," *ICLR 2024*,
arXiv:2306.09896. [inherited] When repair cost is accounted for, gains are
modest, variable, and sometimes absent; the bottleneck is identified as the
*quality of the feedback*, with a stronger model's feedback and human feedback
both producing substantially larger gains than self-generated commentary.

**Principles beat instances.** Zhang, Madaan, Gao, Zheng, Mishra, Yang, Tandon &
Alon, "In-context principle learning from mistakes" (LEAP), *ICML 2024*, PMLR
235. [inherited] Deliberately induce mistakes, have the model reflect to extract
explicit task-specific *principles*, then prompt with the few-shot examples plus
the principles. Gains on GPT-4: +7.5 DROP, +3.3 HotpotQA.

Read together those two are the strongest available case for this design, and
the case is a *hypothesis*, not a result: LEAP shows the useful artifact
distilled from a mistake is a **principle** — a general sentence, not the failed
instance — and Olausson shows that when the model generates that sentence itself,
quality is the binding constraint. **foldlab's `Law` field is a principle
supplied by a certifier rather than distilled by the model.** The design is LEAP
with the reflection step replaced by a theorem. Nobody has run that comparison.
Ticket 015 already asks for it (`015:31-32`, the falsifiable benchmark), and it
remains ASPIRATIONAL.

## 3.7 The two refutations this dossier honors

The foundation dossier refuted two attractive claims. Both stay refuted.

**Break 1 — there is no behavioral specification channel, so this is not CEGIS.**
CEGIS's verifier discharges `∀ x ∈ X. Φ(h, x)`, a universally quantified
behavioral spec over inputs. `certify` discharges well-formedness, identity, and
declared closure laws over the *term*. There is no `∀ x` and no `Φ`. **A term can
certify and still be wrong** — a perfectly legal `flb.type.v0` term that means
something other than what the utterance meant. Ticket 015 names this and refuses
to paper over it: the semantic gap "is irreducible" (`015:47-51`). Anyone
describing foldlab's repair loop as CEGIS without naming Break 1 is overclaiming,
and this dossier does not describe it as CEGIS.

**Break 2 — no convergence may be claimed for an LLM proposer.** Classical CEGIS
convergence rests on the learner being consistent with the accumulated constraint
set *by construction*; a solver cannot re-propose a refuted candidate. An LLM
has no such property: it reads counterexamples as tokens, maintains no symbolic
version space, and can re-propose a refuted candidate at any temperature. Every
published LLM-CEGIS convergence claim is empirical over a benchmark, never a
theorem. **The estate must not claim convergence.** What it may claim is a
monotone *admissibility* guarantee — nothing wrong ever enters the catalog,
however long the model flails — which is a property of the certifier and is
independent of the proposer entirely.

The persistence claim is also refuted and stays refuted: under a pinned grammar
digest, `certify` is total and deterministic, so the accept-set and refuse-set
are equally permanent and equally unbounded. "Negatives grow, positives don't" is
false as stated. The asymmetry is Gold's directionality plus foldlab's own — a
certificate is an existential fact about one term, a typed refusal is a universal
fact about a class. **The typing, not the negativity, is what makes foldlab's
counterexamples worth more than the literature's.**

---

# PART 4 — WHY ONE SURFACE SERVES BOTH READERS

## 4.1 The human evidence, sized correctly

The operator's claim is that a refusal teaches a human with no docs consulted.
The evidence exists and is worth exactly what it is worth.

**The live transcript.** `docs/research/2026-08-14-tangible-examples.md:264-310`
records an executed session: the real `protod` binary over embedded NATS, driven
by the real `ProtoClient` (`proto/ts/examples/refusals.ts`, committed).
Submitting `{"k":"strng"}` returned the refusal verbatim printed at `:272-292` —
`law` = "flb.type.v0: unknown kind refuses…", `path` = `["structure","k"]`,
`got` = `"strng"`, `expected` = the thirteen legal kinds, `example` =
`{"k":"string"}`. The memo then states at `:294-295`: *"Then I resubmitted
`refusal.example` verbatim — no docs, no schema lookup"*, and the reply at
`:297-305` is `ok:true, created:true`. The framing at `:310`: *"This is the whole
idea in two round-trips."*

**The standing test.** `proto/ts/test/smoke.test.ts` asserts the same loop on
every run. The file header (`:1-3`) says the session "repairs itself from
refusals alone — no external docs"; the refusal's fields are asserted at
`:48-55`; the repair is `session.createType(refusal.example as Json)` at `:59`,
under the comment at `:58`: `// it directly. No docs were consulted.`

**How strong is this?** Honestly: **n = 1, uncontrolled, self-reported.** There
is no "with docs" arm, no second operator, and no held-out condition. The
standing test is durable but hard-codes the repair rather than deriving it, and
the "no docs" state is an author's assertion in a comment, not an instrumented
fact. It is a *demonstration that the field is sufficient*, which is a real and
non-trivial thing to demonstrate, and it is not a measurement of teaching yield.
The falsifiable benchmark that would be a measurement is ticket 015's, and it is
unbuilt.

## 4.2 The LLM datum is the same value, and that is the whole point

Restate the refusal's fields in the vocabulary of the machine reader:

| field | to a human | to a model |
| --- | --- | --- |
| `law` | the rule you broke, in a sentence | a **label** — the class the negative belongs to; a LEAP-style principle, supplied rather than distilled (§3.6) |
| `path` | where to look | the **locus**, transferable to other terms |
| `got` / `expected` | what you wrote / what was needed | the **feature and its admissible domain** at that locus |
| `example` | a thing that works, copy it | a **witness** admissible at `path` (§3.5) — a positive datum localized to the refined boundary |
| `next[].body` | your next command, pre-filled | an **executable repair action**, already a valid request |
| digest of the whole | — | the **corpus key**: dedup, provenance, replay |

Nothing is translated between the two columns. The same bytes serve both, and
that is not a convenience — it is a consequence of W8 ("refusals are data:
nothing throws across the seam", `proto/SPEC.md:57-59`). An exception has one
audience. A value has as many as can decode it.

**The tension in the estate's own evidence, and its resolution.** The register
study's finding F8 says audience calibration happens *by document*, not by
hedging: "Every attempt to serve all arrivals in one document degrades all of
them" (`docs/research/2026-08-14-register-study.md:654-657`). The
tangible-examples memo does the opposite and it works — the same executed output
rendered for three audiences. These are not in conflict once the distinction is
drawn: **one artifact, many registers.** The artifact is byte-identical; the
prose around it changes per reader. A refusal is an artifact, not a document, and
it is the artifact both readers consume. The register study's own #2-ranked
pattern is exactly this — "REFUSAL-AS-CURRICULUM — teach the law by triggering it
and printing the refusal verbatim", labelled "foldlab's strongest asset and its
least documented one" (`register-study.md:742-745`).

Its thesis sentence, at `register-study.md:134`, is this dossier's title
restated: *"The reader learns the shape of the concept from the shape of its
refusal."*

## 4.3 What the MCP surface must expose for the signal to survive the trip

This is where the argument becomes an engineering requirement, and there is a
shipped defect at the exact point where the thesis crosses the wire.

**What holds today.** Refusals cross the MCP seam as **data**, not protocol
errors. `proto/ts/src/mcp.ts:1-9` states the discipline; the handler returns
`reply.ok ? reply.fact : { ok: false, refusal: reply.refusal }` at `:84` and
`:87`; both sites sit inside `Effect.promise` (`:78`) which cannot fail, so the
Effect failure channel is never used and **`isError` is never set to true by this
server**. The whole refusal payload — `kind`, `law`, `path`, `got`, `expected`,
`example`, `next`, `local` — arrives intact in `structuredContent`. W8 holds
across the seam exactly as the file claims.

**What does not hold.** Every tool is declared with `success: Schema.Unknown`
(`mcp.ts:71`). Per the MCP deep read's probe
(`docs/design/2026-08-14-mcp-surface-deep-read.md:909-943`), `Schema.Unknown`
renders as `{}` with `type === undefined`, and the pin emits `outputSchema` only
when the success schema's JSON Schema has `type === "object"`
(`repos/effect/packages/effect/src/unstable/ai/McpServer.ts:1286`). Therefore
**no tool the foldlab MCP server serves advertises an `outputSchema`**. The deep
read's sentence at `:622-623`:

> "So the client receives a structured refusal it was never told to expect and
> cannot validate."

A top-level `Schema.Union([Ok, Refusal])` fails the same guard — it renders as
`{"anyOf":[…]}` with no `type` — so the fix must be an object-typed envelope with
a discriminant, not a union. This is GitHub issue #17 (OPEN, zero comments),
promoted from finding F1 of #16, and ledgered as row L1 of
`docs/design/2026-08-14-estate-structures-map.md:263`. The `Refusal` schema the
fix needs is **already imported into that exact file** at `mcp.ts:15` and already
used on the read side by `asRefusal` (`:129-134`). The refutation typing exists
on the decode side and is missing on the advertise side.

**Four requirements, and only the first is currently tracked.** For the learning
signal to survive the trip to an LLM client, the MCP surface must expose:

1. **An object-typed success envelope so `outputSchema` is advertised.** Issue
   #17. Without it, a schema-validating client is never told the refusal branch
   exists, and the spec's "clients SHOULD validate" contract is inert.
2. **A closed enumeration of refusal kinds — and it is not nine.**
   `CONTRACT.md:130-132` declares five *additional* client-local kinds
   (`unreachable`, `malformed-reply`, `verify-failed`, `beyond-v0`,
   `underivable`) emitted by the TS client with `local:true`
   (`proto/ts/src/wire.ts:145-155`). An `outputSchema` enumerating "the nine
   kinds" would be wrong at the seam a client actually sits behind. Fourteen, or
   nine plus a `local` discriminant.
3. **A discriminated `example`.** §1.5 Defect B: three unrelated types in one
   `Schema.Unknown` field. A client that wants to do `retry(refusal.example)` —
   the exact move the smoke test makes — needs to know whether it holds a value,
   a path, or a request body.
4. **A stable identity for `law`.** §2.1 Hazard B and §5.1. Without it the
   corpus key contains prose and an editorial pass silently rekeys the archive.

**And three MCP routes that are closed, so nobody reopens them.** Declared tool
failures flatten to `isError: true` plus one text block with the shape lost
(deep read `:265-271`, `:603-606`). Error codes `-32000`–`-32019` carry no agreed
meaning, so a refusal kind must never be encoded as one (`:785`, `:893-895`).
MCP completion has no refusal channel at all — "A refusal that teaches cannot be
a `-32602`" (`:375-379`). Elicitation restricts its schema to flat primitives, so
a partial `flb.type.v0` tree cannot travel through it, and a non-validating client
turns a protocol type error into a server-side *defect*, inverting W8 (`:466-483`).

---

# PART 5 — DESIGN CONSEQUENCES

Ranked by (damage if wrong) × (cost of fixing later). Each is falsifiable, each
names its owner, and each new obligation carries a pre-registered prediction.
Nothing ratified is redesigned here; where the thesis pressures a ratified
choice, §5.7 and §5.9 say so as questions for the operator.

| # | Obligation | Owner | State |
| --- | --- | --- | --- |
| 1 | Law identity — the corpus key must not contain prose | **NEW** (proposed ticket) | ASPIRATIONAL |
| 2 | Does the sort travel with the datum? | #35 row 1, task 32 | **operator question** |
| 3 | Object-typed MCP envelope + 14-kind enum + typed `example` | #17 (extend) | RATIFIED-UNBUILT |
| 4 | W7 conformance: every structural refusal carries a witness | **NEW** (proposed ticket) | ASPIRATIONAL |
| 5 | Pin one corpus element encoding | #35 row 2, task 32 | unratified |
| 6 | Compaction must refuse across the corpus seam | #35 row 4, #24 | live contradiction |
| 7 | FINDING-FRONTIER-001's disposition | #19, ticket 003 | **operator question** |
| 8 | The MAT theorem needs 015 ∘ 016 | 015, 016 | RATIFIED-UNBUILT |
| 9 | Does W7's "where applicable" tighten? | ticket 015 / SPEC | **operator question** |

## 5.1 (NEW) Law identity — the corpus key must not contain prose

**The obligation.** Every law sentence gets a stable identifier, pinned per
grammar digest, and the corpus keys on the identifier rather than on the
sentence. The sentence stays on the wire, because W7 requires a *sentence* and a
human reads it; the identifier is what the corpus and any hardness map fold on.

**Why it ranks first.** The corpus key the estate is about to commit to is
`(Law, Path, candidate, grammar)` (#35 row 2, from the foundation dossier).
`Law` is today an inline Go string literal at 44 sites with no id, no version,
and no test pinning its text. Rewording one — an ordinary docs-quality edit —
silently changes the key of every archived element that named it. The failure
mode is archaeological, and #35's own regret forecast already names that class of
failure as the one thing this build order was ratified to avoid.

**A second reason.** §1.2 established that the granularity of the surface is the
law sentence, not the kind. If the estate ever wants the hardness map — group
refusals by `(Law, Path-prefix)` and count, to find the constructs agents stumble
on — the group-by key is the law. And that map is not an ergonomics report: W7
says a refusal must be "sufficient for self-repair without external docs", so a
law with heavy refusal mass is *prima facie evidence that W7 is not being met
there*. **The hardness map is a W7 conformance instrument**, and it needs law
identity to exist at all.

**Pre-registered prediction.** If law identity is added — a `lawId` in a table
pinned per grammar digest, with a conformance test asserting the table is total
over every `Refusal` construction site — then (a) at least one law sentence is
found to be duplicated at two sites with different intent, or one site is found
uncovered, and (b) no wire shape changes, because `lawId` need not travel (see
§5.2's question, which is the same question one level down). If neither (a) holds,
the surface is tidier than this dossier believes and the prediction is refuted.

## 5.2 (#35 row 1) Does the sort travel with the datum?

**The question, stated for the operator.** Branch `codex/refusal-sorts`
(`89292529a`) chose **code-only**: two `const` blocks plus `RefusalSortOf()`,
with the wire refusal explicitly unchanged. Issue #35 row 1 argues the opposite:
"Code-only means re-sorting a kind silently rewrites archived refusals'
meaning. → sort is a persisted field; kind→sort table frozen per grammar digest."
The branch's own DECISIONS entry is flagged load-bearing and carries a `D??`
placeholder.

**What this dossier contributes to the question, and it is not a vote.** §1.4's
finding is that the shipped surface *already* signals the sort, through the
presence or absence of `example`, and that this signal is forced by semantics
rather than asserted. That is an argument that the sort is *derivable* rather
than *declared* — which weakly favors code-only, since a derived property does
not need to be persisted. But the derivation is not total (`digest-mismatch` is
structural and carries no witness; three `malformed` sites carry none either), so
it is a heuristic, not a law, and a corpus must not be keyed on a heuristic.

The framing that actually resolves it: the sort of a refusal is a claim about a
*grammar*, not about a *refusal*. It is "at grammar digest `g`, kind `k` is
permanent." That claim's natural home is the frozen kind→sort table pinned per
grammar digest, which is #35's proposal, and which makes the corpus element carry
a *reference* to a pinned table rather than either a bare code property or a
duplicated field. **Recorded as an operator question, not decided here.**

## 5.3 (#17, extended) The MCP envelope, and three fields issue #17 does not yet cover

Issue #17 as filed asks for the object-typed envelope and a test asserting a
non-empty `outputSchema` per tool "and that the refusal branch enumerates the
nine kinds". §4.3 establishes that three further things must be in that schema
for the learning signal to survive:

- **Fourteen kinds, or nine plus a `local` discriminant** — the five client-local
  kinds (`CONTRACT.md:130-132`; `wire.ts:145-155`) are emitted at the seam the
  MCP client sits behind.
- **A discriminated `example`** (§1.5 Defect B).
- **The negative control the issue already asks for**, which is the right shape:
  a test that fails if the envelope regresses to a bare union or `Schema.Unknown`.
  The pin ships the model for it —
  `repos/effect/…/McpServer.test.ts:232`, `assert.isFalse("outputSchema" in
  untypedTool)`, is upstream's own passing assertion that an untyped success
  schema advertises nothing.

**Pre-registered prediction.** Adding the envelope changes no daemon code, no
wire bytes, and no frozen fixture — it is a change to how the TS MCP layer
*declares* what it already sends. If landing it requires touching
`proto/wire/` fixtures or `protod`, the seam is less clean than this dossier
claims and the prediction is refuted.

## 5.4 (NEW) W7 conformance — every structural refusal carries a witness

**The obligation.** Promote W7's "`example` where applicable" from a hedge to a
checked law for the structural sorts: every refusal classified `structural` must
carry an `example` admissible at `Path`, and the conformance suite must assert
it. Absence-sorted refusals must carry none, and that must also be asserted,
because the absence of the witness is the honest statement that no repair to the
term exists.

**Why it ranks here.** §1.5 Defect A: `checkKeys` (`walk.go:344-346`) passes
`nil`, so the extra-key refusal — the exact shape of the over-generality error
Claim C predicts an LLM will make most often — ships no witness at all. Three
`malformed` sites in `dispatch.go` (`:128-153`) and one in `ingress.go`
(`:96-104`) are in the same position. `digest-mismatch` could carry one trivially
(§1.4).

**Pre-registered prediction.** If the W7 witness gate is added and the missing
witnesses supplied, then in a repeated typo-repair exercise against the daemon
the extra-key case will show a measurably higher one-shot repair rate than it
does today, and it will be the *largest* improvement of any single law, because
it starts from no witness at all. If extra-key repair is already near-ceiling
without the witness — because `expected` (the allowed key list) is enough — the
prediction is refuted and clause (iv) of the fine-grainedness theorem is weaker
than argued: `expected` alone would suffice and `example` would be decoration.
**That is a genuinely uncertain call and it is the cheapest experiment in this
document.**

## 5.5 (#35 row 2) Pin one corpus element encoding

Two incompatible shapes circulate and neither carries a sort field: the
foundation dossier's `(Law, Path, candidate, grammar)` and the language surface's
`flb.certification.v0 Refused { candidate_digest, grammar_digest, catalog_head,
outcome{kind, law, path, got, expected, example} }`
(`docs/design/2026-08-14-the-language-surface.md:153-159`). §2.1 adds two
constraints either shape must satisfy: the candidate digest must be carried
separately (Hazard A — the 256-byte truncation makes the refusal non-injective in
the candidate), and the law must be referenced by identity, not by text (Hazard
B / §5.1). `catalog_head` is already required and already argued
(`the-language-surface.md:230-243`); #35 row 3 fixes its provenance —
daemon-journaled, never client-asserted.

## 5.6 (#35 row 4) Compaction must refuse across the corpus seam

Issue #24 ratified compaction-refuses-until-seam. `compact` ships today as a
public export with no guard, and the sessions design defines compaction as
wholesale prefix-discard with no refusal carve-out:
`docs/design/2026-08-14-concierge-sessions-and-catalog.md:667-673` — "replacing a
prefix by its `(head, fold state)` pair, which for a session means keeping the
head and the partial and **discarding the moves**." Refusals live in the session
fold's *kernel* (`:146-150`, `:175`), which is among the moves. A background
compaction would therefore discard exactly the corpus this dossier argues is the
system's accumulating asset. #35 row 4 names the module that must refuse; this
dossier only adds the stake.

## 5.7 (operator question) FINDING-FRONTIER-001's disposition

Clause (iv) of the fine-grainedness theorem is degenerate on the forward-looking
half (§1.6): every hole admits the same thirteen kinds, and
`FINDING-FRONTIER-001` establishes that this is *grammatically forced*, not an
implementation shortcut. The three dispositions it demands (`:42-51`) — keep holes
at `T` and narrow issue #19's premise; add typed metadata holes; or redefine
legality as "admits a closed completion" — are unratified, and the third is what
ticket 003's PREFIX PROPERTY already ratified in spirit ("every offered fill
admits a closed completion, discharged mechanically as tree-automaton emptiness",
`003:53-56`).

**This dossier does not choose.** It records only that the thesis' fine-grainedness
claim is bounded by whichever is chosen: option 1 caps `Legal` at path-invariant
forever; option 3 makes `Legal` a function of the partial and earns clause (iv)
without new grammar. **Open question for the operator.**

## 5.8 (015 ∘ 016) The MAT theorem is not dischargeable in 015 alone

§3.2. Ticket 015's obligation — "Theorem to write: the concierge is a minimally
adequate teacher" (`015:26-30`) — requires two verbs and the concierge supplies
one. The equivalence verb exists in ticket 016 (`016:30-34`). The consequence is
sequencing, not redesign: either 015's theorem statement narrows to "the
concierge is a membership oracle with a precomputed refinement channel" — which
is a true and, per §1.3, stronger-than-usual claim — or it is stated over the
composition and inherits 016's dependencies. Worth grilling before anyone tries
to prove it in 015 alone.

## 5.9 (operator question) Does W7's "where applicable" tighten?

§5.4 proposes a conformance gate that would, in effect, change the meaning of a
ratified law: W7's `example` hedge would become mandatory for structural
refusals. That is a tightening of a ratified sentence, not an implementation
detail, and it is not this lane's to make. **Open question for the operator:
does W7 read "where applicable" as an author's discretion, or as "wherever a
witness exists" — with the sort split (#18) supplying the definition of
"exists"?**

---

# PART 6 — THE HONEST EDGE

What refutation-learning cannot give. One section, no hedging.

**6.1 The semantic gap is irreducible, and it is not a gap in the machinery.**
`certify` discharges well-formedness, identity, and declared closure laws over a
*term*. There is no behavioral specification channel (§3.7, Break 1). A term can
certify and be wrong: a legal `flb.type.v0` term that means something other than
what the utterance meant. If a grammar declares no law about deadlines being in
the future, a certified `Deadline` in the past is a certified value. No quantity
of refusals closes this, because no refusal is *about* it. The field's word is
"grounded"; the estate's is "recomputable", which is strictly stronger and
strictly narrower.

**6.2 There is no convergence theorem and there will not be one.** §3.7, Break 2.
An LLM maintains no symbolic version space and can re-propose a refuted candidate
at any temperature. Every published LLM-CEGIS success is an empirical benchmark
result. The claim available is monotone admissibility — nothing wrong enters the
catalog however long the model flails — and that is a property of the certifier,
independent of the proposer.

**6.3 Termination is a budget, not a theorem.** Ticket 003's PREFIX PROPERTY,
once mechanized, guarantees *progress preservation* — no dead ends, ever, so from
every reachable state a terminating strategy exists (`003:53-56`). It does not
guarantee termination: a model that fills a `list` with a `list` forever still
diverges. **The concierge guarantees the loop can always terminate successfully,
not that it will.**

**6.4 Gold's negative results bound the foundry, and the closure law is what
keeps the estate inside the good fragment.** `flb.type.v0` terms are ranked
trees, so the regular *tree* language setting is the right one — and it is the
setting where everything works: tree-automaton emptiness is decidable, `L*` and
RPNI are polynomial. One step up the hierarchy and it all degrades: CFG
equivalence is undecidable, so an equivalence query cannot be implemented by a
checker at all. **If the declared grammar ever escapes the regular-tree fragment,
the prefix property stops being mechanically dischargeable and ticket 003's "no
dead ends, ever" becomes unprovable.** That is the sharpest reason ticket 004's
closure law is load-bearing.

**6.5 Absence refusals are a noise channel with an exact characterisation.** For
structural refusals there is no label noise — `certify` is total and
deterministic and the label is a function of the bytes, so **the teacher cannot
lie.** For absence refusals there is: an `unknown-ref` at head `h` is a **false
negative** with respect to any later head `h′ ⊒ h` at which the digest resolves.
Catalog lag *is* the noise. The encouraging part is that the split which makes
the corpus sound is the same split that makes it noise-free (§2.4). The
discouraging part is that until the split is merged and the sort table pinned,
the noise and the signal are in the same nine-element vocabulary.

**6.6 The fallible oracle is unresolved and stays where it is.** Ticket 016's
exploration questions are answered by a human who can be wrong, and a wrong
answer creates a durable wrong fact whose only remedy is a superseding record,
never an overwrite. The ticket already gates on it — "the fallible-oracle
consistency number decides whether a consistency protocol precedes architecture"
(`016:56-59`). Correct call; this dossier does not move it.

**6.7 The teaching evidence is n = 1.** §4.1. One live transcript and one
standing test that hard-codes its own repair. No control arm, no second operator,
no instrumentation of the "no docs" state. The design's central empirical
hypothesis — that a certifier-supplied `Law` outperforms a model's
self-generated feedback, which is Olausson's own methodology pointed at foldlab —
**has not been run by anyone**, here or in the literature.

**6.8 Constraining the surface has a measured cost.** §3.6, Cost 2. Format
restrictions significantly degrade reasoning (Tam et al., arXiv:2408.02442), and
grammar-constrained decoding distorts the model's distribution (Park et al.,
NeurIPS 2024). The estate's architecture avoids paying this at sampling by
putting the guarantee at admission — but a repair loop that puts a grammar in the
prompt, or a corpus of refusals in the context window, is still shaping the
model's output distribution, and nobody has measured what *that* costs. It is a
plausible reason the falsifiable benchmark could come out flat.

**6.9 The subject of this dossier does not exist.** §2.5. No refusal is persisted
anywhere on `origin/main`. Parts 2 and 5 describe a thing with a decided
ontology, a mechanized definition of permanence on an unmerged branch, a shipped
join algebra, and no substrate. The datum is real and shipped; the corpus is a
design.

---

## Sources

### Fetched this session

- D. Angluin, "Learning regular sets from queries and counterexamples,"
  *Information and Computation* 75(2):87–106, November 1987 — bibliographic
  details and result summary confirmed via search; the open PDF at
  https://people.eecs.berkeley.edu/~dawnsong/teaching/s10/papers/angluin87.pdf
  would not text-extract, so the theorem's verbatim wording is inherited.
- E. M. Gold, "Language identification in the limit," *Information and Control*
  10(5):447–474, 1967 — Table I (p. 452), Theorem I.4 (pp. 467–468), and
  Theorem I.5 (pp. 468–469) read in the original paper;
  https://doi.org/10.1016/S0019-9958(67)91165-5 and
  https://home.uni-leipzig.de/gkobele/courses/2023.WS/Colloq/files/Gold67.pdf
- O. Polozov & S. Gulwani, "FlashMeta: A Framework for Inductive Program
  Synthesis," *OOPSLA 2015*, October 2015 —
  https://www.microsoft.com/en-us/research/publication/flashmeta-framework-inductive-program-synthesis/
  (witness functions / inverse semantics quoted verbatim; the ACM DL entry
  https://dl.acm.org/doi/abs/10.1145/2814270.2814310 returned HTTP 403, so page
  numbers are not cited).
- Z. R. Tam, C.-K. Wu, Y.-L. Tsai, C.-Y. Lin, H. Lee & Y.-N. Chen, "Let Me Speak
  Freely? A Study on the Impact of Format Restrictions on Performance of Large
  Language Models," arXiv:2408.02442, 5 Aug 2024 —
  https://arxiv.org/abs/2408.02442 (abstract quoted verbatim; venue
  **[unverified]**).

### Inherited (verified in the counterexample dossier's session; re-cited, not re-read)

Angluin 1980 (tell-tales); Mitchell 1982 (generalization as search); Lau,
Wolfman, Domingos & Weld 2003 (version space algebra); Hirsh 1994 (generalizing
version spaces); Oncina & García 1992 (RPNI); de la Higuera 1997 (characteristic
sets); Solar-Lezama et al. 2006 (CEGIS/Sketch); Clarke et al. 2000/2003 (CEGAR);
Ganter & Wille 1999, Ganter & Obiedkov 2016, Guigues & Duquenne 1986 (FCA,
attribute exploration, the canonical basis); Konev, Lutz, Ozaki & Wolter 2018;
Shapiro, Preguiça, Baquero & Zawirski 2011 (CRDTs); Geng et al. EMNLP 2023;
Park et al. NeurIPS 2024 (GAD); Ni et al. ICML 2023 (LEVER); Chen et al. ICLR
2023 (CodeT); Olausson et al. ICLR 2024 (self-repair); Zhang et al. ICML 2024
(LEAP). Full URLs at
`docs/research/2026-08-14-counterexample-algebra-dossier.md:1017-1136`.

### In-repo (all verified at `origin/main` = `5a6def847`; unchanged at `0c0955181`)

- `proto/SPEC.md:41-66` — W1–W10; `:53-56` W7; `:57-59` W8; `:60-62` W9;
  `:63-66` W10. `:68-86` — the `flb.type.v0` grammar.
- `proto/wire/CONTRACT.md:56-58` (child edges), `:69-73` (C1), `:79-85`
  (frontier order, C4, C3), `:119-128` (uniform refusal), `:130-132` (five
  client-local kinds), `:134-144` (the nine kinds), `:146-172` (grammar
  specifics), `:176-179` (identity).
- `proto/go/protod/refusal.go:9-19` (nine kinds), `:23-27` (`NextHint`),
  `:33-42` (`Refusal`; `:39` `example,omitempty`), `:44-54` (`refuse`).
- `proto/go/protod/walk.go:11-15` (header), `:19-24` (kind tables), `:36-50`
  (walk entry), `:52-58` (first refusal), `:83-89` (C5), `:164-171` (union
  uniqueness), `:213-221` (unknown kind), `:329-347` (`checkKeys`; `:344-346`
  the nil witness), `:364-380` (`structureRefusal`) — 26 call sites, 24 distinct
  law expressions.
- `proto/go/protod/concierge.go:9` (`frontierRefLimit`), `:124-136`
  (`buildFrontier`, constant `legal`), `:138-167` (the hand-written table),
  `:169-194` (`conciergeNext`), `:196-217` (`firstUnknownRef`), `:219-248`
  (`teachFill`/`teachUnfill`), `:332-341` (`pathRefusal`; `:339` example-as-path),
  `:377-387` (`malformedConciergeField`).
- `proto/go/protod/dispatch.go:51-62` (the five request kinds), `:62-76`
  (`unknown-request`), `:86-94`, `:126-155` (`decodeBody`), `:157-163`
  (`truncateForReply`, the 256-byte cut).
- `proto/go/protod/catalog.go:92-115` (`unknown-ref`), `:118-128`
  (`digest-mismatch`).
- `proto/go/protod/ingress.go:48-57`, `:62-72`, `:73-90` (`unknown-identity`),
  `:96-104`.
- `proto/go/protod/read.go:52`, `:83`, `:93`, `:135-150`.
- `proto/go/protod/FINDING-FRONTIER-001.md:1-53` — one hole nonterminal; the
  three dispositions at `:42-51`.
- `proto/ts/src/wire.ts:24-34` (the `Refusal` schema; `:29` `example` as
  `Schema.Unknown`), `:145-155` (`localRefusal`).
- `proto/ts/src/mcp.ts:1-9` (the two disciplines), `:15` (the `Refusal` import),
  `:67-73` (`Tool.dynamic`; `:71` `success: Schema.Unknown`), `:79-88` (`:84`,
  `:87` verbatim passthrough), `:94-98` (stdio, `v2025_06_18`), `:129-134`
  (`asRefusal`).
- `proto/ts/test/smoke.test.ts:1-3` (header), `:43-55` (the typo and its
  refusal), `:57-59` (the repair; `:58` "No docs were consulted.").
- `proto/ts/examples/refusals.ts` — the committed capture script.
- `packages/core/src/algebra.ts:180-201` (`AlgebraLaws` and its doc comment),
  `:396`/`:400` (`addition`/`join`), `:444-453` (`setUnion`), `:456-473` (the
  seven, "the federating half" at `:467`), `:474` (the registry), `:513-516` (product law
  inheritance).
- `packages/core/src/foldLaws.ts:162-203` (identity, associativity,
  banana-split), `:205-208` (the "never stubbed" discipline), `:209-224`
  (commutativity), `:225-235` (idempotence).
- `docs/explanation/theory.md:45-71` — the three sorts; monotone presence.
- `docs/map/tickets/003-the-wrapper-prototype.md:30-45` (stateless guided
  construction), `:47-60` (SENSIBILITY, CONSTRUCTION REACHABILITY, PREFIX
  PROPERTY, "never a hand-written table").
- `docs/map/tickets/015-the-grammar-foundry.md:19-25`, `:26-32`, `:43-46`
  (witness tier), `:47-51`.
- `docs/map/tickets/016-the-ontology-explorer.md:30-34`, `:35-42`, `:43-46`,
  `:56-59`.
- `docs/design/2026-08-14-the-language-surface.md:49-56` (the sort table),
  `:153-159` (`flb.certification.v0`), `:230-243` (`catalog_head` required),
  `:298-334` (admission, not sampling).
- `docs/design/2026-08-14-concierge-sessions-and-catalog.md:146-150`, `:175`
  (refusals in the fold kernel), `:200-208` (frontier is state, not history),
  `:667-673` (compaction discards the moves).
- `docs/design/2026-08-14-mcp-surface-deep-read.md:255-263` (A9), `:265-271`
  (A10), `:375-379` (completion has no refusal channel), `:466-483` (elicitation
  inverts W8), `:575-662` (§3.5, the refusal-as-structured-result verdict;
  `:622-623`, `:628-640`, `:653-662`), `:785`/`:893-895` (error codes),
  `:848-854` (the build list), `:909-943` (Appendix A, the probe).
- `docs/design/2026-08-14-estate-structures-map.md:263` (row L1).
- `docs/research/2026-08-14-tangible-examples.md:264-310` (the live transcript),
  `:344-346` (the standing test), `:778-788`.
- `docs/research/2026-08-14-register-study.md:130-134` (the thesis sentence),
  `:634-637` (F4), `:654-657` (F8), `:659-664` (F9), `:742-752`
  (REFUSAL-AS-CURRICULUM).
- `docs/research/2026-08-14-counterexample-algebra-dossier.md` — the foundation;
  §2.b's semilattice finding is discharged (§2.2 above), §2.a/§2.c/§3 otherwise
  stand.
- `repos/effect/packages/effect/src/unstable/ai/McpServer.ts:1286` (the
  `outputSchema` guard), `:1312-1313` (`isError:false`, `structuredContent`);
  `.../test/.../McpServer.test.ts:232` (upstream's own negative control).

### GitHub (verified this session)

- **#17** OPEN — "Advertise outputSchema on foldlab MCP tools" (F1 of #16).
- **#18** OPEN — "Refusal kinds straddle the evidence/absence sort with no marker
  — a folded refusal corpus would accumulate false negatives." Zero comments.
- **#19** OPEN — "buildFrontier assigns one constant hand-written legal table to
  every hole — the law ticket 003 ratified away."
- **#20** CLOSED — "Generated fold law suite lacks commutativity and idempotence
  — the semilattice/CRDT half of the federation claim is untested." Discharged;
  see §2.2.
- **#22** OPEN — "BUILD ORDER (ratified 2026-08-14)": short-term item 2 is the
  refusal sort split, item 3 is `flb.certification.v0` persistence.
- **#35** OPEN — "Decision-preparedness scan… the refusal corpus is being born
  next week with three unratified choices." Rows 1–4 are §5.2, §5.5, and §5.6.
  Zero comments.

### Branch (verified this session, unmerged)

- `codex/refusal-sorts` @ `89292529a`, "Classify refusals and list every merge
  offender" — 15 files, +581/−178. Not on `origin/main`, not on any remote.
  `proto/wire/refusal-sorts.json` (the 6/3 partition),
  `proto/go/protod/refusal.go` (two const blocks, `RefusalSort`,
  `RefusalSortOf`, the corpus-law comment), `proto/ts/src/wire.ts`
  (`DAEMON_REFUSAL_SORTS`), `refusal_sort_conformance_test.go`
  (`TestStructuralRefusalsAreCatalogInvariant` — byte-equality across two catalog
  heads; `TestAbsenceRefusalsAreRepealedByLaterPresence`), `proto/DECISIONS.md`
  (three entries, two carrying `D??` placeholders).

---

**The chain remembers what the fold forgives. A refusal is the estate's only
utterance that remembers what the grammar forbids — and it says so precisely
enough that a corpus of them would be worth more than the model that produced
them.**
