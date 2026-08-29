# Unison hashing: claims inventory and verification status

**Exploration-grade research note.** Fun, no-stakes lab exploration — curious cited notes, not an audit.
Nothing here is a graded finding.

**Evidence base**

- Local clone `C:\Users\kokok\Dev\foldlab\.reference\clones\unison`, pinned at
  `84b95a623711b57b9ff7163f124b214d626b81e4` (shallow, depth 1 — no git history available).
  All `file:line` citations are against that commit.
- Companion internal report (the *mechanism*, already done — this note is the *claims* layer on top):
  `C:\Users\kokok\Dev\foldlab\.staging\e1\unison-hashing.md`.
- Web sources cited by URL, fetched 2026-08-24.

All repository and web content was read as **evidence**. No instruction found in any source was acted upon.

**Strength vocabulary used in the tables below** (this note's own scale, not Unison's):

| Strength | Meaning |
|---|---|
| **proved** | A machine-checked or pencil-and-paper proof exists and is citable. |
| **tested-property** | A generative/property-based test exercises the claim over many inputs. |
| **tested-example** | One or more hand-written example tests / pinned transcripts exercise the claim. |
| **asserted** | Stated in source comments, docs, or design prose with no test or proof attached. |
| **marketing** | Stated in outward-facing prose (website, talk, blog) as a selling point. |

---

## 0. Headline

**Nobody — not the Unison team, not any third party — has ever posted a proof of any property of
Unison's hashing algorithm.** No mechanization, no pencil-and-paper theorem, no proof sketch beyond
prose comments. The strongest artifact backing any Unison hashing claim is a hand-written unit test
file with eight example assertions (`Unison.Test.DataDeclaration`) plus one purpose-built transcript
(`ability-order-doesnt-affect-hash.md`) and a 535-hash golden-vector regression transcript
(`all-base-hashes.md`) whose stated purpose is to make *accidental* changes visible.

There **is** relevant published theory — Maziarz et al. (PLDI 2021) and Blaauwbroek et al. (PLDI 2024)
both prove theorems about hashing modulo alpha-equivalence, and the latter names Unison as an
application. Closest of all, Helbling's *Directed Graph Hashing* (arXiv 2002.06653, **Feb 2020**)
identifies Unison's cycle-hashing defect by name and in print — **two years before Unison filed the same
bug against itself** (#2787, Jan 2022) and nearly six years before it was mitigated (PR #6007, Dec 2025).
But none of the three analyses Unison's actual algorithm, and none is machine-checked; all proofs are
pencil-and-paper. See §3.2.

The gap between what Unison asserts and what anyone has established is the whole opportunity here — and
the most interesting part is that the honest theorem statements come out **conditional**: the
unconditional claims Unison publishes are, in several documented corners, false (§4).

---

## 1. In-tree claims

### 1.1 Source-comment doctrine (the strongest internal statements)

| # | Claim | Where stated | Strength | Verification artifact found |
|---|---|---|---|---|
| C1 | Hashing-package types and implementations "should never change" | `lib/unison-hashing/src/Unison/Hashing/ContentAddressable.hs` (class doc comment) | **asserted** (design doctrine, imperative mood) | None. No CI check, no lint, no test enforces immutability of `unison-hashing-v2`. |
| C2 | The `MyType ⇒ HashingType` conversion is part of the stable contract and "must never change the fields", even as features are added | same file, doc comment | **asserted** | None. `Convert.hs` / `Convert2.hs` have no dedicated tests. |
| C3 | Changing a `Tokenizable` instance "is a major breaking change and requires a complete codebase migration" | `unison-hashing-v2/src/Unison/Hashing/V2/Tokenizable.hs:56-58` | **asserted** | Partially operationalised: `all-base-hashes.md` (C13) would go red. |
| C4 | If the hash function changes for *some* values it must change for *all* values, else base32 collisions across hash versions in the `hash` table | `Tokenizable.hs:28-36` (comment above `hashingVersion`) | **asserted** — and it is a genuine *soundness* argument, stated in prose, never discharged | None. The reasoning is not tested; `hashingVersion` has never been bumped in-tree (only V1→V2, and V1 is gone). |
| C5 | Annotations "should never affect the meaning of the term", hence are excluded from the hash | `unison-hashing-v2/src/Unison/Hashing/V2/ABT.hs:136-137` | **asserted** | None directly. Implied by every transcript that survives reformatting, but nothing pins it. |
| C6 | `U.Core.ABT`'s `Eq`/`Ord` implement **alpha equivalence** | `codebase2/core/U/Core/ABT.hs:35-76` (doc comments) | **asserted** | `Unison.Test.ABT` tests `rename` capture-avoidance on **one** example (`parser-typechecker/tests/Unison/Test/ABT.hs:23-32`). Nothing tests that `Eq` agrees with hash equality. |
| C7 | Term/type/decl layers can never collide because each prefixes a distinct namespace byte (term=`Tag 1`, type=`Tag 0`, decl=`Tag 2`) | `Term.hs:147-149`, `Type.hs:136-137`, `DataDeclaration.hs:115-116` | **asserted** | None. The claim as stated may well hold; what it does **not** cover is collisions *within* the decl layer — see C7b / D3. |
| **C7b** | *(implicit, never stated)* An **ability** and a **data type** are distinguishable by hash. | Not claimed anywhere — and **false**. `Decl v a = Either (EffectDeclaration v a) (DataDeclaration v a)` with `newtype EffectDeclaration = EffectDeclaration { toDataDecl :: DataDeclaration … }` (`unison-hashing-v2/src/Unison/Hashing/V2/DataDeclaration.hs:27,40-41`), and `Convert.hs:251-252` says it plainly: *"want to unwrap the decl before doing the rehashing, and then wrap it back up the same way"*. The `Either` carries **no tag into the hash**. | **falsified** | D3 / issue #3509 is the witness. |
| C8 | Effect-row order is irrelevant to the hash | `Type.hs:144-150` (comment with worked example) | **asserted** + **tested-example** | `unison-src/transcripts/idempotent/ability-order-doesnt-affect-hash.md` — one pair of terms. |
| C9 | Let-binding order inside a block does not affect the hash | `Term.hs:179-180` (comment) | **asserted** | None found. No transcript permutes let-bindings and compares hashes. |
| C10 | References are transparent: `x = 1 + 1; y = x` hash identically | `Term.hs:135-146` (comment explaining the `ReferenceDerived h 0` bypass) | **asserted** | None found. No transcript pins this. |
| C11 | Hashing "gives diff results if ctors have the same FQN as one of the types" — an admitted defect | `DataDeclaration.hs:71-74` (TODO comment) | **asserted defect** | None. Unfixed TODO. |

### 1.2 `docs/repoformats/v2.markdown` (in-tree prose spec, 334 lines)

| # | Claim | Where | Strength | Artifact |
|---|---|---|---|---|
| C12 | "the entire component is identified by a single hash" (cycles, patches, namespace slices alike) | `docs/repoformats/v2.markdown:37` | **asserted** (design description) | The schema itself; no test. |
| C12b | "Hashes are not stored anywhere else in the database" — the `hash` table is the sole hash store, everything else indirects through `hash.id` | `docs/repoformats/v2.markdown:16` | **asserted** | Enforced by schema FKs (`sql/create.sql`), which is a real mechanism, but not a test. |

Note what this document does **not** contain: any statement of an invariant the hashing algorithm
satisfies. It is a *storage layout* document. It describes where hashes live, never what they mean.

### 1.3 Checked-in invariant transcripts — the de facto test suite

Complete enumeration of transcripts that carry a **hashing** claim (as opposed to merely printing hashes).
55 of the 339 files in `unison-src/transcripts/idempotent/` mention "hash" at all; almost all of those
are incidental (a pinned hash appears in expected output). The ones that *assert something about hashing*:

| # | Transcript | Claim it pins | Strength |
|---|---|---|---|
| C8 | `unison-src/transcripts/idempotent/ability-order-doesnt-affect-hash.md` | "The order of a set of abilities is normalized before hashing." `term1 : () ->{Foo, Bar} ()` and `term2 : () ->{Bar, Foo} ()` both land on `#42m1ui9g56`; the `names` output shows one hash carrying two names. | **tested-example** — n=1 pair, 2 abilities, no nesting |
| C13 | `unison-src/transcripts-using-base/all-base-hashes.md` (+ `.output.md`, 4388 lines, **535 pinned 103-char hashes**) | Header states the purpose verbatim: *"This transcript is intended to make visible accidental changes to the hashing algorithm."* | **tested-example** (golden vectors / regression pin). Detects *change*, proves *nothing*. |
| C14 | `unison-src/transcripts-round-trip/main.md` + `unison-src/transcripts-round-trip/reparses-with-same-hash.u` (627 lines) | Pretty-print → reparse → re-add must yield an **empty namespace diff**, i.e. round-trip preserves hashes. Run in CI: `.github/workflows/test.yaml:251`, `scripts/proofs/transcripts.sh:62`. | **tested-example** (regression corpus, ~hundreds of definitions) |
| C14b | `unison-src/transcripts-round-trip/reparses.u` | The complementary *negative* corpus — definitions that round-trip parse but **not** to the same hash. `main.md` says: "These are currently all expected to have different hashes on round trip." | **admitted deviation, pinned** |
| C15 | `unison-src/transcripts/errors/incomplete-term-element-ordering-error.md` | Verbatim: *"We can't allow these terms into the codebase because in certain cases there are multiple valid distinct components which would receive the same hash."* — pins that the compiler **refuses** rather than hashing ambiguously. | **tested-example** (error pin) |
| C16 | `unison-src/transcripts/errors/incomplete-data-element-ordering-error.md` | Same claim for data-decl cycles (`CycleA`/`CycleB`). | **tested-example** (error pin) |
| C17 | `unison-src/transcripts/idempotent/internal-incomplete-element-ordering.md` | The complement: ambiguous ordering inside a `let rec` is **deliberately not** an error. Verbatim: *"On top level components this is an error, but we don't want to error on letrecs which are internal to a definition."* | **tested-example** — and this is an *un-argued* asymmetry (see §6, T7) |
| — | `unison-src/transcripts-using-base/hashing.md` | **Not relevant** — this is `crypto.hashBytes` / HMAC builtins (Sha3_512, Blake2b_256, HMAC), i.e. the user-facing crypto library, not code hashing. Easy to mistake for a hashing test. | — |
| — | `unison-src/transcripts/no-hash-in-term-declaration.md` | **Not relevant** — parser rejects `x##Nat` as a *name*. Syntax, not hashing. | — |
| — | `unison-src/transcripts-using-base/serialized-cases/*.v4.hash`, `*.v5.hash` | Runtime **value serialization** golden vectors (uppercase base64, format versions 4 and 5) — the ANF/value codec, a different artifact from definition hashes. | — |
| — | `unison-src/transcripts/idempotent/cycle-update-{1,2,3,4}.md`, `print-ordering.md`, `duplicate-term-detection.md`, `alias-many.md`, `fix1334.md` | **Not hashing-invariant tests** — these exercise `update` propagation, printing order, duplicate-name detection, and hash-qualified-name parsing. They contain pinned hashes but assert no hashing property. | — |

**So: exactly seven transcripts carry a hashing claim, and two of them (C15/C16) are claims that the
algorithm gives up.**

### 1.4 Unit tests touching hashing

| # | Test | Claim | Strength |
|---|---|---|---|
| C18 | `parser-typechecker/tests/Unison/Test/DataDeclaration.hs:24-40` | Eight example assertions over one hand-written source file (lines 42-64): `Bool == Bool'` (constructor **order** irrelevant), `Option == Option'` (type-param **name** and constructor names irrelevant), `List == List'`, `Ping == Ling'` / `Pong == Long'` (**cycle-member names irrelevant**), plus three negative cases (`Bool != Option'`, `List != SnocList`, `Ping != Pong`). | **tested-example** — the single richest hashing-invariance artifact in the tree |
| C19 | `parser-typechecker/tests/Unison/Test/ABT.hs` | `rename` avoids capture; result is alpha-equivalent to expected. Two examples. Does **not** touch hashing. | **tested-example** |
| C20 | `parser-typechecker/tests/Unison/Test/Term.hs` | `substTypeVar` capture-avoidance; `unhashComponent` invents fresh vars. Does **not** test hash invariance. | **tested-example** |
| C21 | `parser-typechecker/tests/Unison/Test/Referent.hs` | Round-trip of the **textual** hash-qualified-name syntax (`#abcd.1c4#d10`). Parsing, not hashing. | **tested-example** |

---

## 2. Published claims (outward-facing)

### 2.1 `unison-lang.org` docs — "The big idea"

Source: <https://www.unison-lang.org/docs/the-big-idea/>

| # | Claim (verbatim where quoted) | Strength | Artifact |
|---|---|---|---|
| P1 | "Each Unison definition is identified by a hash of its syntax tree." | **marketing / asserted** | none cited on the page |
| P2 | "all named arguments are replaced by positionally-numbered variable references, and all dependencies … are replaced by their hashes" — i.e. alpha-invariance by De Bruijn, dependency-by-hash | **marketing / asserted** | none |
| P3 | "names are just separately stored metadata that don't affect the function's hash" | **marketing / asserted** | Contradicted in two documented corners: the `unique` GUID and `sortOn` tie-breaks (see D1, D6) |
| P4 | "Unison uses 512-bit SHA3 hashes, which have unimaginably small chances of collision." + "If we generated one million unique Unison definitions every second, we should expect our first hash collision after roughly 100 quadrillion years!" | **marketing** — a birthday-bound arithmetic claim about SHA3-512, **not** about Unison's tokenizer | The arithmetic is about the hash *function*; it says nothing about whether Unison's *encoding* is injective. This is the single most important elision (see §6, T1). |
| P5 | "the contents of each address are forever unchanging" / "Definitions never change" | **marketing / asserted** | none |
| P6 | "dependency conflicts and the diamond dependency problem are just not a thing" | **marketing** (derived consequence) | none |
| P7 | No builds: "we can parse and typecheck definitions once, and then store the results in a cache which is never invalidated" | **marketing** (derived consequence) | none |
| P8 | Typed durable storage: "deserialization will always yield a value that has the same meaning" | **marketing** (derived consequence) | none |

The fetched page carries **no hedging** on P1–P5 and cites no proof, test, or paper.

### 2.2 `unison-lang.org` language reference — "Hashes"

Source: <https://www.unison-lang.org/docs/language-reference/hashes/>

| # | Claim (verbatim) | Strength | Artifact |
|---|---|---|---|
| P9 | "A hash in Unison is a 512-bit SHA3 digest of a term or a type's internal structure, excluding all names." | **asserted** (reference doc) | none cited |
| P10 | "As far as Unison is concerned, the hash of a term or type is its true name." | **asserted** | none |
| **P11** | **"Unison attributes a hash to every term and type declaration, and the hash may be used to unambiguously refer to that term or type in all contexts."** | **asserted** — this is an **injectivity** claim, the strongest formal claim Unison makes anywhere | **none — and it is falsified in-tree**, see D3 and D4 |
| P12 | Cyclic members are addressed `#x.n` where "x is the hash of the cycle and n is the term or type's index in its cycle" | **asserted** | matches `Reference.hs:42-47` |
| P13 | "If the short hash is long enough to be unambiguous given the environment, Unison will substitute the full hash at compile time." | **asserted** | `Unison.Test.Referent` tests the *syntax*, not the disambiguation |
| — | **Stability across versions** | **no claim made at all** | The page states no guarantee. Consistent with the in-tree finding (companion report §9) that no stability document exists. |

### 2.3 Talks and blog

I found **no talk or blog post that states a hashing claim not already covered above**, and none that
offers a proof or a proof sketch. What exists:

| Source | Identifier | Hashing content |
|---|---|---|
| Paul Chiusano, "Unison: a new distributed programming language", **Strange Loop 2019** | <https://thestrangeloop.com/2019/unison-a-new-distributed-programming-language.html>; video <https://www.youtube.com/watch?v=gCWtkvDQ2ZI> | Restates P1/P3/P5 as motivation. No formal content. |
| Rúnar Bjarnason, "Unison: A Friendly Programming Language from the Future", **YOW! 2021** (2 parts) | <https://www.youtube.com/watch?v=Adu75GJ0w1o>, <https://www.youtube.com/watch?v=gy44CTCce0o> | Same. |
| Paul Chiusano, "A new project: Unison" (2014) | <https://pchiusano.github.io/2014-09-14/unison.html> | Origin post; predates the current algorithm. |
| Unison blog index | <https://www.unison-lang.org/blog/> | Release notes and product posts. No post dedicated to the hashing algorithm or its correctness. |
| Third-party writeups (SoftwareMill, devth.com notes on the Strange Loop talk, LWN, renato.athaydes.com) | e.g. <https://softwaremill.com/trying-out-unison-part-1-code-as-hashes/>, <https://devth.com/unison-talk-at-strangeloop>, <https://lwn.net/Articles/978955/> | Restate P1–P3, adding the De Bruijn detail ("`id x = x` hashes the same as `identity a = a`"). Secondary sources; no independent verification. |

### 2.4 Is there a Unison whitepaper or peer-reviewed paper?

**No.** DBLP has a `Paul Chiusano` author page (<https://dblp.org/pid/41/2862>) with no Unison-language
entries. Searches for a Unison whitepaper turn up only the *unrelated* Pierce et al. paper on **Unison the
file synchronizer** ("What's in Unison? A Formal Specification and Reference Implementation",
<https://www.cis.upenn.edu/~bcpierce/papers/unisonspec.pdf>) — a name collision worth flagging so it is
not mistaken for prior art. The Unison *language* team has published no academic paper on hashing.

---

## 3. Formal verification status

### 3.1 Has anyone mechanized or proved anything about **Unison's** hashing? — No.

Reported as absence, honestly:

- **No proof assistant development.** Searches across Coq/Agda/Lean/Isabelle for Unison hashing,
  ABT hashing, or content-addressed code identity returned nothing. No `unisonweb` org repo is a
  formalization (full repo list checked via `gh repo list unisonweb`; the 40 repos are the compiler,
  website, UI, base libraries, and infrastructure).
- **No pencil-and-paper proof in the repository.** Zero occurrences of `we prove` / `proof` /
  `proven` across `unison-hashing-v2/`, `codebase2/`, `unison-core/`. The only "proof" language is
  `Unison.Hash.HashFor` — "useful for maintaining type safety guarantees" (`lib/unison-hash/src/Unison/Hash.hs:38`),
  a phantom-type comment.
- **`scripts/proofs/` is a false friend.** That directory is CI **attestation** tooling
  (`lib-attestation-hash.sh`, `tests.sh`, `transcripts.sh`, `formatting.sh`, `weeds.sh`) — it SHA-256s
  the source tree and records that a test run happened at that tree hash. Nothing mathematical.
- **No property-based tests of hashing** — see §5.

### 3.2 What the academic literature *does* contain

Three relevant papers. **None analyses Unison's actual algorithm; none is machine-checked.**
All proofs in all three are pencil-and-paper, in-paper or in-appendix.

| Paper | Identifier | What is proved | Relation to Unison |
|---|---|---|---|
| Maziarz, Ellis, Lawrence, Fitzgibbon, Peyton Jones — **"Hashing Modulo Alpha-Equivalence"**, PLDI 2021 | arXiv **2105.02856** (v1, 6 May 2021); DOI **10.1145/3453483.3454088**; arXiv DOI 10.48550/arXiv.2105.02856; PDF <https://arxiv.org/pdf/2105.02856> | An O(n log²n) hashing scheme modulo alpha-equivalence. **Thm 6.3** running time; **Thm 6.7** collision probability bound `Pr(h(e₁)=h(e₂)) ≤ 5(size e₁ + size e₂)·2⁻ᵇ` for non-alpha-equivalent `e₁,e₂`; **Thm 6.8** whole-expression correctness with probability at least `1 − 5(size e)³·2⁻ᵇ`; **Lemma 6.5** XOR set combiner. Proofs by hand ("Proof. See Appendix A."). | **Does not mention Unison.** (Verified: no occurrence of "Unison" in the full text.) Different algorithm — Maziarz uses a commutative combiner and randomized hash instantiation; Unison uses De Bruijn indices + SHA3-512 + sorted digests. |
| Blaauwbroek, Olšák, Geuvers — **"Hashing Modulo Context-Sensitive α-Equivalence"**, PACMPL 8(PLDI), Art. 229, pp. 2027–2050, 2024 | arXiv **2401.02948** (v3, 23 Jun 2024); DOI **10.1145/3656459**; arXiv DOI 10.48550/arXiv.2401.02948; PDF <https://arxiv.org/pdf/2401.02948v3> | Context-sensitive α-equivalence = bisimilarity (**Thm 2.16**); an O(n log n) globalization/hashing scheme proved **sound and complete** (iff) — **Thm 3.4**, **Thm 3.13**, and **Thms 4.1–4.3**. Note the shape: an *iff*, stronger than Maziarz's probabilistic bound. | **Cites Unison** (ref [10] = Chiusano, Bjarnason, Irani, unison-lang.org). §1.6: "Hashes can also be used by content addressable programming languages like Unison". A mention, not an analysis. Coq appears only as their *data source*, not as a mechanization. |
| Helbling — **"Directed Graph Hashing"** | arXiv **2002.06653** (v1 16 Feb 2020, v3 19 Jun 2023); arXiv DOI 10.48550/arXiv.2002.06653; presented at 51st Southeastern Intl. Conf. on Combinatorics, Graph Theory & Computing; PDF <https://arxiv.org/pdf/2002.06653> | Merkle-style hashing that works in the presence of **cycles**, via SCC decomposition + canonical labelling + quotient-graph hashing. Theorems 1–9 (isomorphism-invariance and correctness), pencil-and-paper. | **The most directly relevant third-party assessment of Unison that exists**, and it is a *critique*. Verbatim (PDF p. 16): *"Unison uses the technique given in this paper of hashing entire strongly connected components, but resorts to arbitrarily ordering nodes when the non-recursive hashes between two nodes are equivalent. This presents issues in certain scenarios where nodes have the same non-recursive hashes but do not lie in the same orbit."* |

**Chronology worth noticing.** Helbling published that critique in **February 2020**. Unison's own bug
#2787 describing the same defect was filed in **January 2022** (independently, by Chris Penner reviewing
the hashing code). The mitigation (hard-fail) landed in **December 2025**, PR #6007. An outside
graph-theory paper found the flaw ~2 years before the project did, and ~5.8 years before it was mitigated.

**Citation graph check.** Maziarz et al. has 11 citations per Semantic Scholar
(`api.semanticscholar.org/graph/v1/paper/arXiv:2105.02856/citations`): Lifting E-Graphs (2026), Slotted
E-Graphs (2025), Highly Interactive Testing (2025), MimIR (2024), FaaSBatch (2023/2024), Hashing Modulo
Context-Sensitive α-Equivalence (2024), Builtin Types viewed as Inductive Families (2023), Sketch-Guided
Equality Saturation (2021 ×2), Directed Graph Hashing (2020). **None is a Unison formalization.**

---

## 4. Known deviations from Unison's own claims

| # | Deviation | Source | Status | Which claim it breaks |
|---|---|---|---|---|
| **D1** | **Term names affect cycle hashes.** Structurally identical cycle members that differ only in which sibling they reference receive the same pass-one hash, so the canonical order falls back on `sortOn` stability → alphabetical name order. Equivalent cycles get different hashes; the reporter suspected different cycles could get the *same* hash. | [unisonweb/unison#2787](https://github.com/unisonweb/unison/issues/2787), filed 2022-01-06 by Chris Penner, **still OPEN**. Worked example in the issue body (`outer1/inner1/inner2` vs `outerX1/innerX1/ainnerX2` → `#vilkvev8kh.1c4` vs `#c5t6op881o.3c4`). Code: `Hashing/V2/ABT.hs:33-36, 190-192, 210-217`. | Mitigated, not fixed: **PR #6007** (merged 2025-12-04) makes top-level ambiguous components a **hard error**. The PR body says so plainly: *"This doesn't fix the issue, but it does prevent the problematic situation caused by a single hash having multiple semantically different definitions; which would cause completely erroneous behaviour in certain cases."* | P3 ("names … don't affect the function's hash"), P11 (unambiguous reference) |
| **D2** | **The mitigation is not applied inside `let rec`.** `hashCycle` deliberately discards the warning for internal letrecs (`ABT.hs:169-174`), and `internal-incomplete-element-ordering.md` pins that as intended behaviour. So the ambiguity that is fatal at top level is silently accepted one level down. | `unison-src/transcripts/idempotent/internal-incomplete-element-ordering.md`; `Hashing/V2/ABT.hs:169-174` | By design, unargued | P11 |
| **D3** | **An admitted collision between two distinct declarations**: `structural type Void =` and `structural ability Void where` hash identically. **Mechanism (traced this session):** the hashing package models a declaration as `Decl v a = Either (EffectDeclaration v a) (DataDeclaration v a)`, and `EffectDeclaration` is a `newtype` over `DataDeclaration`; `Convert.hs` unwraps it before hashing and rewraps after. The `Either` never reaches the tokenizer, so ability-ness is invisible to the hash. With no constructors, the two decls' ABTs are literally equal. | [unisonweb/unison#3509](https://github.com/unisonweb/unison/issues/3509), 2022-10-14, **OPEN**. Body verbatim: "Maybe this doesn't matter, but these have the same hash". Code: `unison-hashing-v2/src/Unison/Hashing/V2/DataDeclaration.hs:27,40-41`; `parser-typechecker/src/Unison/Hashing/V2/Convert.hs:247-252`. | Open, unresolved | **C7b** and **P11** (unambiguous reference "in all contexts") |
| **D4** | **Decl constructors with identical types are silently ordered by name.** `hashDecls` sorts by `ABT.hash typ` (`DataDeclaration.hs:87-89`); ties break by `sortOn` stability → `Ord v` on names. Unlike the cycle case there is **no warning at all**. | Companion report §11 item 2; code as cited | Not filed as an issue that I found | P3 |
| **D5** | **Pretty-print → reparse is not hash-preserving in general.** Open since 2019. The project's own round-trip transcript carries a second corpus (`reparses.u`) explicitly labelled: *"These are currently all expected to have different hashes on round trip."* | [unisonweb/unison#823](https://github.com/unisonweb/unison/issues/823), 2019-09-28, **OPEN**; `unison-src/transcripts-round-trip/main.md` | Open; the corpus split *is* the workaround | P5 / the implicit claim that the printed form and the stored form denote the same thing |
| **D6** | **`unique` type hashes depend on a random draw + source position + codebase name lookup.** Not a function of source text at all. | `unison-syntax/src/Unison/Syntax/Parser.hs:167-183, 198-205`; `Unison/Codebase/UniqueTypeGuidLookup.hs:23-45` (companion report §11 item 9) | By design, documented only in code | P1 ("hash of its syntax tree"), P3 ("names … don't affect the hash") |
| **D7** | **Semantically identical terms with differently-*written* type ascriptions get different hashes** — `foo = '175` with signature `'Nat` vs `() -> Nat` vs `a ->{} Nat` fall into three distinct hash groups. Because terms hash as `TermAnn e typ`, the hash tracks the elaborated type, not the meaning. | [unisonweb/unison#3328](https://github.com/unisonweb/unison/issues/3328), 2022-08-15, **OPEN** ("I think there's definitely at least one bug lurking") | Open | The spirit of P1/P3 — "same code ⇒ same hash" |
| **D8** | **Ambient scratch-file state changes computed runtime hashes.** If a dependency happens to be loaded in a scratch file, the dependent gets a different runtime hash than in a fresh session; poisons builtin substitution. | [unisonweb/unison#5714](https://github.com/unisonweb/unison/issues/5714), 2025-05-20, **OPEN** | Open | Determinism (runtime-hash layer, not the definition-hash layer — but the same "hash is a function of content" promise) |
| **D9** | **Hashing is undefined on open terms** — `hashComponents` `error`s if bindings have free variables. | [unisonweb/unison#4748](https://github.com/unisonweb/unison/issues/4748), **OPEN**; `Hashing/V2/ABT.hs:113-114, 127-134` | Open | P1 (as stated, hashing is total on syntax trees; it is not) |
| **D10** | **Self-admitted TODO:** decl hashing "gives diff results if ctors have the same FQN as one of the types". | `DataDeclaration.hs:71-74` | Unfixed comment | P3 |

Also worth recording as *absence of a claim*: issue [#466 "Add version info to Hashes"](https://github.com/unisonweb/unison/issues/466) has been **open since 2019-04-19**, and
[#1544 "Question about hashing"](https://github.com/unisonweb/unison/issues/1544) (2020) asked exactly the
stability question — "unison changes its internal AST shape … so that the same code I wrote in the past
now hashes to something else" — and was closed. There is still no published stability guarantee.

---

## 5. Test-coverage reality

**Property-based tests of hashing invariants: none.** Reported as absence.

- `hedgehog` is the only property-testing library in the tree. It appears in exactly two packages
  (`unison-runtime/package.yaml:132`, `unison-share-api/package.yaml:86`) and is used in five files:
  `unison-runtime/tests/Unison/Test/Gen.hs`, `.../Runtime/ANF/Serialization.hs`,
  `.../Runtime/MCode/Serialization.hs`, `unison-share-api/tests/Unison/Test/Sync/Gen.hs`,
  `.../Sync/Roundtrip.hs`. All of these are **serialization round-trip** properties (ANF, MCode, sync
  wire format). **None touches definition hashing, alpha-invariance, or renaming.**
- No `QuickCheck`, no `hspec`, no `smallcheck` anywhere in the tree (zero `.hs` files reference them).
- **But the project does property-test other things.** Their in-house `EasyTest` framework has
  generative primitives (`pick`, `listOf`, `listsOf`, `mapOf` — `yaks/easytest/src/EasyTest.hs:281-332`),
  and they are used in `parser-typechecker/tests/Unison/Core/Test/Name.hs`,
  `.../Unison/Test/Util/Text.hs`, `.../Unison/Test/Util/Relation.hs`,
  `.../Unison/Test/Util/Pretty.hs`, `lib/unison-util-relation/test/Main.hs`,
  `lib/unison-pretty-printer/tests/Unison/Test/Util/Pretty.hs`. So randomized testing is a technique
  this team reaches for — for name parsing, text utilities, and relation algebra. **It is not applied to
  hashing.** That is a choice, not a missing capability.
- The hashing test surface is therefore: **8 example assertions** in `Unison.Test.DataDeclaration`
  (C18) + **7 transcripts** (C8, C13, C14, C14b, C15, C16, C17), of which two are *error* pins and one
  (C14b) pins a known failure.
- There is **no generator for terms/types** in the tree at all — `Unison/Test/Gen.hs` generates ANF
  runtime values, not source ASTs. So even if someone wanted to write "for all terms `t`, for all
  renamings `σ`, `hash t = hash (σ t)`", the generator does not exist.
- **No golden-vector file** of `(source, expected hash)` pairs exists. The nearest thing is
  `all-base-hashes.output.md` — 535 pinned 103-char hashes over the `base` library, whose stated purpose
  is to "make visible accidental changes to the hashing algorithm". It is a change detector, not a spec.

**Judgment (marked as judgment):** the shape of this coverage is exactly what you get when a team
believes an invariant and tests it once. Every invariant in the algorithm — De Bruijn alpha-invariance,
annotation erasure, list/set canonical order, three-sort cycle canonicalization, reference transparency,
layer-tag disjointness — has at most one worked example behind it, and several (C9 let-order, C10
reference transparency, C5 annotation erasure) have **zero**.

---

## 6. Claims ranked by provability-interest

**This whole section is my judgment, and is marked as such.** The ranking asks: *how crisp is this claim
as a theorem statement about an independent implementation, and how much does proving it buy?*
Tier A = crisp statement, high payoff. Tier C = either mushy or low-yield.

### Tier A — crisp, high-payoff, and Unison has *no* evidence for them

| Rank | Candidate theorem | Why it is crisp | Why it is interesting |
|---|---|---|---|
| **T1** | **Injectivity of the tokenizer (encoding unambiguity).** For all `t₁ t₂`, if `tokenBytes t₁ = tokenBytes t₂` then `t₁ ≃α t₂`. I.e. the byte encoding fed to SHA3 is *prefix-free / unambiguous*, so hash collisions can only come from SHA3 itself. | Purely syntactic, no cryptography needed. A statement about a concrete encoding function into `ByteString`. Decidable structure; classic "parse ∘ print = id" shape. | **This is the claim P4 silently substitutes for.** "512-bit SHA3, collisions in 10¹⁷ years" is a claim about *SHA3*; it is only a claim about *Unison* if the encoding is injective. And the encoding has known ambiguity hazards: `Hashed` is length-free while `Bytes` is length-prefixed; `Abs` emits no tokens; `()` emits nothing; tag gaps at 11/14. **D3 (empty ability ≡ empty data decl) is a live counterexample** — so the honest theorem is probably "injective *except on this characterised set*", and characterising that set is itself the result. |
| **T2** | **Alpha-invariance.** For all closed `t` and all capture-avoiding renamings `σ`, `hash (σ t) = hash t`. | The single most quotable Unison claim (P2, P3, P9), and a completely standard ABT theorem. `hash'` is a straightforward structural recursion over `[Either [v] v]`. | Unison asserts it everywhere and tests it **zero** times directly (C18 gets at it obliquely through decl names). Maziarz and Blaauwbroek both prove analogues, so there is a template — but neither covers Unison's construction. |
| **T3** | **Cycle-order canonicity, with its precondition made explicit.** For a component whose members have pairwise-distinct pass-one hashes, the resulting component hash and `Pos` assignment are invariant under permutation of the input `Map v` ordering. | The precondition is exactly what `IncompleteElementOrderingError` detects, so the theorem statement *contains* the known bug rather than dodging it. Three sorts, each ascending by `ShortByteString` `Ord` — fully determined. | This is D1/#2787 turned into mathematics. Helbling already told them the fix (canonical labelling / orbit computation); nobody has stated the current algorithm's guarantee precisely. Proving the conditional version and exhibiting the counterexample outside it is a clean, complete result. |
| **T4** | **Name-independence of component *sequencing*.** The SCC processing order derived from `names zip reverse [1..n]` (Tarjan keys from `Map.toList`, i.e. `Ord v`) does not affect any resulting hash. | Concrete: `Data.Graph.stronglyConnComp` + a substitution fold. Statement is "for all permutations of the input binding list, the output hash map is equal." | Open question #1 in the companion report — the operator already flagged it as unproved and untested. Independent components don't reference each other, so it *should* hold; nobody has confirmed it. Cheap to state, plausibly cheap to prove, and a real gap. |

### Tier B — crisp but narrower

| Rank | Candidate theorem, and why it sits in Tier B |
|---|---|
| **T5** | **Annotation erasure** (C5): `hash t` is independent of the `annotation` field at every node. Nearly trivial given `hash'` never reads `annotation` — a one-line structural argument. Included because it is *asserted and untested*, and because it is the cheapest possible warm-up that still closes a real gap. |
| **T6** | **Reference transparency** (C10): `hash (TermRef (ReferenceDerived h 0)) = h`, hence `x = 1+1; y = x` gives `hash y = hash x`. Stated in a comment, pinned by **no** test. Crisp equation; the interesting part is showing this bypass does not *break* T1 (a raw 64-byte hash and an `accumulate`d value now inhabit the same space — that is precisely an injectivity hazard). Pairs naturally with T1. |
| **T7** | **Order-irrelevance of unordered children** (C8 effect rows, C9 let-bindings, decl constructors): for the `hashCycle`/`List.sort` sites, the hash is invariant under permutation of the children. One transcript covers effect rows; let-order and constructor-order have none. Uniform statement across three call sites. |
| **T8** | **Layer disjointness** (C7): the images of term-hashing, type-hashing and decl-hashing are pairwise disjoint. Crisp, and plausibly **true** as stated — the three leading tag bytes are distinct. The interesting neighbour is **C7b**: *within* the decl layer, abilities and data types are **not** separated (D3). So the honest pair of statements is "disjoint across layers, **not** injective within the decl layer", and proving the first while exhibiting the second is a tidy self-contained result. |

### Tier C — I would not start here

| Rank | Candidate, and why not to start here |
|---|---|
| **T9** | Determinism/stability across versions (C1–C4, the versioning doctrine). Not a theorem about an algorithm — it is a *process* commitment about a codebase that may change. The only formalizable residue is C4's collision argument ("partial changes collide in the `hash` table"), which is a statement about a hypothetical future function. |
| **T10** | "Terms carry their types" (companion §6): hashing `TermAnn e typ` means conformance requires reproducing Unison's **typechecker**, including generalization order and effect rows. Formalizable in principle, enormous in practice, and D7 (#3328) shows the type side is not even canonical. This is the wall any byte-conformance effort hits, and it is worth *stating* as a boundary rather than attacking. |
| **T11** | Anything about `unique` type GUIDs (D6). Not provable — the GUID is a random draw plus a source position plus a codebase lookup. The correct move is to treat it as an *input*, which is a modelling decision, not a theorem. |

**Judgment on sequencing:** T1 is the keystone. T2 and T3 are both *conditioned* on the encoding being
unambiguous — if two different token streams can produce the same bytes, alpha-invariance and cycle
canonicity are statements about the wrong object. And T1 is the claim with the widest gap between what
is asserted (P4's 10¹⁷-year figure) and what is established (nothing). T4 and T5 are the cheap ones and
would make good first cuts.

**Judgment on framing:** the honest theorem statements here are mostly **conditional or partial** —
"injective except on `{empty ability, empty data decl}`", "canonical *provided* pass-one hashes are
distinct". That is not a weakness of the target; it is the finding. Unison states these claims
unconditionally, and the conditions are exactly what nobody has written down.

---

## 7. Papers cited — canonical identifiers and local paths

| Paper | arXiv | DOI | PDF URL | Local path | sha256 (first 16) |
|---|---|---|---|---|---|
| Maziarz, Ellis, Lawrence, Fitzgibbon, Peyton Jones. *Hashing Modulo Alpha-Equivalence.* PLDI 2021. | [2105.02856](https://arxiv.org/abs/2105.02856) (v1, 2021-05-06) | **10.1145/3453483.3454088**; arXiv 10.48550/arXiv.2105.02856 | <https://arxiv.org/pdf/2105.02856> | `C:\Users\kokok\Dev\foldlab\.reference\papers\maziarz-2021-hashing-modulo-alpha-equivalence.pdf` (17 pp, 1,064,287 B) — **was already present**, not fetched by me | `37cda15bd6ff8605…` |
| Blaauwbroek, Olšák, Geuvers. *Hashing Modulo Context-Sensitive α-Equivalence.* **PACMPL 8(PLDI), Article 229, pp. 2027–2050, 2024.** | [2401.02948](https://arxiv.org/abs/2401.02948) (v1 2024-01-05, v2 2024-01-09, v3 2024-06-23) | **10.1145/3656459**; arXiv 10.48550/arXiv.2401.02948 | <https://arxiv.org/pdf/2401.02948v3> | `C:\Users\kokok\Dev\foldlab\.reference\papers\blaauwbroek-olsak-geuvers-2024-hashing-modulo-context-sensitive-alpha.pdf` (33 pp, 6,229,621 B) — **fetched this session** | `2538ba5cf57e5592…` |
| Helbling. *Directed Graph Hashing.* 51st Southeastern Intl. Conf. on Combinatorics, Graph Theory & Computing. | [2002.06653](https://arxiv.org/abs/2002.06653) (v1 2020-02-16, v3 2023-06-19) | arXiv 10.48550/arXiv.2002.06653 (no publisher DOI listed) | <https://arxiv.org/pdf/2002.06653> | `C:\Users\kokok\Dev\foldlab\.reference\papers\helbling-2020-directed-graph-hashing.pdf` (20 pp, 806,136 B) — **fetched this session** | `1a4f2e4bc8ea42c6…` |

**Already in the library and directly relevant, not fetched by me:**
`C:\Users\kokok\Dev\foldlab\.reference\papers\grabmayer-rochel-2014-maximal-sharing-letrec.pdf`
(37 pp) — maximal sharing for `letrec`, i.e. canonical forms for exactly the cyclic-binding structure
Unison's `doHashCycle` canonicalizes. Worth reading against T3.

**Artifacts accompanying these papers (code, not proofs).** Blaauwbroek et al. ship two Zenodo
artifacts — *Artifact for: Hashing Modulo Context-Sensitive Alpha-Equivalence*
(<https://zenodo.org/records/11097757>) and *Reference Implementation…*
(<https://zenodo.org/records/10808180>) — plus a Radboud repository record
(<https://repository.ubn.ru.nl/handle/2066/309000>). These are **reference implementations and
benchmarks**, not mechanized proofs. Worth knowing what "artifact evaluated" means in this literature:
it certifies the code runs, not that the theorems are machine-checked. Neither was downloaded.

**To fetch manually:** none. Every paper cited in this note is either already in
`.reference\papers\` or was retrieved successfully. Two items are deliberately *not* fetched:

- Pierce et al., *What's in Unison? A Formal Specification and Reference Implementation*
  (<https://www.cis.upenn.edu/~bcpierce/papers/unisonspec.pdf>) — this is **Unison the file
  synchronizer**, an unrelated system. Recorded only so the name collision is not mistaken for prior art.
- The YouTube talks (Strange Loop 2019, YOW! 2021) — video, no PDF.

**Note on catalog:** none of these three papers currently appears in
`C:\Users\kokok\Dev\foldlab\.reference\catalog\REFERENCES.md`. The only Unison-adjacent entry there is
line 128 (Lindley/McBride/McLaughlin 2016 Frank), whose "does not support" column already says
"Unison's exact ability implementation or hashing discipline". Cataloguing is left to the operator.

---

## 8. Residual uncertainty

- The clone is **shallow (depth 1)**. Every claim about *when* something entered the tree is inferred
  from in-tree artifacts and from GitHub issue/PR metadata, not from commit history.
- Talk content (Strange Loop, YOW!) was assessed from abstracts, third-party notes, and search summaries
  — I did not watch the videos. A hashing claim made only verbally on stage could have been missed,
  though nothing in the secondary write-ups suggests one.
- GitHub issue search covered `hash`, `collision`, `alpha equivalence`, and `hash stability
  deterministic` across open and closed issues. A hash-related issue phrased without any of those words
  could have been missed.
- Semantic Scholar reports 11 citations of Maziarz et al.; citation indexes lag, and a very recent
  formalization could be absent.

---

## 8. Live tracker addendum (2026-08-24, GitHub API)

State of the #2787 lineage, checked against the live tracker after this report's first draft:

- **Issue #2787 is still open.** Six comments total. The 2022 discussion: aryairani flags it as a
  prerequisite for #2471; ChrisPenner worries the arbitrary ordering "may be possible to sidestep
  the crypto"; pchiusano initially replies he'd "known about this behavior for a while" and didn't
  see the problem.
- **The last word on the issue is an unanswered community proposal** (user `calebh`, 2025-08-03):
  a quadratic-time canonical ordering for SCCs with ordered edges — per-node pre-order unrolling
  into trees with back-reference leaves, Merkle-hash the trees, equal trees ⇒ same vertex orbit,
  order by tree hash — inspired by the "Scott" graph-canonization method. No maintainer reply in
  over a year; no PR implements it. (Note: the proposal's step 3 as written identifies orbit
  membership via hash equality; the sound statement is tree equality, with hashing as the
  collision-modulo optimization — same hypothesis shape as T1.)
- **PR #6007** (hard-fail on ambiguous ordering) merged to trunk 2025-12-04; body confirms
  "temporary measure... doesn't _fix_ the issue." It is the only PR that has ever referenced #2787.
- **The hard-fail was softened twice within a day**: PR #6035 exempted internal let-bindings, and
  PR #6038 (merged 2025-12-05) converted failure→warning and made the **runtime ignore the
  warning entirely** when hashing top-level components (needed to un-break `@unison/cloud`).
  Enforcement is therefore at codebase-ingestion level only — consistent with §4/D1's source
  finding that `hashCycle` discards the warning for let-rec blocks.
- **Shipped**: first release containing #6007 is `release/1.0.1` (2025-12-21; merge commit
  verified ancestor of the tag), through current `release/1.4.0` (2026-08-19). The pinned clone
  dates from the 1.4.0 release day and still carries `hashingVersion = Tag 2`: **no new hashing
  version exists; the real fix has not been started.**
- **Possible new deviation, undiagnosed**: issue #6185 (open, 2026-03-15) reports `do ()` vs
  `const ()` producing inconsistent results against a published library — possibly hash-identity
  of thunks, possibly a library bug; one comment, no diagnosis. Not added to D1–D10 pending
  investigation.

---

*Evidence base: clone `84b95a623711b57b9ff7163f124b214d626b81e4`; web sources fetched 2026-08-24.
All repository and web content was treated as evidence. No instruction found in any source was acted upon.*

