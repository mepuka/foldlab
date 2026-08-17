# RQ-7 — sources, with the load-bearing sentence from each

Compiled by the RQ-7 research seat. **All retrieval dates are 2026-08-16.**
Nothing in this file is vendored code; it is links plus short attributed
quotations and distilled technique summaries. Where a claim was checked
by running something on this machine, that is said explicitly and the
transcript lives beside this file.

Quotations are kept to the single sentence that carries the claim. For
anything longer, follow the link.

---

## A. The anchor precedent — verified checkers in the LRAT/DRAT lineage

### A1. `cake_lpr` — the strongest form of the precedent

* **What it is.** A proof checker for the LRAT and LPR formats, verified
  in HOL4 and compiled by the verified CakeML compiler, so the guarantee
  reaches the x64 machine code rather than stopping at source.
* **Source (paper, 2 pp.):** SAT Competition 2025 checker description,
  <https://satcompetition.github.io/2025/downloads/checkers/cakelpr.pdf>
  — Yong Kiam Tan, Marijn J. H. Heule, Magnus O. Myreen.
* **Source (repository):** <https://github.com/tanyongkiam/cake_lpr>,
  default branch `master`, GitHub API `updated_at` `2026-07-22T22:45:34Z`.
* **Licence:** the repository's `LICENSE` opens
  "cake_lpr Copyright Notice, License, and Disclaimer." and states the
  release is subject to CakeML's licence, which is a three-clause
  BSD-style permissive licence reproduced in full in that file. GitHub's
  own licence detector reports `NOASSERTION` / "Other", so the licence is
  recorded here from the file itself. **Nothing from this repository is
  copied into foldlab.**
* **The guarantee, in the authors' framing (§III).** The checker is
  described as verified "down to the level of its x64 machine code
  implementation", which the paper says eliminates bugs from compilation
  or code extraction.
* **The theorem's shape (Fig. 1, paraphrased — not reproduced).** It is
  an implication in one direction only: *if* the string
  `s VERIFIED UNSAT` is printed on standard output, *then* the file named
  by the first command-line argument parses as DIMACS to a formula that
  is unsatisfiable. The paper notes the DIMACS parser is itself verified
  to be a left inverse of the DIMACS printer.
* **The honest residual, stated by the authors themselves.** The theorem
  is stated modulo CakeML's standard x64 machine assumptions, and the
  guaranteed termination is `extend_with_resource_limit` — the checker
  may run out of heap or stack. Exhaustion is inside the theorem, not
  outside it.
* **Why this matters for REF-8.** Nothing is claimed when the checker
  does *not* print success. A checker is sound, not complete, with
  respect to its producer.

### A2. The LRAT format — why hints exist

* **Source:** Luís Cruz-Filipe, Marijn Heule, Warren Hunt, Matt Kaufmann,
  Peter Schneider-Kamp, "Efficient Certified RAT Verification", CADE 2017.
  PDF read at <https://www.cs.utexas.edu/~marijn/publications/lrat.pdf>;
  also arXiv <https://arxiv.org/abs/1612.02353>.
* **The problem (Abstract).** The abstract states that validating clausal
  proofs in DRAT "is expensive even in highly optimized implementations."
* **The fix.** LRAT extends DRAT with hints — clause identifiers naming
  exactly which clauses become unit — so the checker performs no search.
* **The architecture worth stealing (§1).** A fast *uncertified* checker
  turns the solver's DRAT proof into a hinted LRAT proof; a *certified*
  checker then validates the hinted proof against the original formula.
  The paper says plainly that the original proof need not be trusted, and
  that the uncertified elaborator might even produce a valid optimised
  proof from an incorrect one.
* **The Coq correctness theorem (§5), quoted from the paper's listing:**
  `Theorem refute_correct : ∀ (c:list (ad × Clause)) (O:Oracle), refute c O = true → unsat c.`
  Note the universal quantification over the `Oracle` — the paper points
  out that this is what makes errors in the hint producer, and in the
  interface to it, unable to affect correctness.
* **Measured cost (§7), the numbers as published.** 225 proofs totalling
  250 GByte were produced; the Coq checker verified 161 of them
  (88 GByte) in just under three weeks of CPU time — about 3 MByte per
  minute; the ACL2 checker verified 212 of them (205 GByte) in just under
  17 hours — about 207 MByte per minute. Eleven alleged proofs were
  *rejected*, ranging from 50 MByte to 6.4 GByte, and hand inspection
  confirmed they were genuinely invalid.

### A3. Checking is not automatically cheaper than producing

* **Source:** Florian Pollitt, Mathias Fleury, Armin Biere, "Faster LRAT
  Checking Than Solving with CaDiCaL", SAT 2023, LIPIcs vol. 271,
  <https://doi.org/10.4230/LIPIcs.SAT.2023.21>, PDF at
  <https://drops.dagstuhl.de/storage/00lipics/lipics-vol271-sat2023/LIPIcs.SAT.2023.21/LIPIcs.SAT.2023.21.pdf>.
  **Licence: CC-BY-4.0** (stated on the DROPS entity page).
* **The correction to the naive intuition (Abstract).** Of DRAT the paper
  says checking "often takes even more time than solving the problem."
* **Why (§1).** The paper attributes this to DRAT not being detailed
  enough to avoid search during checking, so checker and solver end up
  doing the same propagation work — and observes that all verified proof
  checkers therefore expect an enriched format.
* **A memory datum worth carrying (§5).** The authors report that
  `Cake_Lpr` requires memory of roughly the size of the proof file.
* **A size datum (§5).** They report converting a 400 MB FRAT proof into
  a 3.8 GB LRAT proof in one case.

### A4. Certificates as an entry requirement — the SAT Competition

* **Source:** <https://satcompetition.github.io/2023/certificates.html>.
* Certificates of unsatisfiability have been required for the UNSAT
  tracks since SAT Competition 2013, and the page states the requirement
  extends to all main-track participants. The proof is written to a file
  named `proof.out` and passed to the verifier.
* **The size reality that drove the binary format.** The page records
  that a few runs produced proofs of over 100 GB, the local storage
  limit.
* **Distilled technique.** A result that arrives without a checkable
  certificate does not count as a result. This is the cleanest existing
  precedent for making a certificate a *gate* rather than a report.

### A5. The same architecture inside Lean 4 — checkable on this machine

Everything in this subsection was read from, or executed against, the
Lean toolchain installed here: **Lean 4.33.0**, commit
`d8b18978322de05a8f3dba51ef03cf5461676c17`, installed by elan 4.2.3 at
`C:/Users/kokok/scoop/persist/elan/.elan/toolchains/leanprover--lean4---v4.33.0/`.
Lean 4 is **Apache-2.0** (`LICENSE` in that toolchain root).

* **The verified checker.** `src/lean/Std/Tactic/BVDecide/LRAT/Checker.lean`
  defines `check` and proves
  `theorem check_sound (lratProof : Array IntAction) (cnf : CNF Nat) : check lratProof cnf → cnf.Unsat`.
  One direction only.
* **The reflection wrapper.** `src/lean/Std/Tactic/BVDecide/Reflect.lean`
  defines `verifyCert` (parse the LRAT bytes, then `LRAT.check`) and
  proves `verifyCert_correct` and `unsat_of_verifyBVExpr_eq_true`.
* **The trusted-base statement, in Lean's own words.** The docstring of
  `bvDecideMacro` in `src/lean/Init/Tactics.lean` ends with the note that
  `bv_decide` "trusts the correctness of the code generator and adds a
  axioms asserting its result" (the grammatical slip is upstream's).
* **Where the axiom is minted.** `Lean.Meta.nativeEqTrue` in
  `src/lean/Lean/Meta/Native.lean` compiles the reflection term,
  evaluates it, and on `true` adds a `Declaration.axiomDecl` of type
  `e = Bool.true`.
* **The cached-certificate tactic.** `bv_check "<file>.lrat"`
  (`src/lean/Lean/Elab/Tactic/BVDecide/BVCheck.lean`) re-checks a stored
  certificate without calling the solver; `bv_decide?`
  (`.../BVTrace.lean`) emits the file and suggests the `bv_check` call.
  Configuration keys quoted from `src/lean/Lean/Meta/Tactic/BVDecide/Attr.lean`:
  `timeout` (default `10`), `trimProofs` (default `true`),
  `binaryProofs` (default `true`), `acNf`, `maxSteps`, `solverMode`.
* **Executed here.** See `lean-lrat-certificate/TRANSCRIPT.md` for the
  axiom footprints, the 5,831,357-byte certificate, the three refused
  tamperings, and the 733,925,046-byte certificate that the checker
  could not finish under default limits.

---

## B. Translation validation — the sibling technique

### B1. The original proposal

* **Amir Pnueli, Michael Siegel, Eli Singerman, "Translation Validation",
  TACAS 1998, LNCS 1384, pp. 151–166, DOI 10.1007/BFb0054170.**
  <https://link.springer.com/chapter/10.1007/BFb0054170>
* **Not obtained as a primary text.** The publisher's page redirects to an
  authentication host and no open full text was located from the sources
  searched. The characterisations below are therefore quoted from
  *peer-reviewed papers that cite it*, and are labelled as such rather
  than presented as Pnueli's own words.
* Sewell, Myreen and Klein (§5, see B3) describe it as: Pnueli et al.
  "proposed translation validation as a pragmatic alternative to compiler
  verification."

### B2. Translation validation with numbers

* **George C. Necula, "Translation Validation for an Optimizing
  Compiler", PLDI 2000, pp. 83–95.** PDF at
  <https://people.eecs.berkeley.edu/~necula/Papers/tv_pldi00.pdf>
  (linked from <https://people.eecs.berkeley.edu/~necula/papers.html>).
* **The framing sentence (§1).** Necula puts the trade directly: if we
  cannot prove a compiler always correct, perhaps we can at least check
  the correctness of each compilation.
* **Cost, as measured by the author (§1 and §6).** The validator slowed
  compilation by a factor of four; including RTL parsing time, "both
  compilation and validation are about twice as slow."
* **The honest weakness — false alarms (§1).** The tool reports errors
  that are not real semantic mismatches when it cannot work out what
  transformation happened; for most optimisations the false-alarm rate is
  very low, but for some it is about 10% of compiled functions, and the
  paper states each alarm must be investigated by a human.
* **Distilled technique.** A per-run validator is *sound but incomplete*
  in the opposite direction from a certificate checker: it can refuse a
  perfectly correct run. Whether that is tolerable is an operational
  question, not a logical one.

### B3. Translation validation carrying a real verification to the binary

* **Thomas Sewell, Magnus O. Myreen, Gerwin Klein, "Translation Validation
  for a Verified OS Kernel", PLDI 2013, pp. 471–482,
  DOI 10.1145/2491956.2462183.** PDF at
  <https://www.cse.chalmers.se/~myreen/pldi13.pdf>.
* **What it does (Abstract).** Extends seL4's existing verification from
  9,500 lines of C down to the binary, by proving refinement between the
  formal semantics of the program at C level and at binary level —
  checking the validity of compilation, some optimisations, and linking.
* **What it buys (§6).** The paper states that the C source, its
  semantics, and the compiler need no longer be trusted, and that this
  removes compilers from the trusted computing base while still allowing
  off-the-shelf toolchains.
* **The Achilles-heel argument (§1).** It notes the method eliminates one
  weakness of the verified-compiler route — the parser and lexer for
  concrete C syntax — because both the source-level verification and the
  binary verification attach to the same formal artefact.
* **Cost (§4.1).** A full decompilation run with proof certificates is
  reported as taking an additional 6–8 hours on then-modern hardware,
  with most time spent in the SMT solvers.
* **A cautionary detail, and the most useful sentence in the paper for
  us (§3.3.1).** The validator does *not* check everything it consumes:
  the paper says the checker trusts that the inlined problem space is
  derivable from the functions of interest, and that checking inlining
  was performed correctly "did not seem worthwhile." A validation tool
  can quietly trust part of its own input; the only defence is that the
  paper says so out loud.

---

## C. Proof-carrying code — the ancestor

* **George C. Necula, "Proof-Carrying Code", POPL 1997, pp. 106–119,
  DOI 10.1145/263699.263712.**
  <https://dl.acm.org/doi/10.1145/263699.263712> (returned HTTP 403 to
  this seat); the author's listing at
  <https://people.eecs.berkeley.edu/~necula/papers.html> gives the paper
  as `Papers/pcc_popl97.ps`, and `Papers/pcc_popl97.pdf` returned 404.
* **Status: LEAD, not verified from primary text by this seat.** The
  characterisation below is from the author's own listing page and from
  the paper's description as cited in B2/B3's bibliographies: PCC is a
  mechanism by which a host can determine that it is safe to execute code
  from an untrusted source, because each binary carries a formal proof
  that it obeys a published safety policy.
* **Why it is still worth naming.** PCC is the origin of the shape REF-8
  wants: the *producer* is untrusted and does the expensive work; the
  *consumer* is small, published in advance, and does the cheap work.

---

## D. Verified certification outside SAT

* **CeTA / IsaFoR** — <https://isafor-ceta.uibk.ac.at/> (redirected from
  `cl-informatik.uibk.ac.at/software/ceta/`). Version 3.9, dated
  2026-06-16 on that page. CeTA is described there as a tool that
  certifies termination, non-termination, confluence, commutation,
  completion and complexity proofs produced by other automated tools;
  IsaFoR is the Isabelle/HOL formalisation behind it, and CeTA is
  automatically generated from IsaFoR by Isabelle's code generator. The
  certificate format is CPF (Certification Problem Format).
* **Status of the licence: not stated on that page**, so nothing from
  CeTA is copied and no licence is asserted here.
* **Why it is in this file.** It is the clearest evidence that the
  verified-checker pattern is not SAT-specific: an entire competition
  ecosystem (termination tools) emits certificates in a published format
  that one generated-from-a-formalisation checker validates. That is the
  same relationship REF-8 proposes between many foldlab sessions and one
  checker.

---

## D2. Certifying algorithms — the cleanest statement of the contract

* **Kurt Mehlhorn, "Certifying Computations: Algorithmics meets Software
  Engineering"** (talk abstract), PDF at
  <https://www.inesc-id.pt/wp-content/uploads/2017/10/AbstractCertifyingAlgsLunteren.pdf>.
  It cites the survey: R. M. McConnell, K. Mehlhorn, S. Näher,
  P. Schweitzer, "Certifying algorithms", *Computer Science Review*
  5(2):119–161, 2011, DOI 10.1016/j.cosrev.2010.09.009 (publisher pages
  at ScienceDirect and the ACM DL both returned HTTP 403 to this seat,
  so the survey itself is cited but not quoted).
* **The definition, quoted from the abstract.** "A certifying algorithm
  for f computes y and a witness (proof) w; w proves that the algorithm
  has not erred for this particular input."
* **The checker's contract, quoted.** The checker program C "accepts the
  triple (x, y, w) if and only if w is a valid witness for the equality
  y = f (x)."
* **Why this is the sharpest framing for REF-8.** Two things worth taking
  literally. First, the contract is over a *triple*: input, claimed
  output, witness. A checker that inspects the witness alone can be
  fooled by attaching a valid witness to the wrong claim — the failure
  mode reproduced in `lean-lrat-certificate` control 4d. Second, the
  witness proves the algorithm "has not erred **for this particular
  input**" — the scope limit is in the definition itself, and it is
  exactly the limit that separates REF-8 from REF-3.
* Mehlhorn's abstract also names the follow-on line in which the checkers
  themselves are formally verified (Alkassar, Böhme, Mehlhorn,
  Rizkallah, *JAR* 52(3):241–273, 2014; Noschinski, Rizkallah, Mehlhorn,
  NASA Formal Methods 2014). **Those two papers were not read by this
  seat** and are recorded as leads.

---

## E. What was searched and not found

Searched on 2026-08-16 for prior art on *per-session runtime conformance
certificates for a protocol daemon* — a certificate covering an execution
of a stateful service, rather than a run of a compiler or a decision
procedure. The searches actually issued:

1. `"session certificate" OR "per-execution certificate" verified checker
   replay journal protocol daemon conformance formal`
2. `certifying algorithms witness McConnell Mehlhorn Naher Schweitzer
   survey checker`

plus the related-work sections of the papers in sections A–C above,
followed by hand.

**Search 1 returned nothing on-point.** Its top results were about TLS
session establishment, replay *attacks*, database session recovery
patents, and session-replay analytics products — the phrase "session
certificate" is already occupied by an unrelated meaning in security
engineering, which is itself worth knowing before we adopt the term.

**Search 2 found the right generalisation** (certifying algorithms,
D2 above) but not the application: every certifying-algorithm example
located certifies a *mathematical claim about a function's output*
— unsatisfiability, termination, a maximum-flow value, refinement
between two program texts — rather than an execution of a running,
stateful service against a specification.

**So: no prior art found for a per-session runtime conformance
certificate over a protocol daemon's journal, having searched the above.**
The two nearest neighbours are the certifying-algorithms tradition (a
program returns a witness with each answer) and transparency-log designs
(an append-only log with inclusion and consistency proofs); neither was
found addressing the combination REF-8 needs, and neither is presented
here as if it were on-point. This absence is the finding.
