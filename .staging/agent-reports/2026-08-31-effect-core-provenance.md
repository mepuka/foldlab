# Effect Core v1 — resolving the packet's PENDING provenance rows

Date: 2026-08-31. Scope: `.staging/effect-core-v1/PLAN.md` §5 rows `EC1-PV01`
and `EC1-PV02`, the unpinned citations of the originating brief, and the
maintenance obligations a landing commit must discharge.

Nothing was fetched. Every digest below was computed locally from a file in
the working tree; every identifier not computed locally is marked with its
corroboration status.

Read for this report: `.staging/effect-core-v1/PLAN.md`, `.reference/README.md`,
`.reference/ORGANIZATION.md`, `.reference/MANIFEST.md`, `.reference/manifest.json`,
`.reference/provenance/README-papers.md`, `.reference/provenance/papers.lock.json`,
`.reference/provenance/papers-lock/build_ledger.py`,
`.reference/provenance/papers-lock/condense.py`,
`.reference/provenance/papers-lock/titles.json`,
`.reference/provenance/sources.lock.json`, `.reference/catalog/PAPERS.md`,
`.reference/catalog/REFERENCES.md`, `.reference/catalog/README.md`,
`.reference/papers/README.md`, `.gitignore`, `docs/lab-core/TOOLS.md`,
`docs/SPECS.md`, `AGENTS.md`, `mise.toml`,
`library/effects/{package.json,tsconfig.json,bun.lock}`,
`library/effects/scripts/patch-toolchain.ts`, `library/cas/Cas/Lang/Fragments.lean`,
and the PDF at the repository root.

---

## 1. `EC1-PV01` — EffHOL

### 1.1 The file and its computed identity

The file the packet cites is at the repository ROOT:

| Field | Value |
| --- | --- |
| Current path | `/Users/pooks/Dev/foldlab/2506.09458v1.pdf` |
| sha256 | `a493e698895878136a71e9ffdaaf9ece786cdd30864f853149cd69cec774ad0c` |
| bytes | `777345` |
| Title as printed | Syntactic Effectful Realizability in Higher-Order Logic |
| Authors as printed | Liron Cohen (Ben-Gurion University), Ariel Grunfeld (Ben-Gurion University), Dominik Kirst (Ben-Gurion University / Inria Paris), Étienne Miquey (Aix Marseille Univ., CNRS, I2M) |
| Identifier printed in the document | `arXiv:2506.09458v1 [cs.LO] 11 Jun 2025` |
| DOI / ISBN printed on pages 1–2 | none — scanned with the same regexes `condense.py` uses; only the arXiv stamp matches |
| PDF producer metadata | `LaTeX with hyperref` / `pdfTeX-1.40.25`, CreationDate 2025-06-11 |

Both values were computed twice (`shasum -a 256` and a Python `hashlib` read) and
agree. The byte length is `stat` on the same file.

**It has no lock row.** `papers.lock.json` holds 88 papers; a scan of every
`id`, `path`, `title` and `identifier` for `2506.09458`, for `realizab`,
`effectful`, and `monad` returns zero hits. The packet's §5 row is therefore
accurate as written: `EC1-PV01` is unpinned, and under C6 (`AGENTS.md` §C6) no
assertion in the packet may rest on it until the row lands.

### 1.2 Where the PDF must physically live, and what `.gitignore` implies

**It must move to `.reference/papers/`.** The paper corpus generator
(`.reference/provenance/papers-lock/build_ledger.py`, `main()`) builds its file
table from a glob of `.reference/papers/*.pdf` — supplied through `files.json`,
whose documented construction in `.reference/provenance/README-papers.md` step 3
is exactly `pathlib.Path(".reference/papers").glob("*.pdf")`. A PDF at the
repository root is invisible to that glob, so it cannot acquire a lock row while
it sits there, no matter what is hand-written about it.

Proposed final path, following the corpus's `author-year-slug` filename
convention (87 of 88 stems match it; the sole exception is
`16146_Tree_Based_Premise_Selec`):

```
.reference/papers/cohen-2025-effhol-syntactic-effectful-realizability.pdf
```

The stem is the lock `id`, so the choice is substantive. `cohen-2025-…` is
distinct from the existing `cohen-johnsonfreyd-2024-core-why3-coq` (a different
Cohen — Cyril, not Liron); if the operator prefers the corpus's multi-author
style (`fadaei-sammler-2025-hitrees`,
`frumin-timany-birkedal-2024-guarded-interaction-trees`), the alternative is
`cohen-grunfeld-kirst-miquey-2025-effhol`. Renaming does not touch the bytes, so
the digest and byte length above hold under either choice.

**The `.gitignore` policy implies the PDF is never committed, and that is
already correct rather than a problem to fix.** Two rules cover it:

- `.gitignore:20` — `.reference/papers/*.pdf`, under the comment "Paper PDFs
  stay local-only: the public repo must not redistribute publisher-copyrighted
  documents."
- `.gitignore:29` — `/*.pdf`, added because "a PDF dropped at the root slipped
  the net."

`git check-ignore -v 2506.09458v1.pdf` reports `.gitignore:29`; after the move it
will report `.gitignore:20`. Either way the file is ignored, so **moving it
changes nothing about what is committed** — it changes only whether the corpus
generator can see it. The policy is blanket by directory, so no per-paper
licence judgment is made or needed: arXiv's own terms are irrelevant to the rule
as written.

What the commit carries instead is the identity: the lock row, the generated
`PAPERS.md` row, the `titles.json` entry, and the cluster tuple. This is the
contract `.reference/papers/README.md` states — "The corpus is therefore **not**
part of the repository; it is per-host evidence. What the repository carries
instead is enough to rebuild and verify it."

### 1.3 The cluster: none of the eleven fits, so a twelfth must be declared

Cluster choice is not optional. `build_ledger.py` raises
`SystemExit("cluster assignment is not a partition: …")` when a file in
`.reference/papers/` has no declared cluster, so dropping the PDF into the
directory without a role makes the generator refuse to run. That refusal is the
mechanism `README-papers.md` names: "a file added to `.reference/papers/` cannot
enter the corpus without being given a declared role."

Each existing cluster's `Supports` line, checked against what the paper is:

| Cluster | Why it does not take EffHOL |
| --- | --- |
| `semantics-carriers` | Supports "Carriers for programs with effects, recursion, and nontermination — interaction trees and their descendants — together with the equational and coinductive machinery that makes them provable." EffHOL supplies no carrier and no coinduction. Its computational layer is a one-step β-reduction `⇝` on a typed λ-calculus with a monadic `let x ← p₁ in p₂` (§III-B), deliberately generic — "EffHOL is agnostic to the details of the computational effects". It is not a descendant of interaction trees and shares no ancestry with the twelve papers there. Filing it here would be a C6 role defect on the twelve as much as on the newcomer. |
| `type-effect-lineage (E1)` | Supports "The declarative and algorithmic systems behind the typechecker and ability model this estate compares itself to; the specification shape any typechecker-equivalence claim must take." EffHOL has higher-kinded polymorphism and a type system, but no typechecking algorithm is its subject and no estate typechecker compares itself to it. The cluster's `Does not support` line is also hardcoded to two members — "which neither paper treats" — so adding a third silently falsifies the generated prose. |
| `translation-validation` | Supports "How a generated artifact is made trustworthy without trusting its generator." EffHOL's realizability translation extracts a realizer from a proof (§V); it is proof-to-program extraction with a constructive soundness theorem, not per-run validation of a generator's output. |
| `crypto-proof-frameworks` | Supports probabilistic programs, oracles and adversary games in a higher-order logic. Wrong subject entirely. |
| `proof-assistant-internals`, `proof-automation-ml`, `normative-standard`, `hash-mechanization`, `canonical-hashing`, `crypto-toolchains`, `side-channel-preservation` | No overlap. |

**Proposed twelfth cluster.** Id `effectful-program-logic`, title "Program logics
and realizability for effectful computation". It is a genuinely new role in this
corpus: every existing effect-related source is a *carrier* (`semantics-carriers`)
or a *type system* (`type-effect-lineage`), and none is a *logic whose judgments
are about effectful computations*. That is exactly the role the packet asks of
`EC1-PV01` — "Its computation/program/specification separation is advisory only."
EffHOL's three-layer stratification is the thing being borrowed: programs typed
by types, expressions typed by indices, specifications built from expressions
(§III), with a modality `⟨x ← p⟩ φ` binding the result of running `p` (§III-A) and
the Hoare-triple abbreviation `{Φ} x ← p {φ} ≜ Φ ⇒ ⟨x ← p⟩ φ` (§III-C).

### 1.4 The Supports / Does not support wording the cluster demands

Written to the shape `build_ledger.py` renders (`**Supports.** …` /
`**Does not support.** …`) and to the boundary `PAPERS.md` §"Reading this index"
enforces — "A cluster's **Supports** line is the only use its members are
admitted for."

> **Supports.** Stating a property of an effectful computation as a judgment in
> a logic rather than as a property of a carrier: a modality that binds the
> result of running a program, its Hoare-triple abbreviation, and the
> stratification of programs, the expressions that index them, and the
> specifications that describe them into three separate syntactic layers.
> Also the shape of a framework parameterized by a monad so that one set of
> rules covers several effects, and the shape of an extraction that reads a
> program off a proof.

> **Does not support.** Any total-correctness or termination reading. The
> consistency result concerns the core logical system only: §III-C records that
> "while ⊥ is underivable, ⟨x ← p⟩ ⊥ may be derivable for some ps", and the
> framework deliberately admits instantiations "realizing no meaningful logic".
> Termination is a separately stated specification in this system
> (`p ↓τ := (⟨x ← p⟩ ⊥) ⊃ ⊥`, Example 1), never a property of the modality.
> Nor does it supply a carrier, a handler semantics, an operational model of any
> concrete effect, a decision procedure, or any claim about Effect TypeScript,
> `Effect.Effect<A, E, R>`, or this estate's `Prog`.

**On the overclaim guard specifically.** The task's caution is exactly right and
the wording above encodes it. The full passage, §III-C, immediately after
Proposition 2 ("EffHOL is consistent"):

> "Importantly, the consistency of Prop. 2 only concerns the core logical system
> of EffHOL and not the derived triples. That is, while ⊥ is underivable,
> ⟨x ← p⟩ ⊥ may be derivable for some ps. Indeed, we allow for instantiations of
> the computational system, including ones realizing no meaningful logic."

The consequence for `EC1-S4`/`EC1-S8`/`EC1-S12`: a triple `{Φ} x ← p {φ}` in this
system is a **partial-correctness** statement. Deriving `⟨x ← p⟩ φ` does not
witness that `p` produces a result — it constrains `φ` on the results `p`
produces, of which there may be none. Any packet text that reads the modality as
"after running `p`, `φ` holds" is one word away from a total-correctness claim
the source does not make; the safe reading is "when `x` is the result of running
`p`". Example 1's `p ↓τ` exists precisely because non-divergence is not free.
Note also that `⇝` is a *one-step* β-reduction and rule `(⇝)` is anti-reduction
closure, so no evaluation-to-a-value judgment is in the system at all.

### 1.5 The generator inputs (the lock is generated, never hand-edited)

`README-papers.md` opens with "The [paper lock] and the catalog's [local paper
corpus] are generated, never hand-edited." So the deliverable is four input
edits plus a regeneration run, not an edit to `papers.lock.json`.

**(a) `.reference/provenance/papers-lock/titles.json`** — the one hand-maintained
input, adding one key:

```json
"cohen-2025-effhol-syntactic-effectful-realizability": "Syntactic Effectful Realizability in Higher-Order Logic"
```

**(b) `files.json`** (step 3, transient) — the entry the digest script produces:

```json
{"file": "cohen-2025-effhol-syntactic-effectful-realizability.pdf", "bytes": 777345, "sha256": "a493e698895878136a71e9ffdaaf9ece786cdd30864f853149cd69cec774ad0c"}
```

**(c) `identity.jsonl`** (step 2, transient) — what `condense.py` will emit. Its
`ARXIV` regex is `arXiv[:\s]\s*([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)`, which matches
the margin stamp `arXiv:2506.09458v1`; no `10.xxxx/…` or ISBN appears on pages
1–2, so `doi` and `isbn` come back empty:

```json
{"stem": "cohen-2025-effhol-syntactic-effectful-realizability", "arxiv": ["2506.09458v1"], "doi": [], "isbn": [], "head": "Syntactic Effectful Realizability in Higher-Order Logic Liron Cohen Ariel Grunfeld Dominik Kirst Étienne Miquey …"}
```

**(d) `build_ledger.py`'s `CLUSTERS`** — one new tuple, placed after
`semantics-carriers` and before `translation-validation` so the rendered cluster
table reads in the same order:

```python
    (
        "effectful-program-logic",
        "Program logics and realizability for effectful computation",
        "Stating a property of an effectful computation as a judgment in a logic rather than as a property of a carrier: a modality that binds the result of running a program, its Hoare-triple abbreviation, and the stratification of programs, the expressions that index them, and the specifications that describe them into three separate syntactic layers. Also the shape of a framework parameterized by a monad so that one set of rules covers several effects, and the shape of an extraction that reads a program off a proof.",
        "Any total-correctness or termination reading. The consistency result concerns the core logical system only: §III-C records that while ⊥ is underivable, ⟨x ← p⟩ ⊥ may be derivable for some ps, and the framework deliberately admits instantiations realizing no meaningful logic. Termination is a separately stated specification in this system, never a property of the modality. Nor does it supply a carrier, a handler semantics, an operational model of any concrete effect, a decision procedure, or any claim about Effect TypeScript or this estate's Prog.",
        ["cohen-2025-effhol-syntactic-effectful-realizability"],
    ),
```

### 1.6 The lock row that regeneration will produce

This is the exact JSON `papers.lock.json` needs — the object `build_ledger.py`
constructs for this stem, in the field order it writes:

```json
{
  "id": "cohen-2025-effhol-syntactic-effectful-realizability",
  "path": ".reference/papers/cohen-2025-effhol-syntactic-effectful-realizability.pdf",
  "title": "Syntactic Effectful Realizability in Higher-Order Logic",
  "cluster": "effectful-program-logic",
  "identifier": {
    "scheme": "arXiv",
    "value": "2506.09458v1"
  },
  "content": {
    "algorithm": "sha256",
    "digest": "a493e698895878136a71e9ffdaaf9ece786cdd30864f853149cd69cec774ad0c",
    "bytes": 777345
  }
}
```

Entries are `sorted(…, key=lambda e: e["id"])`, so it lands between
`chappe-2023-choice-trees` and `cohen-johnsonfreyd-2024-core-why3-coq`.

The corresponding `PAPERS.md` table row, rendered by `identifier_markdown()` and
the 16-character digest truncation:

```
| Syntactic Effectful Realizability in Higher-Order Logic | [arXiv:2506.09458v1](https://arxiv.org/abs/2506.09458) | `a493e69889587813…` |
```

Once the row exists, `.staging/effect-core-v1/PLAN.md` §5's `EC1-PV01` row moves
from PENDING to PINNED and its "Permitted use" column must be replaced by a
pointer to the cluster's `Supports` line — the catalog is the owner of role
scoping, and `ORGANIZATION.md` forbids duplicating an owner's contract into a
second document.

---

## 2. The originating brief's nine citations

The brief itself is not in the tree: a repository-wide grep for `1312.1399`,
`2302.01415`, `1406.2061`, `1608.06499`, and `0902.2137` returns no hits in any
tracked `.md`, so the nine were checked directly against the lock.

Method: every `id`, `path`, `title`, and `identifier` in
`.reference/provenance/papers.lock.json` (88 entries) was scanned for each
identifier and for the title keywords `algebraic effect`, `handler`, `scope`,
`hefty`, `higher-order effect`, `koka`, `row`, `dijkstra`, `selective`,
`realizab`, `effectful`, `monad`, `compcert`, `leroy`, `plotkin`, `pretnar`,
`wu`, `schrijvers`, `ahman`, `mokhov`.

### The split: three PINNED (four rows), seven ABSENT

| # | Source as cited by the brief | Status | Lock key / retrievable identifier |
| --- | --- | --- | --- |
| 1 | Plotkin & Pretnar, *Handling Algebraic Effects* (arXiv:1312.1399) | **ABSENT** | doi:`10.2168/LMCS-9(4:23)2013` (preferred — version-free); arXiv:`1312.1399` |
| 2 | Wu, Schrijvers, Hinze, *Effect handlers in scope* / scoped operations (LICS 2018) | **ABSENT**, and the citation is two works fused | doi:`10.1145/2633357.2633358` and doi:`10.1145/3209108.3209166` — see below |
| 3 | Bach Poulsen & van der Rest, higher-order effects (arXiv:2302.01415) | **ABSENT** | arXiv:`2302.01415`; doi:`10.1145/3571255` |
| 4 | HITrees (arXiv:2510.14558) | **PINNED** | `fadaei-sammler-2025-hitrees` |
| 5 | Interaction Trees (arXiv:1906.00046) | **PINNED**, two rows | `xia-2020-interaction-trees` and `xia-2020-interaction-trees-popl-published` |
| 6 | Choice Trees (arXiv:2211.06863) | **PINNED** | `chappe-2023-choice-trees` |
| 7 | Leijen, Koka row-polymorphic effects (arXiv:1406.2061) | **ABSENT** | arXiv:`1406.2061`; doi:`10.4204/EPTCS.153.8` |
| 8 | Ahman et al., *Dijkstra Monads for Free* (arXiv:1608.06499) | **ABSENT** | arXiv:`1608.06499`; doi:`10.1145/3009837.3009878` |
| 9 | Leroy, CompCert (arXiv:0902.2137) | **ABSENT** | arXiv:`0902.2137`; doi:`10.1007/s10817-009-9155-4` — see below, three different artifacts are in play |
| + | Mokhov et al., *Selective Applicative Functors* (doi:10.1145/3341694) | **ABSENT** — the "CORPUS PIN PENDING" note is still true | doi:`10.1145/3341694` |

### The four PINNED rows, in full

| Lock key | Cluster | Identifier | sha256 (16) | bytes |
| --- | --- | --- | --- | --- |
| `fadaei-sammler-2025-hitrees` | `semantics-carriers` | arXiv:2510.14558v1 | `86389e257dc4b0bd…` | per lock |
| `xia-2020-interaction-trees` | `semantics-carriers` | arXiv:1906.00046v2 | `943dc278978b9d85…` | per lock |
| `xia-2020-interaction-trees-popl-published` | `semantics-carriers` | doi:10.1145/3371119 | `4cc833d5d09f520e…` | per lock |
| `chappe-2023-choice-trees` | `semantics-carriers` | arXiv:2211.06863v1 | `87cae08d3a3c0156…` | per lock |

All four are already cited in `PLAN.md` §5's PINNED rows with these digests, so
the packet's PINNED half is accurate. Their permitted use is
`.reference/catalog/PAPERS.md#semantics-carriers` — "Carriers for programs with
effects, recursion, and nontermination …", with the explicit boundary "A settled
carrier decision for this estate. No domain decision selects any of these
representations." `EC1-R02`'s block-graph choice is therefore the packet's own
decision and cannot cite these four as support for it, which §5's closing
paragraph already states correctly.

### Detail on the seven ABSENT sources

Corroboration status is stated for each: **in-tree** means the identifier is
independently recorded somewhere in this repository; **model-supplied** means it
comes from the assistant's knowledge and should be confirmed against the fetched
document's own printed identifier before the lock row is written (which the
corpus procedure does anyway — `condense.py` reads the identifier off the PDF).

**1. Plotkin & Pretnar, *Handling Algebraic Effects*.**
Deterministic identifier: doi:`10.2168/LMCS-9(4:23)2013` — Logical Methods in
Computer Science 9(4:23), 2013. **In-tree corroborated**:
`docs/research/effect-modeling-wasm-interoperability-optimization-frontier.md:564`
carries exactly this DOI, and the same line is mirrored at
`library/effects/research/docs/research/effect-modeling-wasm-interoperability-optimization-frontier.md:564`.
The arXiv id `1312.1399` given by the brief is not recorded anywhere in the tree;
prefer the DOI, which carries no version suffix and so is deterministic without
further resolution.

**2. Wu, Schrijvers, Hinze — the citation names two different papers.**
This row cannot be fetched as written. "Effect handlers in scope" and "scoped
operations (LICS 2018)" are separate publications with different author lists:

- Wu, Schrijvers & Hinze, *Effect Handlers in Scope*, Haskell Symposium 2014 —
  doi:`10.1145/2633357.2633358`. No arXiv preprint. **Model-supplied.**
- Piróg, Schrijvers, Wu & Jaskelioff, *Syntax and Semantics for Operations with
  Scopes*, LICS 2018 — doi:`10.1145/3209108.3209166`. Hinze is **not** an author
  of this one; Piróg and Jaskelioff are. **Model-supplied.**

Whichever the packet actually needs for `EC1-R06`'s named body/exit regions, it
must be split into its own row before a pin can be resolved. As one row it is
un-fetchable and the author attribution is wrong for the LICS half — which is an
attribution defect under `AGENTS.md` "Citing or borrowing" ("credited and
attributed, always"), not only a provenance one.

**3. Bach Poulsen & van der Rest, higher-order effects.**
arXiv:`2302.01415` — *Hefty Algebras: Modular Elaboration of Higher-Order
Algebraic Effects*, POPL 2023, doi:`10.1145/3571255`. **Model-supplied**; not
recorded anywhere in the tree. Note the brief's arXiv id is the deterministic
handle here provided the fetched `vN` is recorded; `2302.01415` bare will resolve
to the latest version, which is exactly the drift `README-papers.md` guards
against by reading the identifier off the document.

**7. Leijen, Koka.**
arXiv:`1406.2061` — *Koka: Programming with Row-Polymorphic Effect Types*, MSFP
2014, doi:`10.4204/EPTCS.153.8` (EPTCS 153, pp. 100–126). **Model-supplied.**
Koka appears in the tree only as prose and a repository link
(`docs/research/effect-modeling-wasm-interoperability-optimization-frontier.md:81,576`),
never as a pinned paper. A related Koka-lineage paper *is* pinned in a different
lane — `lorenzen-leijen-2023-fp2-fully-in-place`, digest
`761b769251955ea58ec1fe5b3d78ce714120e8db2684cf937198e98dd4821db1` per
`.staging/explore/lean-host-capabilities.md:250` — but that is FP², not the
row-polymorphic effect-types paper, and it is not in `papers.lock.json` either.

**8. Ahman et al., *Dijkstra Monads for Free*.**
arXiv:`1608.06499`; POPL 2017, pp. 515–529, doi:`10.1145/3009837.3009878`.
The DOI is **model-supplied**, but the venue, page range and full author list
(Ahman, Hriţcu, Maillard, Martínez, Plotkin, Protzenko, Rastogi, Swamy) are
**corroborated in-tree** — they are reference [16] of the EffHOL PDF now sitting
at the repository root, which the fetch for `EC1-PV01` puts in the corpus anyway.

**9. Leroy, CompCert — three different artifacts, none pinned.**
The tree contains three distinct CompCert citations and no lock row for any of
them:

- `arXiv:0902.2137` (the brief) — *A Formally Verified Compiler Back-end*,
  Journal of Automated Reasoning 43(4):363–446, 2009,
  doi:`10.1007/s10817-009-9155-4`. **Model-supplied**; not in the tree.
- `.staging/explore/concrete-absorb-path.md:1107,1183` — the CACM 52(7) paper,
  doi:`10.1145/1538788.1538814`, with a proposed filename
  `leroy-2009-compcert-cacm.pdf`, 200,102 bytes, sourced from the author's
  homepage. **In-tree.** `.staging/explore/papers-registration-proposal.md:161,196`
  proposes registering it as `leroy-2009-compcert-cacm`; that proposal never
  landed — the stem is absent from `papers.lock.json` and from `titles.json`.
- `.reference/catalog/REFERENCES.md:58,128` — the *CompCert manual*
  (`https://compcert.org/man/manual001.html`, release 3.17, February 2026),
  catalogued as "Pattern" with the boundary "C compiler theorem, not TypeScript
  or Effect". This is a catalog row, not a lock row, and it points at a live web
  page rather than a digested artifact.

If `EC1-S13`/`EC1-S14` want the pass-by-pass simulation shape, the JAR paper is
the right artifact and the brief's `0902.2137` is the right handle; the CACM
paper is the four-page overview. Deciding which is a role question, not a fetch
question, and it should be settled before the fetch so only one lands.

**+. Mokhov et al., *Selective Applicative Functors* — the note is still true.**

`library/cas/Cas/Lang/Fragments.lean:283` reads:

```
  and free construction. **CORPUS PIN PENDING** — SAF is not yet
  G0-pinned in `.reference/provenance/papers.lock.json`; the row in
  `.reference/catalog/REFERENCES.md` carries the same status.
```

Both halves verify. `papers.lock.json` has no entry for
doi:`10.1145/3341694` and no title containing "selective"; and
`.reference/catalog/REFERENCES.md:63` still reads "**corpus pin pending**, not
yet in the [paper lock]". The note is accurate as of this commit.

Three attendant findings:

- **Line drift.** `.staging/operational-structure/LANGUAGE-POLICE.md:214` and
  `:323` locate the note at `Cas/Lang/Fragments.lean:257`. In the main tree it is
  at line 283. The pointer is stale by 26 lines.
- **The counter is gated.** The string is not decoration: `library/cas/tools/`
  scans doc comments for it (`Obl.lean:107` maps the spellings
  `["pin pending", "pin-pending"]` to the `pin-pending` state; `Obl.lean:357` and
  `Debts.lean:123` emit a `pinPending` count; `MetaShapes.lean:285` declares
  `pin-pending` in the state enum) and `Obligations.lean:174-175` asserts
  `stateCount base "pin-pending" == 1` over the self-test corpus. So pinning SAF
  changes a generated count, and `mise run gen` plus the clean-tree assertion in
  `mise run check` will catch a half-done edit. See the checklist in §4.
- **An article number is recorded two ways for the same DOI.**
  `library/cas/Cas/Lang/Fragments.lean:277` and
  `.reference/catalog/REFERENCES.md:63` both say "PACMPL 3(ICFP) art. 90";
  `docs/entity-store/research/demand-provenance-survey.md:879` and `:1429` both
  say "Art. 101". One pair is wrong. The DOI `10.1145/3341694` is unambiguous and
  is the deterministic handle regardless; the article number should be corrected
  from the fetched document rather than adjudicated from memory.

---

## 3. `EC1-PV02` — the `@effect/tsgo` pin

### 3.1 What is actually pinned today

**Package manifest** (`library/effects/package.json`), `devDependencies`, all
exact — no ranges:

| Package | Version |
| --- | --- |
| `typescript` | `7.0.2` |
| `@effect/tsgo` | `0.38.0` |
| `oxlint-tsgolint` | `7.0.2001` |
| `oxlint` | `1.80.0` |
| `oxlint-plugin-effect` | `0.11.0` |
| `effect-oxlint` | `0.3.4` |
| `vitest` | `4.1.11` |
| `@effect/vitest` | `4.0.0-rc.112` |
| `@types/bun` | `1.4.0` |

`dependencies` are `effect`, `@effect/platform-bun`, `@effect/sql-sqlite-bun`,
all at `4.0.0-rc.112`, with `foldlab.effectProvenance` naming lock row
`effect-runtime` and commit `2600f62f4532026928454dcea8d1c48557b3f942` — the
AGENTS.md dependency law satisfied for the runtime, and the model for what
`EC1-PV02` still lacks.

**Lockfile** (`library/effects/bun.lock`) carries integrity hashes for each:
`typescript@7.0.2` `sha512-8FYau96o3NKOhbjKi/qNvG/W5jhzxkbdm5sj9AbZ/5T5sWqn3hJgLfGx27sRKZWTvyzCP8dLRBTf5tBTSRVUNA==`,
`@effect/tsgo@0.38.0` `sha512-eazN0kX+WNT1jNjIm/l5esnkpKVfd1wNh2ig0pfaULKuI2PZh0JwjbepDPUr6MWx5cqOiUgwStNf5hGhg2w00g==`.
`bun install --frozen-lockfile` is the first step of `mise run check:effects:ts`
(`mise.toml:687`), so these are enforced on every run of the gate.

**Installed state** (this Mac, `library/effects/node_modules/`):
`typescript@7.0.2` with `gitHead 2bd066d87f5bafd315be9f40889d0a60b9e58e0b`;
`@effect/tsgo@0.38.0` declaring `repository.url https://github.com/Effect-TS/tsgo.git`,
`directory _packages/tsgo`, MIT.

**The patch has actually been applied here, and it is verifiable by digest.**
`library/effects/scripts/patch-toolchain.ts` runs
`effect-tsgo patch --typescript --oxlint` from `prepare`, resolving the patcher by
module path (`node_modules/@effect/tsgo/dist/effect-tsgo.cjs`) rather than PATH so
that `bun pm pack` does not die on a missing `.bin` shim. What the patch does is
binary substitution, and the tree shows both sides:

| File | sha256 | bytes |
| --- | --- | --- |
| `node_modules/@typescript/typescript-darwin-arm64/lib/tsc` | `e6a722f9cee1bf9d6fdcfb175fd5b173c75cc9eb9fd149f5d7f44f1e2f30bab3` | 29,812,978 |
| `node_modules/@effect/tsgo-darwin-arm64/lib/tsc` | `e6a722f9cee1bf9d6fdcfb175fd5b173c75cc9eb9fd149f5d7f44f1e2f30bab3` | 29,812,978 |
| `node_modules/@typescript/typescript-darwin-arm64/lib/tsc.original` | `a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2` | 23,653,616 |

The installed `tsc` is byte-identical to the Effect build, and the stock compiler
is retained beside it as `tsc.original`. The same pattern holds for the linter:
`node_modules/@oxlint-tsgolint/darwin-arm64/` contains both `tsgolint` and
`tsgolint.original`. So `bun run typecheck` → `tsc --noEmit` in
`library/effects` is running the Effect-patched TS7 compiler, not stock
TypeScript 7.0.2.

`@effect/tsgo-darwin-arm64/lib/upstream.json` records what that binary was built
from: `typescript` `7.0.2` at `gitHead 2bd066d87f5bafd315be9f40889d0a60b9e58e0b`,
provider `typescript-go`; `oxlint-tsgolint` `7.0.2001` at
`gitHead 482dcf70bffce7ea56f63128c74beb67dec658a2`; `oxlint` `1.80.0` at
`gitHead 97e99b85483776a72928d675cc05b1cfc1130ba0`. This file is a resolvable
upstream identity that the estate is not currently reading.

**Config** (`library/effects/tsconfig.json`): `strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noEmit`, `allowImportingTsExtensions`,
`moduleResolution: bundler`, `target ES2022`, `include: ["src"]`, `$schema` pointing at
`./node_modules/@effect/tsgo/schema.json`, and a `plugins` entry naming
`@effect/language-service` with 24 named diagnostics set to `"off"` (the file's own
comment explains the silencing: style suggestions firing ~99 times per run on
settled committed patterns).

### 3.2 Does the packet's claim match the tree?

**On versions: yes, exactly.** `PLAN.md` §2 says `docs/lab-core/TOOLS.md`
"records the repository's TS7 successor path: exact `typescript@7.0.2`, exact
`@effect/tsgo@0.38.0`, and Effect diagnostics as hygiene evidence only." The
TOOLS.md tsgo row's 2026-08-29 role extension says precisely that — "`library/effects`
typechecks under the stable TS7 line — `npm:typescript@7.0.2` exactly, patched by
`@effect/tsgo@0.38.0` (`effect-tsgo patch --typescript --oxlint`) … those
diagnostics are hygiene evidence only and never enter a claim" — and
`package.json` plus `bun.lock` plus the installed `node_modules` all agree. No
version discrepancy exists.

**Three precision defects, none of them a version mismatch:**

1. **"The" TS7 path is two paths.** TOOLS.md's tsgo row admits *two* lines at
   once: the dev channel `npm:@typescript/native-preview@7.0.0-dev.20260707.2`
   (used by `bun x tsgo --noEmit` in the lift harness and in
   `mise run check:extract-oxc`, `mise.toml:920`) and the stable line
   `typescript@7.0.2` + `@effect/tsgo@0.38.0` (used by `library/effects`). The
   packet's sentence collapses them into one "TS7 successor path". `EC1-R19` and
   `EC1-S14` need to say which one is the generated-source oracle; today
   generated Effect Core TypeScript would plausibly be typechecked by the
   stable line, but the packet does not say so.

2. **`EC1-PV02` names the wrong repository.** `PLAN.md` §5's `EC1-PV02` row cites
   `https://github.com/Effect-TS/language-service`. The lock's pending row and the
   catalog both name a different repository:
   - `.reference/provenance/sources.lock.json`, `pendingRepositoryPins`:
     `{"id": "effect-tsgo", "repository": "https://github.com/Effect-TS/tsgo", "requiredBefore": "diagnostic-or-compilation-claims"}`
   - `.reference/catalog/REFERENCES.md:18` (Pinned subject source): "[Effect tsgo](https://github.com/Effect-TS/tsgo) | Must receive an exact revision before use"
   - `.reference/catalog/REFERENCES.md:122` (Observed candidate baselines): a
     tsgo revision `eba879be6067a82df8483660a351d239af1b3e01` with "embedded
     TypeScript-Go 1bcfa18d79a3be41772223d5c05dfe4480e614ff"

   The installed package settles it: `@effect/tsgo@0.38.0` is published from
   `Effect-TS/tsgo`, `_packages/tsgo`. `Effect-TS/language-service` is a
   different repository — the TS5-era language-service plugin — and it is **not
   installed at all**: `ls node_modules/@effect/` shows `platform-bun`,
   `platform-node`, `platform-node-shared`, `sql-sqlite-bun`, `tsgo`,
   `tsgo-darwin-arm64`, `vitest`, and no `language-service`. The `plugins` entry
   in `tsconfig.json` names `@effect/language-service` because that is the
   plugin identity the language service registers under inside the patched
   binary, not because a package by that name is on disk. `EC1-PV02` should be
   restated against `Effect-TS/tsgo` and the `effect-tsgo` lock row, or split
   into two rows if the packet genuinely needs the plugin repository too.

3. **The `sources.lock.json` rows are bare, i.e. pending-*resolution*, not
   pending-promotion.** The v2 schema note distinguishes the two: a row carrying
   a `revision` object is "an OBSERVED pin awaiting full promotion"; a row
   without one "keeps the v1 meaning: an unresolved selector". Both relevant rows
   are bare:

   ```json
   {"id": "typescript",   "repository": "https://github.com/microsoft/TypeScript", "requiredBefore": "source-extraction-or-compilation"}
   {"id": "effect-tsgo",  "repository": "https://github.com/Effect-TS/tsgo",       "requiredBefore": "diagnostic-or-compilation-claims"}
   ```

   Compare `lean4-tree-sitter` in the same array, which carries `revision`
   (`3a57f55e…`, tag `v0.2.4`, `selector` note), `rootTree`, `receipt`, and
   `receiptRow`. That is the shape `EC1-PV02` has to reach.

### 3.3 What `EC1-PV02` still needs to become a resolvable pin

Four things, in order:

1. **Restate the row against `Effect-TS/tsgo`** (or add a second row if the
   plugin repository is separately needed), so the packet and the lock name the
   same artifact.
2. **Resolve `effect-tsgo` to a commit.** Add a `revision` object — `kind:
   "commit"`, `algorithm: "sha1"`, `digest`, `url`, `tag` (the published
   `@effect/tsgo@0.38.0` tag), `selector` — plus a `rootTree`, matching the
   `lean4-tree-sitter` shape. The npm tarball integrity in `bun.lock`
   (`sha512-eazN0kX+…`) is a *distribution* pin and does not discharge this: the
   estate's law, as `effect-runtime` demonstrates, is that the npm version and the
   source commit must name each other.

   **Do not reuse the observed candidate.** `REFERENCES.md:122` records tsgo
   `eba879be6067a82df8483660a351d239af1b3e01` from the 2026-08-24 sweep, and that
   section states its own status: "These revisions were observed during the
   2026-08-24 sweep. They are discovery aids, not project pins; only the
   provenance source lock can promote a candidate into a canonical project
   identity." It is also demonstrably stale for the installed package: the
   candidate names embedded TypeScript-Go `1bcfa18d79a3be41772223d5c05dfe4480e614ff`,
   while `@effect/tsgo@0.38.0`'s own `upstream.json` names typescript-go gitHead
   `2bd066d87f5bafd315be9f40889d0a60b9e58e0b` for typescript 7.0.2. The two do not
   describe the same build, so the pin must be resolved fresh against
   `@effect/tsgo@0.38.0`, not lifted from the candidate row.
3. **Resolve `typescript` the same way**, since `@effect/tsgo`'s binary is a
   build of typescript-go and `EC1-R19`'s oracle claim rests on both.
   `@effect/tsgo-darwin-arm64/lib/upstream.json` already carries the two gitHeads
   (`2bd066d87f5bafd315be9f40889d0a60b9e58e0b` for typescript 7.0.2, provider
   `typescript-go`; `482dcf70bffce7ea56f63128c74beb67dec658a2` for
   oxlint-tsgolint 7.0.2001), and `node_modules/typescript/package.json` carries
   the same `gitHead`. These are *observations from an installed artifact*, not
   resolutions — they must be checked against the upstream repositories before
   they become lock `revision` values, exactly as the schema note describes for
   the tree-sitter rows.
4. **Write a receipt** under `.reference/provenance/receipts/` and name it from
   the row (`receipt` + `receiptRow`), following
   `lean4-tree-sitter-stage1-standup.json`. The patch is a mutation of
   `node_modules`, so the receipt should carry the three digests recorded in
   §3.1 — patched `tsc`, `tsc.original`, and the `@effect/tsgo-*` source binary —
   which is what makes "the gate ran the Effect-patched compiler" a checkable
   statement rather than a claim about a script having been run.

Until (1)–(4) land, `EC1-PV02` stays PENDING and `EC1-R19`/`EC1-R24`/`EC1-S14`
may not stamp G0 on the source-tooling half. The lock's own
`requiredBefore: "diagnostic-or-compilation-claims"` says exactly this.

---

## 4. Maintenance obligations — the checklist for the landing commit

Sources: `.reference/MANIFEST.md` §"Maintenance contract" and §"Review
checklist"; `.reference/manifest.json` `maintenance.{addDocument,changePin}`;
`docs/SPECS.md:12-16` ("**Maintenance law.** A new spec lands with a row here and
a pointer in its domain's AGENTS.md, in the same change …"); `AGENTS.md` C4/C6
and "Citing or borrowing"; `.reference/provenance/README-papers.md`.

### A. Landing `EC1-PV01` (the EffHOL pin)

- [ ] Move `2506.09458v1.pdf` from the repository root to
      `.reference/papers/cohen-2025-effhol-syntactic-effectful-realizability.pdf`.
      It stays gitignored (`.gitignore:20`); nothing is added to the index.
- [ ] Add the `titles.json` entry (§1.5a) —
      `.reference/provenance/papers-lock/titles.json`.
- [ ] Add the `effectful-program-logic` tuple to `CLUSTERS` in
      `.reference/provenance/papers-lock/build_ledger.py` (§1.5d). Without it the
      generator refuses to run.
- [ ] Regenerate **both** artifacts by the four-step procedure in
      `.reference/provenance/README-papers.md`, on a host holding the corpus:
      `.reference/provenance/papers.lock.json` and `.reference/catalog/PAPERS.md`.
      Hand-editing either is forbidden by that file's opening sentence.
- [ ] Update the hand-written count in `.reference/papers/README.md`: "Thirty-eight
      of the eighty-eight entries carry no public identifier". The corpus becomes
      89 papers; the null-identifier count stays 38 (verified: EffHOL prints an
      arXiv id), so the sentence becomes "Thirty-eight of the eighty-nine".
      This file is **not** generated — the generator only rewrites `PAPERS.md`'s
      own "88 papers are held locally" line.
- [ ] Update `.staging/effect-core-v1/PLAN.md` §5: move the `EC1-PV01` row from
      PENDING to PINNED, cite `.reference/catalog/PAPERS.md#effectful-program-logic`
      and the digest, and replace the ad-hoc "Permitted use" text with the
      cluster's `Supports` line (`ORGANIZATION.md`: "Do not copy a pin, term
      definition, or claim ladder into multiple owners; link to the owner").
- [ ] Add rows to `.reference/MANIFEST.md`'s Inventory table and to
      `.reference/manifest.json` for the paper-lock artifacts. **They are missing
      today** — a JSON scan of `manifest.json` finds `sources.lock` and
      `REFERENCES.md` but no `papers.lock`, no `PAPERS.md`, no `README-papers`, no
      `fips202.lock`, and no `receipts`. So the maintenance contract's step 2
      ("update manifest.json and this inventory in the same change") is currently
      undischargeable for the whole paper corpus. This commit is the natural place
      to close it; if the operator prefers to keep it a separate act, the gap
      should at least be recorded, because the `MANIFEST.md` review checklist item
      "every manifest path exists" is silently vacuous for these files.
- [ ] Verify all local Markdown links resolve (`MANIFEST.md` review checklist).

### B. Landing `EC1-PV02` (the tsgo pin)

- [ ] `.reference/provenance/sources.lock.json` — add `revision` + `rootTree` (+
      `receipt`, `receiptRow`) to the `effect-tsgo` and `typescript` rows in
      `pendingRepositoryPins`. This is the canonical identity;
      `manifest.json`'s `changePin` step 1 says edit only this file for it.
- [ ] `.reference/provenance/receipts/<name>.json` — new receipt carrying the
      resolution evidence and the three binary digests from §3.1.
- [ ] `.reference/catalog/REFERENCES.md:18` — the "Effect tsgo" pinned-subject-source
      row currently reads "Must receive an exact revision before use". Update it to
      name the resolved revision, without copying the pin (`MANIFEST.md`: "update
      catalog descriptions only when their supported claim or explicit non-claim
      changes").
- [ ] `.reference/catalog/REFERENCES.md:122` — the observed-candidate row for tsgo
      (`eba879be…`, 2026-08-24) is superseded once the lock carries a real revision.
      Mark it superseded rather than deleting it, and do not let a reader mistake it
      for the pin: it names a different embedded typescript-go commit than the
      installed `@effect/tsgo@0.38.0` does.
- [ ] `docs/lab-core/TOOLS.md` — the tsgo row's trust statement says "Version
      drift of either line (dev-channel or stable) is a re-admission event".
      Landing a source pin is not drift, but the row should name the lock rows so
      the register and the lock point at each other, as the Effect runtime family
      row already does.
- [ ] `.staging/effect-core-v1/PLAN.md` §5 — correct `EC1-PV02` from
      `Effect-TS/language-service` to `Effect-TS/tsgo` (finding §3.2.2), and move
      it to PINNED once the revision lands.
- [ ] `library/effects/package.json` — consider a `foldlab.tsgoProvenance` block
      mirroring the existing `foldlab.effectProvenance`, so the npm version and
      the lock row name each other in both directions (AGENTS.md dependency law).

### C. If SAF is pinned in the same commit

- [ ] Fetch, place, `titles.json`, cluster tuple, regenerate — same as (A). SAF
      needs a cluster too; `type-effect-lineage` is the closest existing one and
      its two-member `Does not support` wording would have to be rewritten.
- [ ] `library/cas/Cas/Lang/Fragments.lean:283` — remove the "**CORPUS PIN
      PENDING**" marker and cite the lock row.
- [ ] `.reference/catalog/REFERENCES.md:63` — remove "**corpus pin pending**, not
      yet in the [paper lock]".
- [ ] `mise run gen` then `mise run check` — the `pin-pending` count is generated
      (`library/cas/tools/Obl.lean:357`, `Debts.lean:123`) and `check` asserts a
      clean tree after `gen` (`mise.toml:781-783`), so a half-done edit fails the
      gate. `library/cas/tools/Obligations.lean:174-175` asserts the count is 1
      over the *self-test* corpus, which is synthetic and unaffected.
- [ ] `.staging/operational-structure/LANGUAGE-POLICE.md:214,323` — the pointer
      says `Fragments.lean:257`; the note is at :283. Fix or drop the line number.
- [ ] Resolve the art. 90 / art. 101 disagreement (§2) from the fetched document.

### D. Standing gaps this commit cannot close, and must not pretend to

- **Neither artifact is gen-derived, so neither is gated.**
  `.reference/provenance/README-papers.md` §"Standing gap" says `mise run gen`
  does not regenerate `papers.lock.json` or `PAPERS.md`, so `mise run check`
  cannot detect drift between them and the corpus. Confirmed against
  `mise.toml`: neither `check` (`:781`) nor `check:ci` (`:759`) touches
  `.reference/` at all, and there is no link-check or manifest-validation task.
  Wiring them in is named there as an operator decision (Python is not in
  `mise.toml`; the inputs are gitignored and single-host).
- **No `docs/SPECS.md` row is owed by this work.** The SPECS maintenance law
  binds *specs*; a provenance pin is not one. If the Effect Core packet is later
  promoted out of `.staging/`, that promotion owes a SPECS row and an AGENTS.md
  pointer in the same change — but promotion is explicitly outside this packet
  (`PLAN.md` §2, "Ratification, any edit to `docs/SPECS.md`, and any promotion
  out of `.staging/` are outside this packet").
- **The pin does not promote any claim.** `PLAN.md` §7 stands: no theorem name in
  the packet satisfies any gate. A resolved `EC1-PV01` makes the citation legal
  under C6; it does not make EffHOL support anything beyond its cluster's
  `Supports` line, and §1.4's boundary is the operative limit.
