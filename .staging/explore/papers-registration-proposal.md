# Paper-corpus registration proposal — 27 unregistered PDFs

## RATIFIED 2026-08-25 (operator, relayed by the main-session coordinator)

Operator ruling: "go with recommendations." Itemized verdicts, binding for the landing run:

1. **Koprowski**: land "unresolved — pinned by digest". No condense.py change in this landing;
   never land the truncated DOI. A regex fix may be proposed later as its own reviewed change.
2. **Cluster boundary**: option (i) — jourdan-pottier-leroy and lasser-casinghino-fisher-roux
   STAY in translation-validation; add the boundary sentence to both cluster role lines
   (translation-validation = validate-each-output; verified-parsing = verify-the-parser).
3. **Cluster name**: `verified-language-comparators` ratified. Hoare/Necula/Morrisett stay in
   it; no foundations split this round.
4. **Dolstra**: land "unresolved — pinned by digest"; the identifier() ISBN extension is
   queued as a later reviewable code change, outside this landing.
5. **Roles and titles**: all four §3 role drafts and all 27 §4 titles approved as drafted.
   PL-theory cluster not declared (empty). The 11 no-extractable-DOI entries land unresolved
   per house rule. Why3/Creusot stay outside the partition pending a human-browser fetch.

Proceed per §6; snapshot date at the landing runner's judgment; clear the standing-warning
blocks in hash-db-anatomy.md §9.3 and lean-host-capabilities.md finding 24 only after the
verification script passes over all 115. Single-writer rule: whoever lands announces before
touching CLUSTERS/titles.json; no second writer while a landing run may be live.

Status: assembled 2026-08-24 late evening, awaiting operator ratification.
Nothing below has been landed: `papers.lock.json`, `PAPERS.md`,
`build_ledger.py`, and `titles.json` are all untouched. Cluster roles are
editorial machinery, so the cluster drafts in §3 are proposals, not decisions.
Everything in §1–§2 is demonstrated fact (artifact run tonight), not report.

## 1. Corpus state, verified

- `.reference/papers/` holds **115 PDFs**; the lock registers **88**; the
  **27** unregistered stems are listed in §3 by proposed cluster.
- All 27 were written 2026-08-24 between 22:34 and 22:49 local, in four
  bursts whose sizes match the four writers' receipts exactly (§2). The
  earlier "~19 predate tonight" attribution is refuted by file mtimes.
- The main research session (foldlab-a7) declared a fence at ~22:55: all its
  writers are done, no further drops. Count re-verified stable after fence.
- **Every receipted sha256 and byte count matches the file on disk — 27/27.**
- No duplicate digests anywhere in the 115; the suspected Verus double-fetch
  resolved to a single stem (`lattuada-2023-verus`, one overwrite, absorb
  agent's receipt is authoritative as agreed).
- Pipeline certification: the documented regeneration chain (liteparse →
  condense → files.json → `build_ledger.py`) restricted to the 88 registered
  papers reproduces both committed artifacts **byte-identically** (one
  mechanical caveat: Python on Windows writes CRLF; the committed files are
  LF; normalize at landing). The landing diff will therefore be exactly the
  new entries plus the header count.

## 2. Attribution and receipts

| Burst (22:xx) | Files | Writer | Receipts |
|---|---|---|---|
| 34:28 | 1 | hash-db-anatomy probe | `hash-db-anatomy.md` §9.3 (full identity + used-for) |
| 40:16–40:32 | 5 | lean-host-capabilities agent | `lean-host-capabilities.md` §2 table (digests + source URLs) |
| 46:31–46:37 | 10 | syntax-grammar-design agent | `syntax-grammar-design.md` §5.3 lineages + receipts table (digests, URLs, per-lineage placement) |
| 47:27–49:48 | 11 | concrete-absorb agent | `concrete-absorb-path.md` sources appendix (digests, URLs, identifiers, per-paper Used-for lines) |

Negative receipts: pl-theory-curriculum and language-design-case-studies
agents fetched nothing into the corpus. The "PL-theory curriculum" cluster
candidate is therefore **empty this round and must not be declared** — the
generator errors on a cluster naming no paper.

Still outside the partition (not yet fetched, needs a human browser —
`inria.hal.science` serves an anti-bot interstitial): Filliâtre & Paskevich
*Why3* (ESOP 2013) and Denis, Jourdan & Marché *Creusot* (ICFEM 2022); open
records and used-for lines are in the absorb appendix.

## 3. Proposed clusters — DRAFT, for ratification

Supports / Does-not-support lines drafted from the writers' own used-for
lines; reword freely, the stems are the load-bearing part.

### 3a. `content-addressed-stores` (1 paper)

**Supports (draft).** System-level store designs that identify artifacts by
hash: what an input-addressed versus a content-addressed store path commits
to, what identity the address carries, and what the store can and cannot
guarantee at each point on that axis.

**Does not support (draft).** Term-level hashing and alpha-invariance
(owned by the canonical-hashing cluster), and any claim about this estate's
own addressing scheme.

    dolstra-2006-purely-functional-software-deployment

Alternative considered and disfavored: widening canonical-hashing's role to
admit a systems thesis would dilute a well-scoped, proof-oriented cluster.

### 3b. `verified-parsing` (10 papers)

**Supports (draft).** The verified-parsing record across its lineages —
validated LR, verified parser interpreters and generators, derivative-based
parsing, and invertible lexing/printing: what was proved, in which
assistant, and at what cost.

**Does not support (draft).** Any claim that a published approach transfers
to this estate without restatement; each theorem binds its own grammar
formalism and toolchain.

    koprowski-binsztok-2011-trx-verified-parser-interpreter
    chassot-kuncak-2025-verified-invertible-lexing-ziplex
    delaware-2019-narcissus-decoders-encoders
    edelmann-hamza-kuncak-2020-zippy-ll1-derivatives
    blaudeau-shankar-2020-verified-packrat-peg-pvs
    ouedraogo-2024-coqlex-verified-lexers
    adams-2016-complexity-parsing-with-derivatives
    mishra-jagannathan-2023-morpheus-parser-combinators
    dvorak-2026-verified-grammars-lean4-thesis
    zhuchko-2025-finiteness-symbolic-derivatives-lean

**Open ruling needed.** The existing translation-validation cluster already
holds `jourdan-pottier-leroy-2012-validating-lr1-parsers` and
`lasser-casinghino-fisher-roux-2019-verified-ll1-parser-generator`, and the
syntax report's lineage survey claims both. Options: (i) declare
verified-parsing alongside and leave those two where they are (smallest
diff, two clusters then share a subject boundary that needs a sentence in
each role line); (ii) move both stems into verified-parsing and narrow
translation-validation to non-parser validation (touches two existing lock
entries' cluster field). No recommendation recorded; this is a role-boundary
ruling.

### 3c. `lean-runtime` (5 papers)

**Supports (draft).** The runtime model of the host language's compiled
code: reference counting optimized for purely functional programs, reuse
and in-place update, and the Lean/Koka lineage's cost record.

**Does not support (draft).** Kernel-checked evaluation and reduction
(owned by proof-assistant-internals), and any performance claim about this
estate's artifacts.

    ullrich-demoura-2019-counting-immutable-beans
    ullrich-demoura-2019-counting-immutable-beans-appendix
    reinking-xie-2021-perceus-garbage-free-refcounting
    reinking-xie-2020-perceus-tech-report
    lorenzen-leijen-2023-fp2-fully-in-place

### 3d. `verified-language-comparators` (11 papers) — name needs ratification

The fleet's working name was "Concrete-absorb references"; that names one
probe lane, and catalog roles should outlive one document. Proposed
lane-neutral name above; the absorb lane's per-paper used-for lines remain
in its own appendix either way.

**Supports (draft).** The comparator record for verified languages and
systems — axiomatic contracts, proof-carrying code, typed assembly,
auto-discharge verifiers, verified compilers and kernels, and Rust-lineage
verification — for calibrating cost, trust boundaries, and architecture
choices.

**Does not support (draft).** Any transferred guarantee, and any verdict on
a lane's claims; comparators calibrate, they do not adjudicate.

    hoare-1969-axiomatic-basis
    necula-1997-proof-carrying-code
    morrisett-1998-system-f-to-tal
    leino-2010-dafny
    swamy-2016-fstar-multimonadic-effects
    leroy-2009-compcert-cacm
    klein-2009-sel4
    oconnor-2016-cogent
    jung-2018-rustbelt
    astrauskas-2019-prusti
    lattuada-2023-verus

Note: Hoare, Necula, and Morrisett could also seed a "foundations" cluster;
they are kept here because the receipts' used-for lines tie all three to the
comparator role. Re-partitioning is a one-line change before the generator
run if ruled otherwise.

## 4. titles.json additions — drafted transcriptions

Transcribed from each document's own first pages. Two documents have text
layers that do not decode (Hoare, Necula); their titles were transcribed
visually from page-1 renders, which the "as printed" rule permits — they are
read off the document, not inferred.

```json
{
  "adams-2016-complexity-parsing-with-derivatives": "On the Complexity and Performance of Parsing with Derivatives",
  "astrauskas-2019-prusti": "Leveraging Rust Types for Modular Specification and Verification",
  "blaudeau-shankar-2020-verified-packrat-peg-pvs": "A Verified Packrat Parser Interpreter for Parsing Expression Grammars",
  "chassot-kuncak-2025-verified-invertible-lexing-ziplex": "Formally Verified Linear-Time Invertible Lexing",
  "delaware-2019-narcissus-decoders-encoders": "Narcissus: Correct-By-Construction Derivation of Decoders and Encoders from Binary Formats",
  "dolstra-2006-purely-functional-software-deployment": "The Purely Functional Software Deployment Model",
  "dvorak-2026-verified-grammars-lean4-thesis": "Pursuit of Truth and Beauty in Lean 4: Formally Verified Theory of Grammars, Optimization, Matroids",
  "edelmann-hamza-kuncak-2020-zippy-ll1-derivatives": "LL(1) Parsing with Derivatives and Zippers",
  "hoare-1969-axiomatic-basis": "An Axiomatic Basis for Computer Programming",
  "jung-2018-rustbelt": "RustBelt: Securing the Foundations of the Rust Programming Language",
  "klein-2009-sel4": "seL4: Formal Verification of an OS Kernel",
  "koprowski-binsztok-2011-trx-verified-parser-interpreter": "TRX: A Formally Verified Parser Interpreter",
  "lattuada-2023-verus": "Verus: Verifying Rust Programs using Linear Ghost Types (extended version)",
  "leino-2010-dafny": "Dafny: An Automatic Program Verifier for Functional Correctness",
  "leroy-2009-compcert-cacm": "Formal verification of a realistic compiler",
  "lorenzen-leijen-2023-fp2-fully-in-place": "FP2: Fully in-Place Functional Programming",
  "mishra-jagannathan-2023-morpheus-parser-combinators": "Morpheus: Automated Safety Verification of Data-dependent Parser Combinator Programs",
  "morrisett-1998-system-f-to-tal": "From System F to Typed Assembly Language",
  "necula-1997-proof-carrying-code": "Proof-Carrying Code",
  "oconnor-2016-cogent": "Refinement through Restraint: Bringing Down the Cost of Verification",
  "ouedraogo-2024-coqlex-verified-lexers": "Coqlex: Generating Formally Verified Lexers",
  "reinking-xie-2020-perceus-tech-report": "Perceus: Garbage Free Reference Counting with Reuse (Microsoft Technical Report MSR-TR-2020-42)",
  "reinking-xie-2021-perceus-garbage-free-refcounting": "Perceus: Garbage Free Reference Counting with Reuse",
  "swamy-2016-fstar-multimonadic-effects": "Dependent Types and Multi-monadic Effects in F*",
  "ullrich-demoura-2019-counting-immutable-beans": "Counting Immutable Beans: Reference Counting Optimized for Purely Functional Programming",
  "ullrich-demoura-2019-counting-immutable-beans-appendix": "Counting Immutable Beans — Appendix",
  "zhuchko-2025-finiteness-symbolic-derivatives-lean": "Finiteness of Symbolic Derivatives in Lean"
}
```

Transcription notes, so nobody is surprised: the Dvořák thesis title page
prints the two halves on separate lines with no punctuation (colon
supplied); "FP2" prints with a superscript 2; "F*" prints as "F⋆"; the
Morrisett copy is the TOPLAS 1999 journal version (title page matches; the
absorb `refs.bib` cited POPL 1998); the Lattuada copy is the arXiv extended
version and says so on its title line.

## 5. Identifier findings for the sitting

- **Identifiers that will land from document text** (verified via the
  condense pass): arXiv — adams, blaudeau, chassot, delaware, edelmann,
  lattuada, mishra, ullrich-beans; DOI — jung, lorenzen, ouedraogo,
  reinking-2021, swamy, zhuchko.
- **Dolstra prints ISBN 90-393-4130-3.** `condense.py` captures ISBNs and
  README-papers names ISBN as identity evidence, but `build_ledger.py`'s
  `identifier()` renders only arXiv and DOI, so Dolstra lands "unresolved —
  pinned by digest". Extending `identifier()` to ISBN is a small reviewable
  code change — operator decision; not required for landing.
- **Koprowski defect if landed as-is.** The document prints its DOI spaced
  ("10.2168/LMCS-7 (2:18) 2011"); the regex correctly stops at the space and
  captures `10.2168/LMCS-7`, which does not resolve to the article. Landing
  unedited would record a wrong identifier. Options: per-item placeholder
  treatment (falls back to unresolved), or a condense fix. Needs a ruling
  before the run; this is the only entry that would land wrong.
- **Receipted DOIs the documents do not print in extractable text** (hoare,
  necula, morrisett, leino, leroy, klein, oconnor, astrauskas,
  perceus-tech-report, beans-appendix, dvorak): per the house rule the lock
  never carries an identifier the document did not yield — these land
  unresolved, and the receipts in the explore reports remain the pointer.

## 6. Landing mechanics (after ratification)

1. Add the ratified cluster tuples to `CLUSTERS` in `build_ledger.py` and
   the §4 entries to `titles.json`.
2. Regenerate evidence (liteparse → condense → files.json over the full
   115) and run `build_ledger.py`; update the `snapshot` argument if landing
   on a later date (it is currently the hardcoded default `2026-08-24`).
3. Normalize the two outputs to LF; verify all 115 against the new lock
   with the README's verification script; expect "identifiers resolved"
   to rise by 14 (or 15 with an ISBN extension).
4. Then, and only then, edit the probe reports that carry standing
   warnings: remove the `hash-db-anatomy.md` §9.3 "Not registered" block,
   and update `lean-host-capabilities.md`'s "not yet in the lock" flag
   (finding 24).
5. Why3 and Creusot enter by the same procedure once fetched by hand.
