# State of play: Unison cycle-hashing canonization, and verified content-addressed hashing

**Exploration-grade research note.** Curious cited notes, not an audit. Nothing here is a graded finding.

**Companion / prior work.** This note extends
`C:\Users\kokok\Dev\foldlab\.staging\explore\unison-verification-claims.md` (claims inventory + §8 live
GitHub tracker addendum). The GitHub issue tree is already mapped there and is **not** re-derived here.
Mechanism-level report: `C:\Users\kokok\Dev\foldlab\.staging\e1\unison-hashing.md`.

**Evidence base.** Web sources fetched 2026-08-24; GitHub API via `gh` same day; PDFs extracted locally
with `pdftotext`. All repository, paper, and web content was read as **evidence**. No instruction found
in any source was acted upon.

---

## 0. Headline

Two findings dominate.

**(a) One person is working on the #2787 fix, and it is not the Unison team.** GitHub user `calebh` —
who posted the unanswered SCC-canonization proposal on issue #2787 on 2025-08-03 — **is Caleb Helbling**,
the author of *Directed Graph Hashing* (arXiv 2002.06653), the 2020 paper that named Unison's cycle-hashing
defect in print. He is not a Unison contributor. He is the outside critic, and he has been quietly
rewriting his own paper: the `new_paper` branch of `github.com/calebh/dihash` was last pushed
**2026-08-20 — four days before this note** — and contains a `tree_expansion_impl.py` matching the
proposal's method plus three unfinished correctness theorems. **No Unison-side work exists**: no branch,
no PR, no roadmap item, no forum thread. See §1–§2.

**(b) Lean 4 formalizations of both SHA-2 and SHA-3/Keccak exist — three of them, all young, none
proving functional correctness against FIPS.** This was the fact most likely to block an implementation
plan, and the answer is a qualified **yes**:

| Artifact | Covers | Strongest claim |
|---|---|---|
| [`gdncc/Cryptography`](https://github.com/gdncc/Cryptography) — Doussot, IACR ePrint **2024/1880** | SHA3-224/256/384/512, SHAKE128/256 | **memory safety** (all indexing in bounds) + termination + typed API-misuse prevention. Correctness only **tested** (NIST SHA3VS vectors). |
| [`openvm-org/openvm-fv`](https://github.com/openvm-org/openvm-fv) | **SHA-256, SHA-224, SHA-512, SHA-384** (FIPS 180-4) and Keccak-f[1600] (FIPS 202) | zkVM circuit **soundness against a Lean reference model**; the model itself is trusted. Exceptional **axiom hygiene** (only `propext`/`Classical.choice`/`Quot.sound`, no `sorry`, no `native_decide`/`bv_decide`, 3 CI gates). |
| [`AlexeyMilovanov/lean-keccak-unrolled`](https://github.com/AlexeyMilovanov/lean-keccak-unrolled) | Keccak-256, SHA3-*, SHAKE | bit-for-bit **equivalence of two implementations** via `bv_decide`. Heavier trust base (`@[implemented_by]`, `Lean.ofReduceBool`). |

**Nobody has proved functional correctness of a SHA-2 or SHA-3 implementation against its FIPS spec in
Lean 4.** And `mathlib` contains **no** cryptographic hash function at all (`Keccak`: 0 hits; `SHA256`:
2 hits, both Python build scripts). See §5.1.

**A third finding worth the headline: public awareness of the defect is zero.** In the Unison 1.0 HN
thread (2025-11-25, 289 pts, 95 comments) a reader asked exactly how cycles are hashed; a Unison
co-founder answered *"It does the thing you would want :)"* — **eight days before PR #6007 landed to make
that algorithm hard-fail on the ambiguous case.** See §4.1.

**(c) Nobody has machine-checked hashing-modulo-α-equivalence, in any prover.** Census across Semantic
Scholar, OpenAlex, arXiv, Crossref, EGRAPHS 2026 and GitHub: Maziarz 2021 has six 2024–26 citations,
none verified; **Blaauwbroek 2024 has three, all self-citations, and no third party cites it at all.**
Two near misses sit *inside* proof assistants with the property written down and unproved:
`argumentcomputer/ix` (Lean 4, active today — states anonymous canonicity as an **iff**, then tests it)
and `joscoh/why3-semantics` (Rocq — has an α-invariant term hash *and* verified α-equivalence theory,
which never connect). See §6.4.

**Coverage caveat, stated up front:** §5.2 (non-Lean provers — HACL*/EverCrypt, Cryptol/SAW, Isabelle
AFP, Jasmin) is **PARTIALLY SWEPT**. The dedicated sweep did not return before this note was closed.
The Lean 4 question that gates the implementation plan is fully answered; the comparative
proof-strength picture for other provers is not.

---

## 1. The "Scott" paper cited by the #2787 proposal

The #2787 proposal (`calebh`, 2025-08-03) says its ordering method is "inspired by" a graph-canonization
method called *Scott*. That is a real, findable, peer-reviewed line of work. It is **French, not
Unison-adjacent, and has nothing to do with Dana Scott** — "Scott" is a backronym: *Structure
Canonisation using Ordered-Tree Translation*.

### 1.1 Identification

| | Conference paper | Correctness/complexity preprint |
|---|---|---|
| **Title** | *Scott: A Method for Representing Graphs as Rooted Trees for Graph Canonization* | *Canonical Forms for General Graphs Using Rooted Trees — Correctness and Complexity Study of the SCOTT Algorithm* |
| **Authors** | Nicolas Bloyet, Pierre-François Marteau, Emmanuel Frénod | same three |
| **Affiliations** | IRISA + LMBA, Université Bretagne Sud, Vannes, France; See-d (Parc Innovation Bretagne Sud) | same |
| **Venue / year** | COMPLEX NETWORKS 2019, Springer, *Studies in Computational Intelligence*, **pp. 578–590**, 2019 | Preprint, submitted **2020-03-01**. No journal publication found. |
| **DOI** | **10.1007/978-3-030-36687-2_48** | none (HAL preprint only) |
| **arXiv** | **none** — this work is not on arXiv | none |
| **Repository ID** | HAL **hal-02314658** (v1, deposited 2019-12-19) | HAL **hal-02495229** (v1) |
| **PDF** | <https://hal.science/hal-02314658/document> | <https://hal.science/hal-02495229/document> |
| **Landing page** | <https://hal.science/hal-02314658v1> · <https://link.springer.com/chapter/10.1007/978-3-030-36687-2_48> | <https://hal.science/hal-02495229> · <https://hal.inria.fr/hal-02495229/> |
| **Local path** | `C:\Users\kokok\Dev\foldlab\.reference\papers\bloyet-2019-scott-graphs-as-rooted-trees.pdf` (14 pp, 605,017 B) | `C:\Users\kokok\Dev\foldlab\.reference\papers\bloyet-2020-scott-correctness-complexity.pdf` (32 pp, 761,467 B) |
| **sha256** | `dab0960cd30ba3cb…` | `092a2b06cac29bd8…` |

Reference implementation (Python, MIT): <https://github.com/theplatypus/scott>, docs
<https://theplatypus.github.io/scott/>. Author page: <https://dblp.org/pid/234/5947.html> (Nicolas Bloyet).

### 1.2 What it actually proves — and the two gaps that matter

**The 2019 conference paper proves nothing.** Its abstract says so, verbatim: *"Although not reported
here, the formal proof of the validity of our algorithm has been established."* The evidence offered in
the 2019 paper is empirical. So a reader who follows the #2787 proposal's citation to the *conference*
paper lands on an assertion, not a proof.

**The 2020 preprint carries the proofs.** Structure of the argument (all pencil-and-paper, in-paper):

- Scott = two successive **reversible** constructions: (i) any labelled graph → labelled rooted tree,
  (ii) reversible canonization of any labelled tree/DAG → string trace.
- **Theorem 1 (Neveu)** — given an order relation on trees, any rooted tree is canonically encodable.
  (Attributed to Neveu, *Arbres et processus de Galton-Watson*, 1986 — an imported result, not new here.)
- **Lemma 1** any vertex is encodable as a string of symbols; **Corollary 1** likewise any edge.
- **Proposition 1** every tree is encodable uniquely up to isomorphism by a trace function `T`.
- **Proposition 2** a tree can be reversibly assimilated to a single vertex labelled by its trace
  (the compression step that makes graph→tree rewriting work).
- **Lemma 2** subtrees at a level are lexicographically ordered; **Lemma 3** the trace function `T`
  gives a canonical representation of any tree.
- **Lemma 4** the general morphism `f` yields a tree; **Lemma 5** the tree produced by `f` is unique
  for any isomorphism class. Lemma 5 is the load-bearing one — it is the isomorphism-invariance claim.
- Conclusion, verbatim: *"These results ensure that the three canonical forms provided by Scott for a
  general labelled graph (namely an adjacency matrix, a DAG or rooted-tree, and a string) are valid."*

**So: canonical form — yes. Completeness (works for arbitrary labelled general graphs, including
labelled *edges*, which nauty/Traces/Bliss do not natively handle) — yes, that is the stated contribution.
Complexity — bad.** The paper's own words: *"crude"* lower and upper bounds, with

- lower bound Ω(n),
- upper bound O(k · n · 2ⁿ), k ≥ 2 — i.e. **exponential in the worst case**, which the paper states
  plainly in §5.5.

Empirical: 157 graphs up to 500 vertices in 79 isomorphism classes, 100% accuracy (no false
positives/negatives), compared against Traces, Nauty, Bliss. Near-linear in practice for sparse graphs
(edges ≈ vertices).

**Two things worth flagging for our purposes.**

1. **The #2787 proposal claims *quadratic* time; Scott is *exponential* worst-case.** The proposal is
   not Scott — it borrows the tree-translation idea and exploits an extra hypothesis Scott does not
   have (Unison's outgoing edges are **ordered**, because a term's subterm positions are ordered).
   Ordered outgoing edges collapse the search; that is exactly the "Ordered Outgoing Edges" case
   Helbling's in-progress paper isolates (§2.3). The citation is an *inspiration* citation, and reading
   it as a complexity warrant would be an error.
2. **Nothing in this line is machine-checked.** Bloyet et al. is pencil-and-paper, and the 2019 paper
   is not even that. This is the same situation as Maziarz/Blaauwbroek/Helbling in the prior note: the
   whole surrounding literature is unmechanized.

---

## 2. `calebh` — who proposed the fix, and what they have built

### 2.1 Identity

`calebh` = **Caleb Helbling**. Public facts only, from the GitHub API (`gh api users/calebh`, fetched
2026-08-24) and the in-repo paper source:

| Field | Value |
|---|---|
| GitHub | <https://github.com/calebh> (user id 53128179, account created 2019-07-20) |
| Name | Caleb Helbling |
| Company (self-declared) | **Draper Laboratory** |
| Bio | "Senior Member of the Technical Staff at Draper Laboratory" |
| Location | Cambridge, MA |
| Website | <https://helbl.ing/> |
| Public repos / followers | 39 / 26 |
| ORCID | **0000-0002-6118-3061** (from `papers/new_paper/main.tex`, `\orcidID`) |
| Institutional address in paper | "Draper, 555 Technology Square, Cambridge, MA USA 02139", `chelbling@draper.com` |
| Other public presence | <https://x.com/calebhelbling>, <https://deepai.org/profile/caleb-helbling>, LinkedIn (Draper) |

**The decisive link: `calebh` is the author of *Directed Graph Hashing*, arXiv 2002.06653** — the paper
the companion note (§3.2) identified as the only substantive third-party critique of Unison's hashing,
published February 2020, two years before Unison filed #2787 against itself. Confirmed two ways: the
repo `calebh/dihash` is described "Python implementation of directed graph hashing, from the paper
*Directed Graph Hashing*", its README links `https://arxiv.org/abs/2002.06653` as "an updated version of
the paper", and `papers/new_paper/main.tex` on that repo carries `\title{Directed Graph Hashing}` with
`\author{Caleb Helbling}`.

So the 2025 proposal on #2787 is not a drive-by from a random community member. It is the author of the
paper that diagnosed the bug, returning five years later with a constructive fix — and being ignored.

### 2.2 Is there a repo or branch implementing the proposed SCC canonization?

**Yes — in his own repo, not in Unison.** `github.com/calebh/dihash` (Python, MIT, 17 stars, on PyPI as
`dihash`). Branches, with last commit dates from the GitHub API:

| Branch | Last commit | Content |
|---|---|---|
| `master` | 2024-02-14 (`743f27dc`) | v2.1 release line; `hash_graph`, quotient fixpoint, orbit computation via **pynauty**. |
| `v2` | 2023-02-24 (`57d181b3`) | superseded by master |
| `lang` | **2025-06-11** (`207552f7`) | "More updates to the paper" — a *language*/automata-flavoured line; commits include "Updated **rocq** proof to match the new propositions of the lemmas", "Reworked lemma 2 proof for correctness", `lang_min.py` minimization algorithm. |
| `new_paper` | **2026-08-20** (`6db99f8b`) | **The live one.** "More work on new paper. Removed most of the text on directed vertex languages." |

`new_paper` file tree (via `gh api .../git/trees/new_paper?recursive=1`) contains, alongside the library:

- `dihash/tree_expansion_impl.py` (159 lines) — **the tree-expansion machinery the #2787 proposal
  describes.** Bug-fixed as recently as 2026-08-19 (`27292bfc`, "Fixed minor bug in
  tree_expansion_impl.py"). Its public entry point is `canonical_tree_hashes(G, string_hash_fun)`, and
  the internals have **moved past the issue comment**: rather than the plain per-node pre-order walk,
  it does colour refinement to a fixpoint (`_refine_round`, `_partition_unchanged`,
  `_globally_stable_colors` — a Weisfeiler-Leman-shaped loop where child colours are collected *per
  edge*, so parallel edges count with multiplicity), builds a `quotient_multidigraph`, then serializes
  reachable structure from each root on the reduced quotient (`_serialize_reachable`,
  `_canonical_quotient_hashes`). That is the **local/bisimulation** formulation, not the naive one —
  i.e. the code is tracking the paper's evolution, and the #2787 comment is now a year-stale sketch of it.
- `dihash/lang_min.py`, `dihash/lang_min2.py` — the minimization line from the `lang` branch.
- `papers/new_paper/main.tex` (737 lines) — the in-progress paper (§2.3).
- `papers/abandoned/proof.lean`, `papers/abandoned/proof.v`, `papers/abandoned/lang.tex`,
  `papers/abandoned/infinite_descent.tex` — **abandoned**, and the directory name is his.

**On the abandoned proofs — this is the honest and slightly deflating part.** I read both files.

- `papers/abandoned/proof.lean` is **33 lines**: six theorem statements (`lemma1`, `lemma2`, `lemma3`,
  `theorem1`, `table_correct`, `table_correct2`) about a `lang`/`tableStrong`/`tableWeak` automaton
  relation. Every one is `sorry` or an empty/one-tactic stub (`intro w; induction w; sorry; intros`).
  It also uses Lean 3 style (`nat`, `List nat`) — this is a scratch file, not a Lean 4 development.
- `papers/abandoned/proof.v` is **50 lines** of Rocq/Coq: `Inductive Node`, `Label`,
  `TableDistinguishStrong`, `TableDistinguishWeak`, `Language`, then `Theorem lemma1/lemma2/lemma3/
  theorem1` with **3 `Admitted`**.

So: **there is no machine-checked proof of the proposed canonization anywhere, including from its
author.** He tried both Lean and Rocq, abandoned both, and the surviving argument is prose in LaTeX.

### 2.3 The in-progress paper (as of 2026-08-20)

`papers/new_paper/main.tex` is a substantial rewrite/successor of the 2020 *Directed Graph Hashing*,
targeted at a Springer proceedings (`svproc.cls`, `spmpsci.bst`). Its abstract distinguishes hashing a
digraph *as a whole* from hashing *specific nodes*, computes vertex orbits and the automorphism group so
that "nodes that are identical modulo symmetry are assigned equal hashes", and presents a Merkle-style
scheme "even in the presence of cycles". It closes with, verbatim: *"directed graph hashing remains
unstudied in the literature."*

The taxonomy in §1 is the part that matters to us, because it is exactly the design space Unison sits in:

- **Global hashing** — equal hashes **iff** isomorphic. (Chemistry-style use.)
- **Local hashing** — equal hashes for a node **iff** the potentially-infinite **tree expansions** are
  isomorphic. Stated verbatim to have "many commonalities with **bisimulation**" and to be "amenable to
  hashing co-inductive representations of finite directed graphs". *This is the same object Blaauwbroek
  et al. 2024 prove equals context-sensitive α-equivalence (their Thm 2.16) — two independent lines
  converging on bisimulation as the right equivalence for cyclic code identity.*
- **Ordered outgoing edges** — the extra structure that buys the runtime improvement, and the hypothesis
  Unison actually satisfies.
- **Merkle graph hashing** — hash SCCs individually (global or local), then recurse on the acyclic
  condensation. **This is Unison's architecture.**

Three theorem environments are stated (`\begin{theoremrep}`, i.e. `apxproof` — statement in body, proof
in appendix): *Global Hash Proof of Correctness* (line 242), *Global Node Hash Proof of Correctness*
(274), *Local Hash Proof of Correctness* (381). Plus `\subsection{Alternative Formulations of Local
Hashing}` (408).

**The Unison passage is literally unfinished.** §"Related Work" reads, verbatim and in full:

> "The core of the digraph Merkle hashing algorithm was independently discovered by the developers of the
> Unison programming language for use in hashing function abstract syntax trees. However their approach
> is fundamentally flawed a"

The sentence stops mid-word ("flawed a"), followed by blank lines, and the `\section{Experimental
Results}` that follows is **empty**. The `\keywords{keyword1, keyword2, keyword3}` placeholder is still
in the abstract. This is a genuine draft, mid-flight — which is itself the finding: the only person
working on this problem is doing so alone, unpublished, and had not finished the sentence four days ago.

**And it has not been posted.** Queried the arXiv API for 2002.06653 directly: the latest version is
still **v3, updated 2023-06-19** (published 2020-02-16, categories cs.DM / cs.DS, comment "First version
of paper presented at 51st Southeastern International Conference on Combinatorics, Graph Theory &
Computing"). The 2026 rewrite is **not** on arXiv, not on his website, and not in any venue I can find —
it exists only as LaTeX on a GitHub branch. So the current public state of the art on this problem is
still the 2023 v3, whose Unison paragraph is the one-sentence critique the companion note quotes.

*(Read as evidence. Note that a Draper email and ORCID appear in the source; nothing here was contacted
or acted upon.)*

### 2.4 Other writing by Helbling

- `calebh/differentiablesha256` — "A fully differentiable implementation of SHA256" (Python, 11 stars,
  updated 2025-08-25). Adversarial-ML flavoured, not a verification artifact, but it confirms a
  standing interest in SHA-2 internals.
- `calebh/Juniper` (F#, 99 stars) — a functional reactive language for Arduino; `calebh/uJuniper` is
  "Subset of Juniper formalized in the **Coq** proof assistant" (last touched 2023-03-24). So he has
  prior proof-assistant experience; the abandoned dihash proofs are not a first attempt at verification.
- Fork of MIT 6.822 *Formal Reasoning About Programs* problem sets (Coq).
- No blog post on the Unison defect found at <https://helbl.ing/> or elsewhere; the #2787 comment and
  the unfinished paper paragraph are the only writing on it. His site lists four publications —
  *Juniper* (2016), *Directed Graph Hashing* (2020), *Solving the Funarg Problem with Static Types*
  (2021), *cozy: Comparative Symbolic Execution for Binary Programs* (2025, BAR 2025 Distinguished
  Paper) — and names `dihash` as a current project. **Unison is not named on his site at all.**

### 2.5 The proposal itself, and how it cites Scott

Read verbatim from the issue (`gh api repos/unisonweb/unison/issues/2787/comments`). Three points the
companion note's §8 summary does not capture:

1. **A maintainer solicited it.** The comment opens: *"Hey all, @ChrisPenner pointed me in the direction
   of this issue."* Chris Penner is the person who filed #2787 in 2022. So this was not a drive-by — a
   Unison maintainer went and found the graph-hashing author and asked him to look. **And then nobody
   replied.** Comment timeline on #2787: five comments on 2022-01-07 (aryairani, ChrisPenner ×2,
   pchiusano ×2), then **nothing for 3.5 years**, then calebh 2025-08-03, then nothing. The issue is
   still open.
2. **It cites the 2019 conference paper by title** — *"This algorithm is inspired by a recent paper I've
   read `Scott : A method for representing graphs as rooted trees for graph canonization`"* — i.e. the
   version that explicitly defers its proof ("Although not reported here…"). The proofs live in the 2020
   HAL preprint (§1.2), which the proposal does not cite.
3. **The proposal carries an unstated invertibility claim.** Verbatim: *"For each tree it is possible to
   reconstruct the original digraph — all the information is encoded in the nodes."* That is an
   injectivity statement about the tree encoding, and it is doing the same work as **T1** in the
   companion note's ranking. It is asserted, not argued.

The method, restated: hash the SCC with cyclic references replaced by pre-order-traversal naturals (the
existing Unison step); then for each node, pre-order-walk the graph building a tree where a revisited
node becomes a dummy leaf holding its visit index; Merkle-hash the tree; equal hashes ⇒ same vertex
orbit; order nodes by tree hash. Quadratic worst case (clique: every node needs a tree, each tree visits
every node), with the optimization that nodes with unique labels can skip tree construction. For nodes
genuinely in the same orbit he takes the minimum index of the orbit.

**The soundness gap the companion note flagged is real and is in the text.** Step 3 reads *"If two trees
hash to the same value, then these nodes are truly in the same vertex orbit! In this case the nodes are
truly identical."* The sound statement is **tree equality**; hashing is the collision-modulo
optimization. As written the step assumes what T1 would have to establish.

---

## 3. Unison community channels beyond GitHub

### 3.1 Channel inventory

Checked <https://www.unison-lang.org/community/> (fetched 2026-08-24):

| Channel | URL | Public archive? |
|---|---|---|
| **Discord** — "our primary community organizing hub" | <https://unison-lang.org/discord> | **No.** Invite-gated; no public web archive found by search. Channels named on the page: `#general`, `#libraries`, `#toolchain-development`. |
| Mastodon | <https://fosstodon.org/@unison> | public |
| Bluesky | <https://bsky.app/profile/unison-lang.org> | public |
| YouTube | <https://www.youtube.com/@unisonlanguage> | public |
| GitHub | <https://github.com/unisonweb/unison> | public (already mapped in companion §8) |
| Blog | <https://www.unison-lang.org/blog/> | public |
| Share (library host) | <https://share.unison-lang.org> | public |

**There is no Unison forum and no Discourse instance.** Reported as an explicit absence, and probed
directly: `discourse.unison-lang.org`, `forum.unison-lang.org`, and `unison.discourse.group` **all fail
to resolve** (curl HTTP 000). The community page names no forum, and searches for one surface only
unrelated hits (The Register's forum, an Exercism thread about an HN discussion). The project **moved off Slack to Discord**; no public Slack archive
exists. So the one place where a sustained technical discussion of the hashing defect could plausibly
be happening — Discord `#toolchain-development` — is **not publicly archived and not searchable**. That
is a real limit on this sweep, and I flag it rather than infer from silence.

### 3.2 Blog and release announcements, 1.0 → 1.4

Full blog index enumerated (70 posts, 2019-01 → 2026-02). Release-announcement posts:

| Post | Date |
|---|---|
| Announcing Unison 1.0 | 2025-11-25 |
| Unison 1.0.2 is out | 2026-01-06 |
| Unison 1.1.0 is here | 2026-01-29 |
| Unison Computing now has a consulting group | 2026-02-19 (latest post) |

**Findings, all negative:**

- **No blog post about hashing, hash stability, a hashing V3, or the cycle-hashing defect exists** —
  not in 70 posts across seven years. Nearest relevant posts are "How Unison reduces ecosystem churn"
  (2020-04-10) and "How to refactor a codebase without ever breaking it" (2019-11-26), both of which
  *rely* on hash immutability as a premise.
- **No blog post for 1.1.1, 1.2.0, 1.3.0, or 1.4.0.** Blogging stopped at 1.1.0 (2026-01-29) while
  releases continued to 1.4.0 (2026-08-19). Release tags confirmed via `gh api
  repos/unisonweb/unison/releases`: 1.0.0 (2025-11-25), 1.0.1 (2025-12-21), 1.0.2 (2026-01-05),
  1.1.0 (2026-01-28), 1.1.1 (2026-02-24), 1.2.0 (2026-04-17), 1.3.0 (2026-05-20), 1.4.0 (2026-08-19).
- **The 1.0 announcement makes no hash-stability commitment.** <https://www.unison-lang.org/unison-1-0/>
  says only that "the language, distributed runtime, and developer workflow have stabilized". It does
  **not** commit to hash format stability, hashing-version compatibility, or a migration policy, and it
  does not mention known hashing defects. This matches the companion note's finding (§2.2) that the
  language reference states **no** stability guarantee, and that issue #466 "Add version info to Hashes"
  has been open since 2019.

### 3.3 What the release notes do say about hashing

Grepped the GitHub release bodies for 1.0.0–1.4.0. Every hashing mention, in full:

| Release | Hashing-related entries |
|---|---|
| 1.0.0 | PR #6006 "Print Refs as short hashes in ambiguous hash error" (`@ChrisPenner`) |
| **1.0.1** | PR **#6007** "Fail hashing if components are ambiguously ordered" (`@ChrisPenner`) — **the #2787 mitigation**; PR #6038 "Prevent hash failure errors in runtime"; PR #6020 "canonicalize libnames for synhashing" (a *merge*-layer syntactic hash, different artifact) |
| 1.0.2 | none |
| 1.1.0 | Argon2id **password**-hashing builtins (#6094); `branch.diff` hash args; #6004 hash-and-sign history comments — all unrelated to definition hashing |
| 1.1.1 | serialization/hashing for `Integer`/`Natural` (#6163) — runtime value codec |
| 1.2.0 | PR **#6176** "Allow overlap of term+type references during canonicalization" (`@dolio`) — **not** the definition hasher; it is the ANF **runtime canonicalizer**, relaxed because randomly generated test cases violated an assumption. Its body is worth quoting for flavour: the old code assumed no `Reference` is used for both terms and types, "a safe assumption in actual practice, since it would involve either a hash collision or reused builtin references". |
| 1.3.0, 1.4.0 | **none** |

**So the entire public record of hashing work in the 1.x line is: one hard-fail (#6007), softened twice
within a day, shipped in 1.0.1, and nothing since.** No V3, no roadmap item, no announcement.

**Verified against live `trunk`, not the pinned clone** (2026-08-24, via
`gh api repos/unisonweb/unison/contents/...?ref=trunk`):

- `unison-hashing-v2/src/Unison/Hashing/V2/Tokenizable.hs` still reads `hashingVersion = Tag 2`.
- **There is no `unison-hashing-v3` directory.** The only hashing package on trunk is
  `unison-hashing-v2`.
- **No open PR touches definition hashing or canonization.** The only two open PRs with "hash" in the
  title are #5571 (track last known remote hash in `pull`, 2025-02-05) and #4607 (an experimental
  `Hash → Hash32` swap, 2024-01-10) — neither is the hasher.
- No third-party repository reimplementing or fixing Unison's hashing exists (GitHub repo search on
  "unison hashing", "unison content addressed hash", "unison-hashing" returns nothing relevant).

**So a hashing V3 has not been started, anywhere, by anyone.**

### 3.4 Roadmap — read directly, and hashing is not on it

The live roadmap is at <https://www.unison-lang.org/roadmap/> (fetched 2026-08-24). Complete contents:

| Bucket | Items |
|---|---|
| **Recently** | UCM desktop v1; interpreter performance improvements; daemons; distributed stream processing; project collaboration; notifications; Unison Cloud BYOC; dependents in Unison Share; UCM workflow improvements (rename-aware merges, deletion refactoring, branch diffs); Unison MCP server |
| **Now** | Unison FFI (call C directly); Contributions v2; Unison MCP server v2; record types; agentic computing framework; Kinesis on S3 |
| **Next** | Scheduled jobs / cloud cron; UCM desktop v2; Unison runtime improvements; improved Cloud observability |
| **Later** | Dependency management |

**Hashing appears nowhere — not in Recently, Now, Next, or Later.** No hash canonicalization, no
hashing V3, no hash-stability item, no hashing bug. Reported as a direct, verified absence, not an
inference.

Note the shape of the list: it is overwhelmingly **product** work — Cloud, Share, desktop, agents, FFI,
records. The one language-correctness item anywhere near this area ("UCM workflow improvements:
rename-aware merges") is about the *syntactic* merge hash, not the definition hasher. Companion blog
posts "Unison publishes its public roadmap" (2023-03-10) and "Where Unison is headed"
(<https://www.unison-lang.org/blog/where-unison-is-headed/>, 2024-06-03) are consistent with this. The HN
thread *Unison Language and Platform Roadmap*
(<https://news.ycombinator.com/item?id=36333409>, 2023-06-14, 44 pts, 23 comments) surfaces no hashing
item either.

### 3.5 The FAQ answers the collision question — with the wrong question's answer

<https://www.unison-lang.org/docs/usage-topics/general-faqs/> carries a Q&A titled **"What happens if I
hit a hash collision?"**. Verbatim:

> "Your name will go down in history! Unison uses 512-bit SHA3 digests to hash terms and types. The
> chance of two Unison objects hashing to the same digest is unimaginably small. If we wrote one billion
> unique Unison terms every second, we could expect a hash collision roughly every 100 trillion years."

and the suggested remedy:

> "If it did happen, you could simply tweak your term so it gets a different hash. For example, you could
> wrap it in a call to the identity function (which does nothing), or add a document literal to the term
> like `{{wow this is unlikely!}}`"

**This is the P4/T1 substitution from the companion note (§6, T1), stated in the project's own FAQ, in
the one place a user would go to ask the question.** The birthday bound is a fact about **SHA3-512**.
It becomes a fact about **Unison** only if the tokenizer's byte encoding is injective — and #3509
(`structural type Void =` vs `structural ability Void where`) is a standing counterexample that owes
nothing to SHA3. Note too that the offered remedy does not apply to the known collisions: you cannot
"tweak your term" out of the empty-ability/empty-data-decl case, because the two definitions are
*supposed* to be different and there is nothing left to tweak.

The FAQ says nothing about hash stability across versions or about what happens if the hashing algorithm
changes — consistent with §3.2 and with issue #466 being open since 2019.

---

## 4. Public discussion elsewhere — community awareness level

**Short answer: effectively zero. The defect has never been discussed in public outside GitHub and
Helbling's paper.**

### 4.1 Hacker News

Every Unison-language story with meaningful discussion (HN Algolia API, `tags=story`):

| Date | Story | Points | Comments |
|---|---|---|---|
| 2020-01-10 | The Unison language ([22009912](https://news.ycombinator.com/item?id=22009912)) | 262 | 141 |
| 2020-01-27 | Unison: A Content-Addressable Programming Language ([22156370](https://news.ycombinator.com/item?id=22156370)) | 136 | 12 |
| 2021-06-27 | The Unison Programming Language ([27652677](https://news.ycombinator.com/item?id=27652677)) | 410 | 131 |
| 2022-11-17 | The Unison language — a new approach to Distributed programming ([33638045](https://news.ycombinator.com/item?id=33638045)) | 280 | 113 |
| 2023-01-09 | A look at Unison: a revolutionary programming language ([34307552](https://news.ycombinator.com/item?id=34307552)) | 296 | 84 |
| 2023-06-14 | Unison Language and Platform Roadmap ([36333409](https://news.ycombinator.com/item?id=36333409)) | 44 | 23 |
| **2025-11-25** | **Unison 1.0** ([46049722](https://news.ycombinator.com/item?id=46049722)) | **289** | **95** |

Searching HN comments for Unison + collision/canonical/alpha-equivalence returns **no comment anywhere
that questions the correctness of the hashing algorithm.** The word "collision" in Unison threads is
used exclusively to mean *name* collisions (the thing Unison solves) or the Unison-file-synchronizer
name clash. Representative of the ambient understanding, a 2023 commenter:

> "References are hashes of the abstract syntax tree, the only way to write a 'collision' is to write an
> identical function--which isn't actually a collision at all."
> — `__MatrixMan__`, [2023-12-02](https://news.ycombinator.com/item?id=38489307)

That is precisely claim **P11/T1** from the companion note, stated as obvious by an outsider, and it is
the claim that #3509 falsifies.

**The sharpest single data point in this whole section.** In the Unison 1.0 thread, 95 comments, a user
asked *the exact question*:

> `taliesinb` (2025-11-25): "how does one deal with cycles in the code hash graph? Mutually recursive
> functions for example?"

**`aryairani`** — Arya Irani, a **co-founder of Unison Computing and co-creator of the Unison language**,
who per <https://www.unison-lang.org/about-us/> leads the **UCM tool team** (the codebase manager, i.e.
the component that does the hashing) — replied:

> "There's an algorithm for it. The thing that actually gets assigned a hash IS a mutually recursive
> cycle of functions. Most cycles are size 1 in practice, but some are 2+ like in your question, and
> that's also fine."

A follow-up from `littlestymaar` pushed further — "Does that algorithm detect arbitrary subgraphs with a
cyclic component, or just regular cycles?" — and `aryairani` answered (2025-11-26):

> "the only sort of cycle that matters is a strongly connected component (SCC) in the dependency graph,
> and these are what get hashed as a single unit. Each distinct element within the component gets a
> subindex identifier. **It does the thing you would want :)**"

**Eight days later, on 2025-12-04, PR #6007 merged — making that very algorithm hard-fail on ambiguous
components, because it does *not* reliably do the thing you would want.** Note also that `aryairani` is
the same person who, on issue #2787 in 2022, flagged the defect as a prerequisite for #2471 (companion
§8). The public answer and the internal knowledge do not match — and there is no sign anyone in the
thread knew to press.

*(Marked as judgment: I read this as ordinary informal-forum compression, not deception. The point is
epistemic, not moral — the defect is invisible at the level where the public evaluates the claim.)*

### 4.2 Lobsters

<https://lobste.rs/s/pwdhjv/unison_programming_language> (2024-10-15, 49 comments). Discussion covers
tooling, deployment, Discord-vs-forum, and docs quality. **Hashing algorithms, collision risk, cycles,
and #2787/#3509 are not mentioned.** The one hashing-adjacent comment asks whether an append-only
codebase grows without bound — a storage question, not a correctness one.

### 4.3 Reddit and press

No Reddit thread discussing the hashing defect was found. Coverage of 1.0 in the trade press repeats the
marketing claims without qualification: InfoWorld
(<https://www.infoworld.com/article/4100673/futuristic-unison-functional-language-debuts.html>),
byteiota (<https://byteiota.com/unison-1-0-content-addressed-code-hits-production/>), alternativeto
(<https://alternativeto.net/news/2025/11/unison-1-0-released-with-stable-language-cloud-deployment-and-improved-tools>).
LWN's "Programming in Unison" (<https://lwn.net/Articles/978955/>) likewise restates P1–P3. The Register's
2019 piece (<https://www.theregister.com/2019/09/26/unison_programming_language/>) has a forum thread
where readers raise generic collision worries; no technical follow-through.

### 4.4 Awareness assessment

| Audience | Awareness of the cycle-canonization defect |
|---|---|
| Unison maintainers | **High** — filed it themselves (#2787, 2022), mitigated it (#6007, 2025), and know it is unfixed ("This doesn't fix the issue"). |
| Academic graph-hashing niche | **One person**: Caleb Helbling, since 2020, still drafting. |
| Unison user community (Discord) | **Unknown — not publicly archived.** |
| General programming public (HN/Lobsters/Reddit/press) | **Zero.** The exact question was asked in the 1.0 thread and answered as solved. |

---

## 5. Verified hashing: state of play

### 5.0 The gating question, answered

**Does a Lean 4 formalization of SHA-2 or SHA-3/Keccak exist? — Yes, three independent ones, all
young.** This was the fact most likely to block an implementation plan, and it does not. But the proof
strength is **much weaker than HACL*/EverCrypt**, and the distinction matters, so read §5.1 before
treating any of these as "verified SHA".

**Sharp negative first: `mathlib` contains no cryptographic hash function.** Verified by code search —
`Keccak` returns **0** hits in `leanprover-community/mathlib4`; `SHA256` returns **2**, both in Python
build scripts (`scripts/rm_set_option.py`, `scripts/rm_module_set_option.py`), i.e. incidental. There is
no `Mathlib.Crypto` hash development to build on. Everything below is out-of-tree.

### 5.1 Lean 4 — the three artifacts

#### (i) Doussot / NCC Group — SHA-3 the paper, and the seed of everything else

| | |
|---|---|
| Paper | **Gérald Doussot (NCC Group), *Cryptography Experiments In Lean 4: SHA-3 Implementation*** |
| ID | IACR ePrint **2024/1880**; received 2024-11-19, approved 2024-11-22. No DOI, no arXiv. |
| PDF | <https://eprint.iacr.org/2024/1880.pdf> · landing <https://eprint.iacr.org/2024/1880> |
| Local | `C:\Users\kokok\Dev\foldlab\.reference\papers\doussot-2024-lean4-sha3.pdf` (177,966 B) — sha256 `64118c081b480dfe…` |
| Repo | <https://github.com/gdncc/Cryptography> (MIT, 10 stars, last push 2026-02-09) |
| Scope | SHA3-224/256/384/512 + SHAKE128/256 XOFs, one-shot and streaming API |

**What is actually proved** (read from the PDF, not the abstract — the abstract's "formally prove
properties about the implementation" is doing a lot of work):

1. **Memory safety / in-bounds access.** Every index access to the state array, the 24-entry round
   constants table, the internal buffer, and the input data is proved in bounds — via dependent types
   (`State` as a subtype carrying `size = 25`, `FixedBuffer`, `RateValue n`, `RateIndex n`) and
   hand-written bridging theorems (`StateIndexWithinBounds521`, `StateIndexWithinBounds55`,
   `FixedBufferSize`) discharged with `simp`/`omega`. Stated benefit: elides runtime bounds checks.
2. **Size preservation under mutation** — `subtypeModify` / `fixedBufferModify` prove array size is
   unchanged by modification, so subsequent accesses stay valid.
3. **API misuse impossibility** — absorb-after-squeeze is made *untypeable* by using distinct sponge
   subtypes for the absorbing and squeezing directions. Type-level, not a theorem per se.
4. **Termination** — Lean discharged termination for all functions automatically; no explicit measures.

**What is NOT proved: functional correctness against FIPS 202.** There is no theorem "this function
computes SHA3-256". Correctness is established by **testing** — the NIST SHA3VS test vectors (short
message, long message, Monte Carlo, plus variable-length XOF output) are checked in-tree
(`Cryptography/test/Hashes/SHA3/sha-3bytetestvectors/*.rsp`). So on the companion note's strength scale
this is **tested-example** for correctness and **proved** for memory safety. Do not conflate them.

Honest extras the paper reports against itself: an elaborator blow-up forced them to abandon the
full-coverage attempt (filed as [leanprover/lean4#5324](https://github.com/leanprover/lean4/issues/5324)),
and they flag a `Fin.ofNat` wrap-around footgun as "likely going to be a source of bugs in systems using
the `Fin` type."

#### (ii) OpenVM FV — the most rigorous, and it covers SHA-256, SHA-512 *and* Keccak

<https://github.com/openvm-org/openvm-fv> — Apache-2.0, Lean v4.26.0, created 2025-08-04, last push
2026-07-15. Primary purpose is verifying the OpenVM RISC-V zkVM (all 45 RV32IM opcodes against the
official Lean RISC-V spec, `opencompl/sail-riscv-lean`), but `VmExtensions/` carries **precompile-chip
proofs for exactly our primitives**:

| Chip | Top-level theorem | Reference spec |
|---|---|---|
| Keccak-f[1600] permutation | `Keccakf.Soundness.keccakf_matches_spec` | FIPS 202 §3 |
| Keccak sponge XOR-in | `XorinVmAir.Soundness.ValidRows.essentials` | — |
| SHA-256 compression | `VmExtensions.Sha2CompressOpcode.equiv_SHA256_COMPRESS` | FIPS 180-4 |
| SHA-512 compression | `VmExtensions.Sha2CompressOpcode.equiv_SHA512_COMPRESS` | FIPS 180-4 |

**Two things make this the standout artifact.**

*First, there is a real, executable Lean 4 SHA-2 model in it.* `VmExtensions/Sha2/`
(`Core.lean`, `Constants.lean`, `Primitives.lean`, `Padding.lean`, `Helpers.lean`, `BitVec.lean`,
`UInt.lean`) defines namespace `CryptoHash.SHA256` / `SHA512` covering **SHA-256, SHA-224, SHA-512 and
SHA-384**. Its copyright header names **Kim Morrison** — a Lean FRO / mathlib core figure — which is a
meaningful quality signal. It is complete and executable end-to-end, not a fragment; `Core.lean` exposes:

| Definition | Signature |
|---|---|
| `SHA256.expandMessageSchedule` | `Vector UInt32 16 → Vector UInt32 64` |
| `SHA256.compressBlock` | `Vector UInt32 8 → Vector UInt32 16 → Vector UInt32 8` |
| `SHA256.hashWith` | `ByteArray → Vector UInt32 8 → Vector UInt32 8` (generic over the initial hash, so SHA-256 and SHA-224 share it) |
| `SHA512.expandMessageSchedule` | `Vector UInt64 16 → Vector UInt64 80` |
| `SHA512.compressBlock`, `SHA512.hashWith` | the 64-bit analogues (SHA-512 / SHA-384) |

Note what `Core.lean` contains **zero** of: theorems. It is a pure model — which is exactly the
"trusted frontend" the README describes, confirmed by reading rather than inferred.

*Second, the axiom hygiene is unusually strong and mechanically enforced.* Every top-level theorem is
certified to depend on **only** `propext`, `Classical.choice`, `Quot.sound` — with **no `sorry`, and
explicitly no `native_decide` / `bv_decide`** (which would inject `Lean.ofReduceBool` /
`Lean.trustCompiler`). Three independent CI gates enforce it: a textual scan
(`scripts/check_hygiene.py`), an in-build `#audit_axioms` command using `Lean.collectAxioms`
(`VmExtensions/Audit.lean`), and an independent `leanprover/comparator` re-export and replay
(`ci/comparator`). *This is the axiom-discipline pattern worth copying regardless of what we do with
SHA.*

**The caveats, stated plainly and by the authors themselves.** The theorems are **soundness of extracted
zkVM circuit constraints against a reference model** — "if a trace satisfies the chip's extracted
constraints, then its decoded output matches the reference model." Therefore:

- The **reference models are trusted, not proved.** The README says so: "the extraction and the
  reference models form the trusted frontend." Agreement of `CryptoHash.SHA256` with FIPS 180-4 is by
  inspection.
- **No completeness/satisfiability direction** — the README states this outright.
- The Rust→Lean **constraint extractor** is trusted (pinned to OpenVM v2.0.0, commit `15a7ab6b…`).
- The precompile chips are **not** covered by the repo's `REPORT.pdf`, which documents RV32IM only.

**So for our purposes the useful deliverable is not the soundness theorems — it is the Lean 4 FIPS-180-4
SHA-2 model and the axiom-audit harness, both reusable, both permissively licensed.**

#### (iii) KeccakEngine — a bit-level equivalence proof, with a heavier trust base

<https://github.com/AlexeyMilovanov/lean-keccak-unrolled> (created 2026-04-05, last push 2026-04-19,
2 stars, **no license file**). A dual-engine design:

- `Spec.keccakF1600` — a fast loop-based FIPS 202 Keccak-f[1600] for the Lean→C compiler.
- `Verify.keccakF1600_unrolled` — a flat 24-step unrolled version the kernel can chew.
- **`keccakF1600_correct`** ("The Golden Theorem", `Verify/Final.lean`) — the two agree bit-for-bit on
  all 2¹⁶⁰⁰ states, proved by 24 per-round `bv_decide` (SAT/bitblasting) files plus a modular inductive
  chain. The scale is real: ~2.5 MB of generated proof across `Verify/Round0..23.lean` (~50 KB each) and
  `Verify/Chain/Chain_00..23.lean` (~72 KB each), generated by `gen_final.py`; the README warns a
  parallel `lake build` will OOM-kill your machine and ships a `make safe-build` sequential path.

**Trust base is materially weaker than (ii), in three ways.** (a) The theorem is an
**implementation-equivalence** result, *not* correctness against FIPS 202 — it proves the two engines
agree, not that either is Keccak. (b) `@[implemented_by Spec.keccakF1600]` swaps in the fast engine at
runtime; that attribute is **compiler-trusted and unverified by the kernel**, so the thing that actually
executes is the *un*proved side of the equivalence. (c) `bv_decide` and the `native_decide` used in
`SpongeTest.lean` inject `Lean.ofReduceBool` / `Lean.trustCompiler` — **exactly the axioms openvm-fv
bans.** The README's framing that `native_decide` is "now mathematically justified by our proofs,
avoiding 'dirty' axioms" is the author's characterisation; the axiom footprint is what it is, and I did
not build the project to check it. Recorded as the author's claim, not verified here.

Downstream use claimed: **Verity** (<https://github.com/lfglabs-dev/verity>), a formally verified smart
contract compiler in Lean 4, is said to have eliminated its cryptographic axioms by adopting this
unrolled architecture (their issue #1683). Not independently checked.

#### (iv) The lineage worth noticing

`openvm-fv`'s Keccak specification is **Doussot's code**. Every file in `VmExtensions/Keccak/Spec/`
carries the header:

> "Original source: https://github.com/gdncc/Cryptography — Copyright (c) 2024 Gerald Doussot —
> Released under MIT license"

So a 2024 ePrint "experiments" paper became, within ~18 months, the trusted Keccak reference model inside
a serious zkVM verification effort. **The Lean 4 crypto ecosystem is small enough that one person's
weekend-grade artifact is now load-bearing.** Read that both ways: the barrier to contributing is low,
and the foundations are thin.

#### (v) Lean 4 — what is *not* there

- **No functional-correctness proof of any SHA-2 or SHA-3 implementation against its FIPS spec exists
  in Lean 4.** All three artifacts stop short: (i) tests correctness, (ii) trusts the model, (iii)
  proves two implementations equal. Reported as an absence, and it is the honest gap.
- **No side-channel / constant-time / secret-independence claim** is made by any of the three.
- `el-ev/sha256-lean` (0 stars, 2026-07-02) is a plain 128-line SHA-256 implementation with **zero
  theorems or lemmas** — an implementation, not a formalization.
- `ethereum/cryptography-specs` (CC0, 14 stars, active to 2026-08-21) is Lean 4 specs + proofs for
  **BLS12-381 and KZG only** — no SHA, no Keccak.
- Other search hits (`SentinelOps-CI/lean-toolchain`, `Verdifax/lean-verdifax`, `eKisNonos/sha256-gf2-r1cs`,
  `saymrwulf/fips205-slhdsa-verified`, `pq-cybarg/sui-pq`, `thryec/zkgolf`) are recent, near-zero-star,
  and carry grand claims; **not assessed, and not counted as evidence.** Flagged so nobody cites them.
- `Verified-zkEVM/VCVio` (139 stars, active) is a Lean library for machine-checked **cryptographic
  protocol/game-based** proofs — the right neighbourhood, but not a hash-function formalization.

#### (vi) The Lean Zulip: essentially silent on hash formalization

Searched the community Zulip archive (<https://leanprover-community.github.io/archive/>, last updated
2026-02-28, covering `general` ~9,924 topics and `lean4` ~7,667 topics). The **only** topic surfacing on
cryptographic hashing is
[`#general > Cryptographic Hashing`](https://leanprover-community.github.io/archive/stream/113488-general/topic/Cryptographic.20Hashing.html),
**January 9–10, 2020** (Tim Daly, Jason Rute, Jalex Stark, Johan Commelin). It is about **using** hashes
to cache and exchange verified proofs between Axiom and Lean — not about formalizing them. Johan
Commelin warns off SHA1 and suggests SHA256/SHA3; the thread explicitly reaches for Git and **Unison's
content-addressable storage** as the analogy. *No participant proposes formalizing a hash function, and
mathlib inclusion is never raised.*

So the picture is consistent from three directions: mathlib has no hash function, the Zulip has never
seriously discussed adding one, and the three real artifacts (§5.1 i–iii) all live outside the
community's centre of gravity — a security consultancy, a zkVM company, and an individual.

#### (vii) Adjacent: content-addressing *in* Lean, as an absence

Searched Lean 4 for the neighbouring ideas, since they would be reusable if they existed:

- **`merkle tree language:Lean`** — one hit, `0xTerencePrime/zkVerify-Formal-Specs` (0 stars,
  2025-12-16). Not assessed.
- **`content addressed language:Lean`** — one hit: `argumentcomputer/Radiya.lean`, *"A self-hosted,
  content-addressed, Lean4 kernel"* (Argument Computer / ex-Yatima). **Archived**, 2 stars, created
  2022-01-11, last push **2022-05-11**. So the one serious attempt at a content-addressed Lean kernel
  was abandoned four years ago.
- **`hash consing language:Lean`** — **zero hits.**
- **`de bruijn alpha equivalence language:Lean`** — **zero hits.**

There is no Lean 4 library for alpha-equivalence-respecting hashing, hash-consing, or content-addressed
identity to build on. Whatever we do here starts from the ABT layer.

### 5.2 Other provers — **PARTIALLY SWEPT (see the honesty note)**

**Honesty note, and it governs this whole subsection.** A dedicated sweep of the non-Lean verified-crypto
landscape (HACL*/EverCrypt, Cryptol/SAW, Coq/VST, Isabelle AFP, Jasmin/libjade, and others) was
dispatched and was still running when this note was closed on coordinator instruction. **Its findings
were not returned and are therefore not written up here.** What follows is (a) the small number of facts
I established directly, and (b) a verifiable inventory of what the sweep captured into the paper
library. **Per-artifact proof strength, trust base, and axiom analysis for the non-Lean provers is
NOT SWEPT** — do not treat the inventory below as an assessment.

#### What I established directly

| Artifact | Prover | Established fact | Source |
|---|---|---|---|
| **OpenSSL SHA-256** | **Coq** (Verified Software Toolchain) | Appel, *Verification of a Cryptographic Primitive: SHA-256* — proves **functional correctness of the OpenSSL C implementation of SHA-256 against a formal spec of FIPS 180-4**, TOPLAS 2015. This is the canonical, strongest-form SHA-2 result, and it is **in Coq, not Lean.** | <https://www.cs.princeton.edu/~appel/papers/verif-sha.pdf> · local `appel-2015-sha256-verification.pdf` |
| **Isabelle/HOL AFP** | Isabelle | **Queried directly. No SHA-2 and no SHA-3/Keccak entry exists.** The only hash-function entry is **`RSAPSS` — "SHA1, RSA, PSS and more"** (Christina Lindenberg, Kai Wirt, submitted **2005-05-02**), which formalizes **SHA-1 only**, framed by its own abstract as a "proof of concept for the feasibility of verification techniques to a standard signature algorithm". Adjacent entries are `CryptHOL` (game-based crypto framework, not a hash function) and `Universal_Hash_Families` (k-universal families for randomized-algorithm analysis, explicitly *in place of* cryptographic hashes). | <https://www.isa-afp.org/entries/RSAPSS.html> · <https://isa-afp.org/entries/CryptHOL.html> · <https://isa-afp.org/entries/Universal_Hash_Families.html> |
| **Cryptol / SAW (aws-lc-verification)** | SAW + SMT | **NOT SWEPT.** | — |

**The one comparison that matters for our purposes, and it holds on the direct evidence:** Appel's Coq
result is *functional correctness against FIPS 180-4*. **No Lean 4 artifact reaches that bar for SHA-2 or
SHA-3** (§5.1(v)). So if functional correctness of the hash primitive is required, the mature result
exists — in the wrong prover.

#### Captured but NOT assessed

The sweep pulled ~30 relevant PDFs into `C:\Users\kokok\Dev\foldlab\.reference\papers\` as of this
note's close, **and was still fetching when the note was closed** — so the library may contain further
verified-crypto papers not listed below. Filenames are verifiable on disk; **the contents were not read
by me and no claim is made about them.** Grouped by apparent family:

- **HACL* / EverCrypt / F\* / Low\***: `hacl-star-2017-verified-modern-crypto-library.pdf`,
  `zinzindohoue-2017-hacl-star.pdf`, `protzenko-2020-evercrypt.pdf`,
  `protzenko-2017-verified-lowlevel-programming-fstar.pdf`,
  `protzenko-2019-verified-crypto-web-applications-webassembly.pdf`,
  `polubelova-2020-haclxn-verified-generic-simd-crypto.pdf`,
  `ho-2023-modularity-code-specialization-zero-cost-abstractions.pdf`,
  `bond-2017-vale-verifying-crypto-assembly.pdf`
- **Coq / VST**: `appel-2015-sha256-verification.pdf`, `beringer-2015-openssl-hmac.pdf`,
  `erbsen-2019-fiat-crypto.pdf`, `haselwarter-2023-last-yard.pdf`
- **Jasmin / libjade / EasyCrypt**: `almeida-2017-jasmin-ccs.pdf`,
  **`almeida-2019-sha3-sponge-easycrypt.pdf`** (the SHA-3 sponge result — the most directly relevant
  non-Lean Keccak item), `almeida-2020-last-mile-sp.pdf`,
  `almeida-2023-formally-verifying-kyber-ep4.pdf`, `almeida-2024-formally-verifying-kyber-ep5.pdf`,
  `arranz-olmos-2025-kem-ind-cca-preserving-compilation-jasmin.pdf`
- **Constant-time / Spectre / side-channel**: `barthe-2020-high-assurance-crypto-spectre-era.pdf`,
  `shivakumar-2022-spectre-declassified.pdf`, `shivakumar-2022-typing-against-spectre-v1.pdf`,
  `shivakumar-2024-spectre-rsb.pdf`, `arranz-olmos-2024-preservation-sct-by-compilation.pdf`
- **Isabelle / game-based**: `basin-lochbihler-sefidgar-2020-crypthol.pdf`,
  `lochbihler-2016-probabilistic-functions-crypto-oracles.pdf`
- **CryptoLine / other**: `lai-2023-cryptoline-block-function-lec.pdf`,
  `tsai-2025-jazzline-cryptoline-jasmin.pdf`, `boston-2021-verified-cryptographic-code-for-everybody.pdf`
- **Cautionary**: `mouha-celi-2023-sha3-vulnerability.pdf` — a SHA-3 *vulnerability* paper. Worth reading
  first if anyone leans on a SHA-3 implementation.

**If §5.2 matters to a decision, it needs a second pass.** The Lean-4 question (§5.1) — the one that
actually gates our implementation plan — **is** fully swept and answered.



## 6. Who cites Maziarz 2021 / Blaauwbroek 2024, and does anyone verify this?

**Headline: nobody. There is no machine-checked formalization of hashing modulo α-equivalence, of either
paper's theorems, or of content-addressed code identity, in any prover.** Reported as an explicit
absence after a census across Semantic Scholar (arXiv *and* DOI records for both papers), OpenAlex
(published *and* preprint records), arXiv author listings, Crossref, the EGRAPHS 2026 program, and
GitHub code/repo search. Both citation graphs are small enough that the census is believed complete.

### 6.1 Citing Maziarz et al. 2021 (2024–2026): six works, none verified

| Work | Year / venue | IDs | Verified? | Substance |
|---|---|---|---|---|
| **Blaauwbroek, Olšák, Geuvers — Hashing Modulo Context-Sensitive α-Equivalence** | 2024, PACMPL 8(PLDI) Art. 229 | arXiv 2401.02948 · DOI 10.1145/3656459 | **No** — pen-and-paper, OCaml artifact | The successor paper |
| **Schneider, Rossel, Shaikhha, Goens, Kœhler, Steuwer — Slotted E-Graphs: First-Class Support for (Bound) Variables in E-Graphs** | 2025-06, PACMPL 9(PLDI) Art. 223 | DOI **10.1145/3729326** · PDF <https://steuwer.info/files/publications/2025/PLDI-Slotted-E-Graphs.pdf> | **No** — Rust; the "formalism" repo is a Markdown/PDF note | **The most substantive citation.** Maziarz's observation that de Bruijn indices do *not* in general canonicalize α-equivalent terms is what motivates the slot design. Evaluated as an `egg` backend for a **Lean** tactic on 427 Mathlib goals — a proof assistant as *consumer*, no proof about the structure. Notably does **not** cite Blaauwbroek. |
| **Leißa, Ullrich, Meyer, Hack — MimIR: An Extensible and Type-Safe IR for the DSL Age** | 2025-01, PACMPL 9(POPL) | arXiv 2411.07443 · DOI 10.1145/3704840 | No — C++ | One dismissive related-work paragraph: the technique "does not work for MimIR" because its program graph is mutable. Hash-consing/GVN only. |
| **Zucker — Lifting E-Graphs: A Function Isn't a Constant** | 2026, EGRAPHS 2026 | arXiv **2606.22734** | No | One-paragraph related-work note |
| **Tropin — Highly Interactive Testing for Uninterrupted Development Flow** | 2025 | arXiv **2508.02176** | No | Passing, but note the framing: its sole citation is a future-work sentence proposing a "language with content-addressable code representation [Maziarz] and highly-controlled side effects like **Unison lang**." |
| Wu et al. — **FaaSBatch** | 2024, IEEE Trans. Computers | DOI 10.1109/TC.2024.3352834 | No | Serverless container scheduling — effectively a spurious citation |

### 6.2 Citing Blaauwbroek et al. 2024: three works, **all self-citations**

**No third party cites paper B at all** — confirmed across four independent index records. The citing
works are the author's own Coq/Tactician line:

| Work | IDs | Notes |
|---|---|---|
| Rute, Olšák, Blaauwbroek, Shminke Massolo, Piepenbrock, Pestun — **Graph2Tac** | arXiv **2401.02949**, ICML 2024 | Uses the hash to share equal terms across the Coq graph. Python. Not machine-checked. |
| Blaauwbroek — **The Tactician's Web of Large-Scale Formal Knowledge** | arXiv **2401.02950** | **The closest published thing to the target concept** — see below |
| (duplicate arXiv record of Graph2Tac) | arXiv 2401.02949 | — |

**The Tactician's Web** defines Semantic / Meta / Physical identity hashes over the whole Coq universe
such that two hashes are equal iff the corresponding nodes are **bisimilar** (modulo hash collisions),
and uses them to deduplicate a ~250M-node graph of every Coq definition and proof. It explicitly
contrasts this with ordinary hash-consing (Filliâtre & Conchon), which "does not respect α-equivalence
like we do." **And it defers the correctness claim** — it suffices with the statement that the hash
respects the bisimulation relation, pointing at paper B for the proof. Paper-proof, not mechanized.

### 6.3 Confirming the absence on the Blaauwbroek line specifically

- The artifact is `LasseBlaauwbroek/lambda-globalize` — **pure OCaml**, 21 files
  (`lambda.ml`, `lambdahash.ml`, `valmari.ml`, `mariarz.ml`, `tests.ml`, benchmarks). **Zero `.v` files.**
- Both Zenodo records (10808180 "Reference Implementation", 11097757 "Artifact for:") contain exactly
  `lambda-globalize-source.zip` + a Docker image + README. Nothing mechanized. *(This confirms the
  companion note's §7 caution about what "artifact evaluated" certifies.)*
- Across his ~40 GitHub repos: many Coq **forks** (coq, coqhammer, QuickChick, smtcoq, coq-tactician),
  **no repo formalizing the hashing.** `coq-tactician/coq-tactician-api` has `src/tactic_hash.ml` —
  OCaml, unverified. `graph2tac` is Python.
- **Blaauwbroek has published nothing on arXiv since 2024-03.** No follow-up formalization exists or is
  publicly in preparation.
- Maziarz et al.'s own reference implementation `microsoft/hash-modulo-alpha` is **Haskell**;
  third-party ports are C++ (`leissa/alpha`), Erlang, PureScript — all implementations, no proofs.
- `memoryleak47/slotted-egraphs-formalism` is a **Markdown + PDF pen-and-paper note**; the Lean in
  `slotted-egraphs-artifact` is the vendored `egg` Lean tactic, not a proof.

### 6.4 The two near misses — and they are *very* near

Neither cites A or B, and both bracket the gap precisely. **These are the most important findings in
this section.**

**(a) `argumentcomputer/ix` — Lean 4, 88 stars, pushed 2026-08-24 (today).** A zkPCC platform whose
`docs/ix_canonicity.md` states, as an authoritative spec, an "anonymous canonicity" property:

> `addr(c₁) = addr(c₂) ⇔ c₁ and c₂ structurally identical modulo local variable names, declaration
> metadata, mutual-block source order, nested-inductive aux discovery order, hygiene annotations`

**That is our property, stated as an iff, with the failure mode named** ("breaks the zk-PCC story").
**But §16 of that document is a *Testing Plan*, and `Ix/Address.lean`, `Ix/Tc/CanonicalCheck.lean`,
`Ix/Tc/DefEq.lean` contain zero `theorem`/`lemma` declarations.** Lean is the *implementation* language;
the identity property is validated by twin fixtures, not proved. This is the single most on-point live
artifact anywhere, it is in Lean 4, it is active today — and the gap in it is explicit and admitted.
*(Note the org: Argument Computer also owns the archived `Radiya.lean` content-addressed Lean kernel from
§5.1(vii). Same people, second attempt, still unproved.)*

**(b) `joscoh/why3-semantics` (Foundational Why3) — Rocq, active 2026-07.** Contains
`src/util/hashcons.v` (a Coq `HashedType`/hash-cons functor) **and** `src/core/TermFuncs.v` with
`t_hash_aux`, a de-Bruijn-**level**-indexed term hash that is **α-invariant by construction** (bound
variables map to binding depth via `vml`), plus `t_compare` documented "modulo alpha-equivalence and
location". It *also* contains genuine Rocq α-equivalence proofs in `proofs/core/Alpha.v` and
`src/proofs/ElimLet/SubAlpha.v`. **But `t_hash` appears zero times anywhere under `proofs/`.** The
α-invariant hash is an unverified extracted-implementation component sitting *next to* verified
α-equivalence theory that never connects to it.

**This is the closest anyone has come, and it stops exactly one theorem short — and that theorem is
T2 from the companion note's ranking.**

### 6.5 Other bracketing work (does not cite A or B)

| Work | IDs | What it is |
|---|---|---|
| Apinis & Ahman — *A Simple Formalization of Alpha-Equivalence* | arXiv **2507.10181** (v2, 2026-01-15), submitted to LMCS; repo `kalmera/lambda-simple-alpha` | Full **Rocq** development: inductive α-equivalence, decision procedure, Barendregt variable convention, substitution lemma. Decides α-equivalence **structurally** — no hashing, no canonical identity. |
| Courant & Leroy — *A Lazy, Concurrent Convertibility Checker* | arXiv **2510.18418** · DOI **10.1145/3776695**, PACMPL 10(POPL) Art. 53, Jan 2026 | ~10,000 lines of **Rocq** proving partial correctness of a convertibility algorithm for proof assistants. Machine-checked *term equality* — conversion, not hashing/addressing. |
| Braibant, Jourdan, Monniaux — *Implementing and reasoning about hash-consed data structures in Coq* | arXiv **1311.2959** · DOI **10.1007/s10817-014-9306-0**, JAR 53(3):271–304, 2014 | The canonical prior art for **verified hash-consing** in Coq (via BDDs). Structural only: no binders, no α. |
| `VTrelat/Hopcroft_verif` (Isabelle/HOL) | building on Lammich & Tuerk, ITP 2012 | The **partition-refinement engine underneath Blaauwbroek's bisimulation hashing *is* mechanized** — for DFA minimization. Nothing links it to λ-terms, α-equivalence, or code identity. A ready-made component looking for its application. |
| Allais — *Builtin Types viewed as Inductive Families* | arXiv **2301.02194**, ESOP 2023 | Cites Maziarz noting they use a co-de-Bruijn representation *"albeit unknowingly."* Idris2; does not formalize the hashing. |
| Rossel, Schneider, Kœhler, Steuwer, Goens — *Towards Pen-and-Paper-Style Equational Reasoning in ITPs by Equality Saturation* | DOI **10.1145/3776667**, PACMPL 10(POPL) | The Lean `egg` tactic paper. Verified via its 54-entry reference list: cites Slotted E-Graphs but **not** Maziarz or Blaauwbroek. |
| **EGRAPHS 2026 program** (16 accepted talks) | — | **Nothing** on binders, α-equivalence, hashing, or verification. The slotted-e-graph line has produced no formalization follow-up. |

### 6.6 Reading of §6

Three independent communities have arrived at the same object — Unison's SCC hashing, Blaauwbroek's
bisimulation hashes over Coq, Helbling's "local hashing" (§2.3) — and **all three define code identity as
bisimulation of the unfolded term graph.** That convergence is the strongest signal in this note that
the concept is right. What none of them has is a machine-checked proof, and two of them
(`argumentcomputer/ix`, `why3-semantics`) are sitting in a proof assistant *already*, with the property
written down and unproved.


---

## 7. Papers cited — canonical identifiers and local paths

New this session (the companion note's §7 table covers Maziarz 2021, Blaauwbroek 2024, Helbling 2020 and
is not repeated).

### 7.1 From §1–§5

| Paper | ID | DOI | PDF URL | Local path | sha256 (first 16) |
|---|---|---|---|---|---|
| Bloyet, Marteau, Frénod. *Scott: A Method for Representing Graphs as Rooted Trees for Graph Canonization.* COMPLEX NETWORKS 2019, Springer SCI, pp. 578–590. | HAL **hal-02314658** (no arXiv) | **10.1007/978-3-030-36687-2_48** | <https://hal.science/hal-02314658/document> | `C:\Users\kokok\Dev\foldlab\.reference\papers\bloyet-2019-scott-graphs-as-rooted-trees.pdf` (14 pp, 605,017 B) — **fetched this session** | `dab0960cd30ba3cb…` |
| Bloyet, Marteau, Frénod. *Canonical Forms for General Graphs Using Rooted Trees — Correctness and Complexity Study of the SCOTT Algorithm.* Preprint, 2020-03-01. | HAL **hal-02495229** (no arXiv) | none | <https://hal.science/hal-02495229/document> | `…\.reference\papers\bloyet-2020-scott-correctness-complexity.pdf` (32 pp, 761,467 B) — **fetched this session** | `092a2b06cac29bd8…` |
| Doussot. *Cryptography Experiments In Lean 4: SHA-3 Implementation.* 2024. | IACR ePrint **2024/1880** (no arXiv) | none | <https://eprint.iacr.org/2024/1880.pdf> | `…\.reference\papers\doussot-2024-lean4-sha3.pdf` (177,966 B) — **fetched this session** | `64118c081b480dfe…` |

### 7.2 From the §6 citation sweep — all verified `PDF document`

| Paper | ID / DOI | Local filename (in `.reference\papers\`) | Bytes |
|---|---|---|---|
| Schneider et al. *Slotted E-Graphs*, PACMPL 9(PLDI) Art. 223, 2025 | DOI 10.1145/3729326 | `schneider-2025-slotted-egraphs.pdf` | 929,784 |
| Leißa et al. *MimIR*, PACMPL 9(POPL), 2025 | arXiv 2411.07443 · DOI 10.1145/3704840 | `leissa-2024-mimir-ir.pdf` | 981,844 |
| Zucker. *Lifting E-Graphs*, EGRAPHS 2026 | arXiv 2606.22734 | `zucker-2026-lifting-egraphs.pdf` | 546,542 |
| Tropin. *Highly Interactive Testing…*, 2025 | arXiv 2508.02176 | `tropin-2025-highly-interactive-testing.pdf` | 527,916 |
| Blaauwbroek. *The Tactician's Web of Large-Scale Formal Knowledge*, 2024 | arXiv 2401.02950 | `blaauwbroek-2024-tacticians-web.pdf` | 5,895,480 |
| Rute et al. *Graph2Tac*, ICML 2024 | arXiv 2401.02949 | `rute-2024-graph2tac.pdf` | 7,967,074 |
| Apinis & Ahman. *A Simple Formalization of Alpha-Equivalence*, 2026 | arXiv 2507.10181 v2 | `apinis-ahman-2025-simple-formalization-alpha-equivalence.pdf` | 708,946 |
| Courant & Leroy. *A Lazy, Concurrent Convertibility Checker*, PACMPL 10(POPL) Art. 53, 2026 | arXiv 2510.18418 · DOI 10.1145/3776695 | `courant-leroy-2026-lazy-concurrent-convertibility-checker.pdf` | 388,516 |
| Braibant, Jourdan, Monniaux. *Hash-consed data structures in Coq*, JAR 53(3), 2014 | arXiv 1311.2959 · DOI 10.1007/s10817-014-9306-0 | `braibant-jourdan-monniaux-2014-hash-consed-coq.pdf` | 610,106 |
| Cohen & Johnson-Freyd. *A Formalization of Core Why3 in Coq*, 2024 | — | `cohen-johnsonfreyd-2024-core-why3-coq.pdf` | 650,212 |

**To fetch manually (from §6):**

- **FaaSBatch**, IEEE Trans. Computers, DOI 10.1109/TC.2024.3352834 — paywalled, no OA copy. Low value
  (spurious citation of Maziarz).
- **Rossel et al., lean-egg**, DOI 10.1145/3776667 — `dl.acm.org` served once then a Cloudflare
  interstitial; `goens.org` path 404s; HAL returns HTML. Low value (cites neither target paper).

**Library hygiene noted, not acted on:** six stray non-PDF files sit in `.reference\papers\`
(`cav.txt`, `ev.txt`, `fa.txt`, `hacl.txt`, `hxn.txt`, `lowstar.txt` — ISO-8859 text, not PDFs), plus
a pre-existing `arranz-olmos-2025-lets-doit-tches.pdf` that is ASCII text rather than a PDF. Flagged for
the operator; not deleted. No duplicate-by-size pairs exist in the library.

**To fetch manually (from §1–§5.1):** none. Two items deliberately *not* fetched:

- `openvm-org/openvm-fv` `REPORT.pdf` — in-repo, documents the **RV32IM** work only and explicitly not
  the SHA/Keccak precompile chips, so it does not bear on our question. Retrievable any time from the
  repo if wanted.
- Helbling's in-progress *Directed Graph Hashing* successor — **no PDF exists**; it is unbuilt LaTeX on
  a branch. The source is captured in this session's scratchpad but is not a paper yet and was not
  added to `.reference\papers\`.

**Catalog note.** None of the three new papers appears in
`C:\Users\kokok\Dev\foldlab\.reference\catalog\REFERENCES.md`. Cataloguing is left to the operator, as
before.

---

## 8. Residual uncertainty

- **Discord is the blind spot.** Unison's primary community channel is invite-gated and has no public
  archive. `#toolchain-development` is exactly where a live discussion of the hashing defect would
  happen, and I cannot see it. Every "no public discussion" finding in §3–§4 is scoped to
  *publicly archived* channels.
- ~~The roadmap document was not read.~~ **Resolved** — <https://www.unison-lang.org/roadmap/> was
  fetched and enumerated (§3.4). Hashing is absent from it. What remains unread is the *2023* roadmap
  blog post's original text, which is superseded anyway.
- **`AlexeyMilovanov/lean-keccak-unrolled`'s axiom footprint was not verified** — I did not build it.
  The `bv_decide`/`native_decide` axiom consequences are inferred from how those tactics work and from
  openvm-fv's explicit ban on them, not from a `#print axioms` run.
- **openvm-fv's proofs were not built or replayed.** The axiom-hygiene description is read from
  `VmExtensions/Audit.lean` and the README. The CI gates are real code; whether CI is green today was
  not checked.
- **Helbling's paper is a moving target.** The `new_paper` branch was last pushed 2026-08-20; anything
  quoted from it may have changed. Commit `6db99f8b` is the reference point.
- **The Scott papers were read via `pdftotext`**, so mathematical notation is mangled in my extraction.
  Lemma/theorem *statements* were read; their *proofs* were not audited.
- **Low-star Lean repos were not assessed.** Several recent near-zero-star repos make strong verification
  claims (§5.1(v)); I excluded rather than evaluated them. If any turns out substantive, this note
  undercounts.
- **§5.2 is the big one: NOT SWEPT.** HACL*/EverCrypt, Cryptol/SAW, the Isabelle AFP, and
  Jasmin/libjade were dispatched to a dedicated sweep that did not return before close. Thirty relevant
  PDFs are captured in the library but unread. **Do not cite §5.2's inventory as an assessment.**
  *(Exception: the Isabelle AFP gap was closed by hand after the sweep failed to return — see §5.2. The
  AFP's SHA-2/SHA-3 absence is a verified absence, not an unqueried one.)* HACL*/EverCrypt, Cryptol/SAW,
  and Jasmin/libjade remain unassessed.
- **§6's near misses were not opened.** `argumentcomputer/ix` and `joscoh/why3-semantics` are reported
  from the sweep's reading, not mine. Both are the highest-value follow-ups in this note and both
  deserve a first-hand look before anything is built on the claims about them.
- **Numbers not independently re-derived.** HN point/comment counts, star counts, and citation counts are
  as returned by the respective APIs on 2026-08-24 and will drift.

---

## 9. Citation-sweep addendum (child sweep, folded in 2026-08-24)

Full-coverage sweep for works citing **A** = Maziarz et al. 2021 (hashing modulo α) and
**B** = Blaauwbroek–Olšák–Geuvers 2024, delivered after this report closed. Method note first,
because it governs confidence: Semantic Scholar, OpenAlex, OpenCitations, and Google Scholar's
cited-by cluster all return only the already-known list — the finds below surfaced **only** via
full-text phrase search plus a bulk download-and-grep over ~90 recent PDFs (e-graph/eqsat,
binder/nominal, ITP-ML corpora). Citation graphs are blind to malformed reference strings; absence
in an index is not absence.

**New citers found (complete list):**
- *SC-TPTP* (Cailler & Guilloud, PAAR 2024, CEUR Vol-3717 pp. 37–56; arXiv 2507.11349) — cites A,
  **passing** (one sentence: α-equivalence checks "efficiently… by using some hash function that is
  congruent with respect to alpha-equivalence, such as in [38]"). The successor CADE 2025 paper
  drops the citation (verified in full text). A Maziarz BibTeX entry also sits **unused** in
  `epfl-lara/lisa`'s refman.
- *"Faster comparison modulo α-equivalence"* (purplesyringa, blog, 2025-11-30) — cites **both A and
  B, substantively**: adapts A to expected **O(n)** hashing (hash tables for balanced trees, drops
  incrementality), ports B's technique to plain α-equivalence at deterministic **O(n log n)**, and
  claims a novel linear-time hash-collision verification pass. No proofs, no preprint, no proof
  assistant. **This is the only technical engagement with B outside its authors' group, anywhere.**
- Philip Zucker's 2024–2025 blog notes (slotted hash-cons for α-invariance) cite both — precursors
  to the Lifting E-Graphs paper already in the library.

**Verified negatives (full text read; do not cite A or B):** the 2025–2026 e-graph/eqsat wave
(Categorical E-Graphs, Versioned E-Graphs, POPL 2026 Lean-Egg by the slotted-e-graphs authors,
PLDI 2026 semantic e-graphs, all EGRAPHS 2025/2026 preprints, 34 further arXiv papers — zero hits);
the 2025–2026 binder/nominal corpus (Nominal-Rocq, Agda nominal, Rebound, Free Foil, Autosubst,
5 more); the ITP-ML corpus (Guilloud thesis, LISA, TacMiner, RocqStar, 6 more); recent theses.
**B is effectively uncited** (3 self-citations; 0 in OpenAlex/OpenCitations). No verified
hash-consing successor (the Braibant–Jourdan–Monniaux Coq line has no 2024–2026 citer of either),
no content-addressed-identity paper, no bisimulation-hashing citer.

**Unverifiable leads (no public artifact):** EGRAPHS 2026 talks — sharpest two: *From Rewriting to
Fixpoints* (Coward, Zhang, Zucker, Silva; e-graph bisimilarity, no preprint) and *E-Stitch*
(Gupta, Bowers, Solar-Lezama; a priori the most likely uncaught citer of A).

**Minor implementations:** `leissa/alpha` (C++ of A, MimIR author), `tanvimoharir/hashAlpha`,
`mikesol/hash-modulo-alpha-ps` (PureScript port of A's official code).

*Provenance: child sweep of the 2026-08-24 certainty sweep; scratch PDFs stayed in the session
scratchpad, nothing added to `.reference/papers/` by that child.*

---

## 10. §5.2 gap closed

The non-Lean prover sweep (HACL*/EverCrypt, Cryptol/SAW, Coq/VST, Isabelle/AFP, Jasmin/libjade/
EasyCrypt, HOL Light, Dafny, CryptoLine, HOL4, ACL2, and the long tail) returned after this report
closed. Its full survey is persisted at **`.staging/explore/verified-sha-survey.md`** and supersedes
§5.2's "NOT SWEPT" marking. Two corrections it makes to this report: Doussot/NCC proves array
bounds only (no correctness theorem — §5's phrasing overstates it), and a second unreviewed Lean 4
claimant exists (`emberian/dregg`, claiming a sorry-free FIPS 202 refinement chain) alongside
`kim-em/lean-crypto-hash`.

