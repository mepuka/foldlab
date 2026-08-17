# RQ-7 — Certificates: what a per-run proof buys

Research seat, 2026-08-16. Serves REF-8, per
`scratch/dispatch/19-refinement-research-questions.md`. Written against
the ratified REF-0 decisions D-a, D-bc, D-d, D-e
(`docs/design/2026-08-16-ref0-extraction-grill-record.md`) and the slice
definitions in `scratch/dispatch/17-the-refinement-ladder.md`.

Reference area:
[`docs/research/reference/rq7-run-certificates/`](reference/rq7-run-certificates/)
— every source with its load-bearing sentence in
[`links-and-quotations.md`](reference/rq7-run-certificates/links-and-quotations.md),
two own-authored runnable reproductions with transcripts, and the
inventory README recording provenance, licence, and retrieval date.

## Evidence grades used below

* **[ran]** — executed on this machine by this seat on 2026-08-16, or
  read from a file in the Lean toolchain installed here, with the
  transcript recorded in the reference area.
* **[quoted]** — verbatim from a primary source (published paper,
  official page, repository file), URL recorded.
* **[lead]** — recalled or secondary; explicitly unverified.

Machine of record: Windows 11 Home 10.0.26200, Lean 4.33.0
(`x86_64-w64-windows-gnu`, commit `d8b1897…`), elan 4.2.3, Go 1.26.5,
bun 1.3.14 — all four checked with `--version` at the start of the run.
[ran]

---

## 1. Summary of findings

1. **A certificate and a proof differ in their quantifier, and the
   difference is not a matter of degree.** A universal proof says "for
   all inputs"; a certificate says "for this one input, here is why".
   The field's own definition puts the scope limit inside the
   definition: a certifying algorithm's witness "proves that the
   algorithm has not erred **for this particular input**". [quoted]
   REF-8 is that; REF-3 is the other thing. §2.

2. **A verified checker does not remove trust; it relocates it, and the
   relocation is worth having because the checker is small, fixed, and
   published in advance while the producer is large and changes.** In
   the anchor precedent the producer (a SAT solver) is wholly untrusted,
   and so is the *elaborator* that adds hints to its output — the LRAT
   paper says outright that the untrusted elaborator might produce a
   valid optimised proof even from an incorrect one. [quoted] §3.

3. **The checker's guarantee is one-directional, and this is visible in
   the theorem, not just in the prose.** Lean 4.33.0 ships a verified
   LRAT checker whose soundness theorem is
   `check lratProof cnf = true → cnf.Unsat`. Success implies the claim;
   **failure implies nothing**. [ran] A refused certificate is not
   evidence that the session was wrong — it is evidence that the session
   was not certified. §2, §3.5.

4. **Using a checker costs exactly one visible axiom, and the cost is
   attributable per declaration.** A `bv_decide` proof on this machine
   carries `satPath._native.bv_decide.ax_1_5` beside the three standard
   axioms; a goal closed without the certificate path carries no such
   axiom. Lean's own docstring states the boundary: `bv_decide` "trusts
   the correctness of the code generator and adds a axioms asserting its
   result" (sic). [ran], [quoted] This is the direct analogue of D-e's
   footprint obligation for the certificate route. §3.5.

5. **"Checking is cheap" is false as a general claim and the field says
   so.** DRAT checking "often takes even more time than solving the
   problem"; the fix is not a faster checker but a *richer certificate*
   — one carrying enough hints that the checker performs no search.
   [quoted] The design lesson transfers directly: **the cost of REF-8 is
   set by what the certificate contains, not by how well the checker is
   written.** §5.1.

6. **Certificates grow with search effort, not with statement size, and
   the growth is brutal.** Measured here on one machine: a one-line
   statement about 8-bit multiplication produced a 5,831,357-byte
   certificate; the same statement at 12 bits produced 733,925,046 bytes
   and the *checker* then failed under Lean's default limits. [ran] The
   published figures are the same shape — 250 GByte of proofs across 225
   SAT instances, and the SAT Competition records runs producing proofs
   over 100 GB, its local storage limit. [quoted] §5.2.

7. **Our certificates are in the benign regime, and the reason is
   structural rather than lucky.** A foldlab session certificate does
   not encode a search. It encodes a *replay*: its size is linear in the
   session's operation count, and checking it is one kernel call per
   journal entry. None of the size pathology above applies — provided
   the certificate stays a commitment-plus-replay artifact and does not
   start carrying intermediate state. §5.3, §6.

8. **REF-8's gate wording collides with D-bc and needs a ruling.** Draft
   17 says the certificate is "verified by an independently built kernel
   binary". D-bc, as amended, pins "the **deployed artifact's** digest —
   built once, embedded everywhere". If the artifact is built once and
   embedded everywhere, an independently built binary either (a) is the
   REF-6 regeneration gate wearing a different hat — same source, same
   bytes, no semantic independence — or (b) means a genuinely
   *differently authored* checker, which is the OCaml niche the REF-0
   record deliberately preserved. These are different slices with
   different costs. §7.1.

9. **A certificate never makes a seam `proved`.** D-e admits no
   proved-with-asterisks status. Certificates are a distinct evidence
   class: they extend coverage to *what actually ran, including the
   shell*, which no refinement theorem reaches. Recording them as a
   route to `proved` would be the overclaim the ledger exists to
   prevent. §2.4, §7.5.

10. **No prior art found for a per-session runtime conformance
    certificate over a protocol daemon's journal**, having searched the
    terms and sources recorded in
    [`links-and-quotations.md` §E](reference/rq7-run-certificates/links-and-quotations.md).
    Everything located certifies a mathematical claim about a function's
    output, not an execution of a stateful service. The phrase "session
    certificate" is additionally already occupied by an unrelated
    meaning in security engineering, which is worth knowing before we
    adopt it as a term of art. §8.

---

## 2. The distinction, stated precisely

### 2.1 The two objects

Let `K` be the kernel and `Spec` the model.

* A **universal proof** is a closed theorem
  `∀ s op, translate (wireStep s op) = modelStep (translate s) (translate op)`.
  It is established once, holds for every input forever, and is checked
  by the proof assistant at build time. Its cost is paid once per change
  to the statement. This is REF-3/REF-4.
* A **per-run certificate** is a datum `w` emitted alongside a
  particular run `(x, y)`, together with a **checker** `C` such that
  `C(x, y, w)` accepting means `y` really is the correct output for `x`.
  Its cost is paid once per run. This is REF-8.

The field's canonical statement of the second, quoted from Mehlhorn:
a certifying algorithm computes an output `y` and a witness `w`, and
`w` "proves that the algorithm has not erred **for this particular
input**"; the checker "accepts the triple (x, y, w) if and only if w is
a valid witness for the equality y = f (x)". [quoted]

Two details in that sentence are load-bearing and both are easy to lose.

* **The scope limit is inside the definition.** "For this particular
  input." A certificate says nothing about the next session.
* **The checker's contract is over a *triple*.** Input, claimed output,
  witness — not the witness alone. A checker that validates the witness
  in isolation can be handed a perfectly valid witness for a *different*
  claim. This is not hypothetical: it is control 4d in
  [`lean-lrat-certificate/TRANSCRIPT.md`](reference/rq7-run-certificates/lean-lrat-certificate/TRANSCRIPT.md),
  where an intact, genuine certificate was presented against a different
  and equally true statement and had to be refused. [ran]

### 2.2 What the verified checker actually moves

A verified checker does not eliminate trust. It moves it from a large,
fast-changing, performance-tuned producer to a small, fixed, published
consumer — and then, if you verify the consumer, from the consumer's
code to the consumer's *specification of the input format* and to
whatever runs it.

The LRAT toolchain is the clean illustration, and it is a *three*-stage
architecture, not two:

```
  SAT solver  ──DRAT──▶  elaborator  ──LRAT──▶  verified checker  ──▶ verdict
  (untrusted)            (untrusted)            (trusted, proved)
```

The paper is explicit that the middle stage is untrusted too, noting
that the non-certified checker might even produce a valid optimised
proof from an incorrect one. [quoted] Nothing upstream of the verified
checker needs to be right. Anything it produces that is wrong will be
refused — that is the whole architecture.

### 2.3 Where the strength genuinely differs

| | Universal proof (REF-3/4) | Per-run certificate (REF-8) |
| --- | --- | --- |
| Quantifier | all inputs | this input |
| When it can fail | at build time, when the statement changes | at run time, on any run |
| What a failure means | the claim is false, or unproven | *this run* is uncertified; nothing is implied about the claim |
| What it covers | exactly what the model quantifies over | exactly what the journal records — **including the shell** |
| Cost | once per statement change | once per session, forever |
| Trusted base | the proof assistant | the checker's correctness *and* the fidelity of the certificate's input encoding |

The fourth row is the reason REF-8 exists after REF-7 rather than being
made redundant by it. Refinement, however complete, quantifies over the
model's objects. It says nothing about the transport that delivered the
operation, the store that persisted it, or the FFI boundary that carried
the bytes — all of which the REF-0 record already names as trusted base.
A certificate is computed over the artifacts those components actually
produced, so it reaches where the theorem cannot.

### 2.4 The sentence REF-8 must not be allowed to become

> "Certificates prove the daemon correct on every session that ran."

They do not. They establish that the recorded journal, replayed through
the named kernel, reaches the recorded verdict — and that neither the
journal nor the verdict has been altered since. If the daemon's kernel
is wrong with respect to the model, a certificate over that same kernel
is wrong identically and stays green. This is demonstrated, not
asserted: `certificate-shape/check.mjs` imports the same kernel that
emitted the session, and its transcript records the limit in its own
"what this does not show" section. [ran]

The honest phrasing, offered for REF-8's ledger row:

> Every session that ran emitted a certificate, and an independent
> party holding only the kernel artifact and the journal re-derived the
> same verdict. Certificates detect tampering, substitution, and
> journal-verdict mismatch; they do not detect a kernel that is wrong in
> the same way on both sides. That case is what the REF-3/REF-4
> refinement theorems cover.

Draft 17's own phrasing — "certificates cover every session that
actually ran, including everything the shell touched" — should be
tightened to "everything the shell touched **that the journal records**".
The certificate's reach is exactly the journal's reach, no further.

---

## 3. Prior art in verified checking

Proved about the checker, versus assumed about the producer, project by
project. Full quotations and URLs in
[`links-and-quotations.md` §A](reference/rq7-run-certificates/links-and-quotations.md).

### 3.1 `cake_lpr` (HOL4 + CakeML) — the strongest form of the precedent

* **Proved:** the checker, down to its x64 machine code, by compiling
  verified CakeML source with the verified CakeML compiler. The authors
  present this as eliminating bugs from compilation and code extraction
  — the one project in this field that closes the extraction gap rather
  than trusting it. [quoted]
* **The theorem's shape:** an implication in one direction — *if* the
  process prints `s VERIFIED UNSAT`, *then* the named file parses as
  DIMACS to an unsatisfiable formula.
* **Assumed:** the SAT solver entirely; the CakeML standard x64 machine
  assumptions; and — stated inside the theorem rather than outside it —
  that the run may terminate by exhausting heap or stack. Resource
  exhaustion is *in the guarantee*, not swept under it.
* **A detail we should copy:** the DIMACS parser is verified to be a
  left inverse of the DIMACS printer. The parser is where a checker's
  guarantee usually leaks — it is the component that decides *what claim
  the checker is checking* — and this project closed it with a theorem.
  [quoted] For us the analogous component is the certificate's canonical
  encoding, §6.4.

### 3.2 Coq and ACL2 LRAT checkers (Cruz-Filipe et al., CADE 2017)

* **Proved:** `refute_correct : ∀ c O, refute c O = true → unsat c`,
  quoted from the paper's own listing. Note the universal quantification
  over the `Oracle` — the hint stream. The paper's point is precisely
  that quantifying over the untrusted hint source makes errors in the
  hint producer, *and in the interface to it*, unable to affect
  correctness. [quoted]
* **Assumed:** the solver, the elaborator, and (for the Coq checker) the
  OCaml extraction and runtime — the paper works "with a pure extracted
  program", which places Coq's extraction in the trusted base exactly as
  RQ-2 expects for our own backend.
* **The design principle worth naming.** *Quantify over the untrusted
  input rather than validating it.* If the certificate's hints are a
  parameter the correctness theorem ranges over, no property of the hint
  producer needs stating at all. That is a much stronger position than
  "we also checked the hints look plausible".

### 3.3 CeTA / IsaFoR — the pattern is not SAT-specific

CeTA certifies termination, non-termination, confluence, commutation,
completion and complexity proofs emitted by other automated tools, in a
published format (CPF); it is generated from the IsaFoR Isabelle/HOL
formalisation by Isabelle's code generator. Version 3.9, dated
2026-06-16. [quoted] Its page states no licence, so nothing from it is
copied and none is asserted.

Its value here is as an existence proof of the *ecosystem* shape REF-8
proposes: many independent producers, one published certificate format,
one checker generated from a formalisation. That is many foldlab
sessions, one certificate schema, one checker generated from the model.

### 3.4 The one that closes the loop: Lean 4 does this already, here

Everything in this subsection was executed or read on this machine. [ran]

* `Std/Tactic/BVDecide/LRAT/Checker.lean` proves
  `check_sound : check lratProof cnf → cnf.Unsat`.
* `Std/Tactic/BVDecide/Reflect.lean` wraps it as `verifyCert` — parse the
  LRAT bytes, then check — and proves `verifyCert_correct`.
* `bv_decide` calls CaDiCaL, gets an LRAT certificate, and runs the
  verified checker on it.
* `bv_decide?` writes the certificate to disk and suggests
  `bv_check "<file>.lrat"`, which re-checks the stored certificate on
  every subsequent build **without calling the solver**. Configuration
  keys, quoted from `Lean/Meta/Tactic/BVDecide/Attr.lean`: `timeout`
  (default `10`), `trimProofs` (default `true`), `binaryProofs` (default
  `true`), `acNf`, `maxSteps`, `solverMode`.

This matters for us beyond the illustration: **the toolchain we have
already ratified for REF-1–REF-6 contains a working, verified,
cached-certificate pipeline**. If REF-8 ever wants a certificate checked
*inside Lean* rather than by a separate program, the pattern to imitate
is in the toolchain, not in a paper.

### 3.5 What using it costs, measured

`#print axioms` on this machine: [ran]

| Declaration | Axioms |
| --- | --- |
| `Std.Tactic.BVDecide.LRAT.check_sound` | `propext, Classical.choice, Quot.sound` |
| `satPath` (needs the solver, so the certificate path runs) | `propext, Classical.choice, Quot.sound, satPath._native.bv_decide.ax_1_5` |
| `normPath` (closed by normalisation, no certificate) | `propext, Quot.sound` |

The certificate route adds exactly one axiom, minted per declaration by
`Lean.Meta.nativeEqTrue` as a `Declaration.axiomDecl` of type
`e = Bool.true`, after evaluating `e` with the compiler. Lean states the
boundary in its own docstring for `bv_decide`: it "trusts the
correctness of the code generator and adds a axioms asserting its
result" (sic). [ran], [quoted]

Two consequences for us.

* **The trusted-base delta of a certificate is nameable and checkable.**
  It is not a vague "and we also trust the checker"; it is an axiom with
  a name, and `#print axioms` tells you which declarations carry it. D-e
  obligation 1's footprint check has an exact analogue for the
  certificate route.
* **Attribution works.** `normPath` shows a declaration that did *not*
  take the certificate route carries no such axiom. A gate can therefore
  distinguish "proved" from "certified by an evaluated checker"
  declaration by declaration — which is what keeps §2.4's confusion from
  becoming possible in the ledger.

---

## 4. Translation validation — the sibling technique

Translation validation validates *each run of a transformation* instead
of proving the transformation. It is the same quantifier move as
certificates, applied to compilers rather than to decision procedures.

### 4.1 Origin

Pnueli, Siegel and Singerman, TACAS 1998, DOI `10.1007/BFb0054170`.
**Not obtained as a primary text by this seat** — the publisher page
redirects to an authentication host and no open full text was located
from the sources searched. The characterisation is therefore taken from
peer-reviewed papers citing it and labelled as such: Sewell, Myreen and
Klein describe it as proposing translation validation "as a pragmatic
alternative to compiler verification". [quoted, from the citing paper]

### 4.2 Necula, PLDI 2000 — the cost, honestly reported

Necula's framing sentence is the cleanest statement of the whole
quantifier trade: if we cannot prove a compiler always correct, perhaps
we can at least check the correctness of each compilation. [quoted]

The measured costs, from the paper: [quoted]

* the validator slowed compilation by a factor of four; with RTL parsing
  time included, "both compilation and validation are about twice as
  slow";
* **false alarms**: the tool reports errors that are not real semantic
  mismatches when it cannot work out which transformation occurred. For
  most optimisations the rate is very low; for some it is about **10% of
  compiled functions**. The paper states each alarm must be investigated
  by a human.

**The lesson, and it is the important one in this section.** A
translation validator is *incomplete in the opposite direction* from a
certificate checker. A certificate checker refuses only what it cannot
verify from the witness it was given; a validator has to *reconstruct*
the correspondence itself, and when reconstruction fails it cries wolf.
The difference is entirely down to whether the producer hands over a
witness. Necula's validator did not use hints from the compiler; it paid
for that in a 10% human-triage rate.

For REF-8 this argues one thing clearly: **the daemon must emit the
certificate, not leave the checker to infer it.** A checker that has to
reconstruct what the session did will develop a false-alarm rate, and a
nightly gate with a false-alarm rate is a gate people learn to ignore.

### 4.3 seL4 at the binary level (Sewell, Myreen, Klein, PLDI 2013)

The most ambitious deployment: seL4's C-level verification extended to
the binary by proving refinement between the C semantics and the binary
semantics, per compilation run, with SMT solvers discharging the
obligations. [quoted]

* **What it buys, in the authors' words:** the C source, its semantics,
  and the compiler need no longer be trusted; the work removes compilers
  from the trusted computing base while still allowing off-the-shelf
  toolchains. [quoted]
* **The argument we should note for RQ-2's benefit:** the method
  eliminates the parser and lexer for concrete C syntax as a trusted
  component, because the source-level verification and the binary
  verification attach to the *same formal artefact*. [quoted]
* **Cost:** a full decompilation run with proof certificates took an
  additional 6–8 hours on then-modern hardware, most of it in the SMT
  solvers. [quoted]
* **The cautionary detail, and the single most useful sentence in this
  material for us.** The validator does not check everything it
  consumes: the paper says the checker trusts that the inlined problem
  space is derivable from the functions of interest, and that checking
  inlining was performed correctly "did not seem worthwhile". [quoted]

That last is the anti-pattern to pre-register for REF-8. **A validation
tool can quietly trust part of its own input.** The only defence
observed anywhere in this material is that the seL4 authors wrote it
down. Ours should be mechanical: §7.4.

---

## 5. Practical certificate design

### 5.1 The cost of checking is set by the format, not the checker

The naive intuition — "checking is cheap, producing is expensive" — is
wrong for DRAT and the field says so plainly: checking DRAT proofs
"often takes even more time than solving the problem". [quoted] The
diagnosis is that DRAT is not detailed enough to avoid *search* during
checking, so checker and solver end up doing the same propagation work;
and the paper observes that all verified proof checkers therefore expect
an enriched format. [quoted]

LRAT's fix is not a faster checker. It is a **richer certificate**:
hints naming exactly which clauses become unit, so the checker
propagates without searching. [quoted]

**The transferable rule.** A certificate must contain enough that
checking it is a *replay*, never a *search*. Ours is naturally in that
regime — a journal replay is deterministic and hint-free by
construction — but the rule is worth stating because it is the thing
that would be violated first if a certificate were ever slimmed down
"to save space" by omitting operations and letting the checker
reconstruct them.

### 5.2 How large certificates get, measured and published

Measured here, one machine, Lean 4.33.0 core with its bundled CaDiCaL:
[ran]

| Statement | Certificate | Outcome |
| --- | --- | --- |
| `(a &&& b) + (a ^^^ b) = a ||| b`, `BitVec 64` | 130,160 B | checked, exit 0 |
| `a * b = b * a`, `BitVec 8` | 5,831,357 B | checked, exit 0 |
| `a * b = b * a`, `BitVec 12` | 733,925,046 B | **check failed** under default `maxHeartbeats`, after 444 s |

Published figures, same shape: 225 SAT instances produced 250 GByte of
proofs; the certified Coq checker managed about 3 MByte per minute and
the ACL2 checker about 207 MByte per minute; the SAT Competition records
runs producing proofs over 100 GB, its local storage limit; one reported
FRAT-to-LRAT conversion turned 400 MB into 3.8 GB; and `cake_lpr` is
reported to need memory roughly the size of the proof file. [quoted]

Two things follow, and only one of them applies to us.

* **Applies to everyone:** memory is often the binding constraint, not
  time. A checker that must hold the certificate resident sets the
  ceiling.
* **Does not apply to us, and it is worth being clear why:** all of the
  above are certificates of a *search*. Their size tracks how hard the
  solver had to work, which is why four bits of width multiplied ours by
  126×. §5.3.

### 5.3 Why our regime is different, structurally

A foldlab session certificate does not encode a search. It encodes a
replay of a bounded operation sequence. Size is linear in the session's
operation count; checking is one kernel call per journal entry, in
sequence, with no branching and no backtracking. There is no analogue of
the RAT check, no propagation, no hints needed — because the kernel is
already total and deterministic, D-d guarantees exactly the property
that makes the checker search-free.

**The single design constraint that keeps it that way:** the certificate
must carry *commitments*, not *answers*. The moment intermediate states
are included, the certificate stops being evidence and starts being a
copy of the thing it is evidence about — and its size becomes
proportional to session state × session length rather than to session
length. `certificate-shape/` demonstrates the commitment-only form and
its transcript states the rule. [ran]

This is also where REF-1's open `stateBytes` question touches REF-8. If
the journal is host-owned and never crosses the kernel boundary (draft
17's candidate split, and the right one on per-call-cost grounds), then
a certificate's replay can only reconstruct state from the journal — so
**the journal must record each operation as the kernel saw it**: the
canonical `opBytes`, not a friendlier rendering. A journal that records
a human-legible summary of an operation cannot be replayed, and a
certificate over it cannot be re-derived by a third party. That is a
REF-1 constraint discovered from REF-8's requirements, and it is cheap
to honour now and expensive to retrofit.

### 5.4 What tampering must be refused, demonstrated

`certificate-shape/run.sh` runs six controls; five are tamperings and all
five are refused with a named obligation, and the honest run is green
before and after. [ran] The controls: a journal entry edited, the
journal truncated, the certificate's verdict forged, the certificate's
kernel digest altered, and the kernel artifact itself modified.

One design result is worth lifting out. **Binding the kernel digest into
the journal chain's genesis makes kernel substitution unforgeable
without rewriting the whole chain.** In control 4 a one-character change
to the certificate's kernel digest was caught twice — once by the direct
digest comparison and once by the chain, because the chain's genesis
commits to that digest. That is the mechanical form of D-d's "replay
under a different kernel digest refuses by name", and it costs one
string concatenation.

### 5.5 An anti-pattern caught in our own reproduction

The first version of control 1 used `sed 's/"ada"/"eve"/' journal.json`.
The journal's operation strings are *escaped* JSON, so sed matched
nothing, wrote an identical file, and the check reported `VERIFIED` with
exit 0 — a negative control that could not fail. It is recorded in
[`certificate-shape/TRANSCRIPT.md`](reference/rq7-run-certificates/certificate-shape/TRANSCRIPT.md)
rather than quietly fixed, because it is the same species as DEV-670's
naive corpus reporting green over a universe it had skipped. `run.sh`
now asserts the bytes changed before running the check, and exits 2 if
the tamper was a no-op. [ran]

**Pre-registered for REF-8:** every planted-corruption row in the
roster must be shown to *change the artifact* before it is shown to be
refused. A corruption that was never applied is refuted by nothing.

---

## 6. What a foldlab session certificate must contain

The brief's question: what must a certificate contain for a third party
holding **only the kernel artifact and the journal** to re-derive the
verdict? Answered concretely and runnably in `certificate-shape/`; the
obligations below are that reproduction's O1–O8, generalised to the real
seam.

### 6.1 The eight obligations

| # | Field in the certificate | What the third party re-derives | Refuses |
| --- | --- | --- | --- |
| O1 | `kernelDigest` — content digest of the deployed `.wasm` | digests the artifact it holds and compares | a swapped or edited kernel |
| O2 | `modelVersion` + `buildIdentity` — the kernel's *exported* self-identification (D-d item 3) | reads them out of the artifact and compares | right bytes, wrong declared semantics; or an artifact whose exported build identity does not match the model source |
| O3 | `sessionId` | matches the journal it holds | a certificate pinned to another session's journal |
| O4 | `entryCount` | counts the journal | silent truncation or extension |
| O5 | `journalDigest` over canonical journal bytes | recomputes | any byte edit anywhere |
| O6 | `journalHead` — head of a per-entry hash chain whose **genesis commits to `kernelDigest`** | recomputes the chain | reordering, splicing, kernel substitution |
| O7 | *(nothing — this is the point)* | replays every recorded `opBytes` through the kernel and **re-derives** each receipt | a journal whose receipts do not follow from its operations |
| O8 | `genesisState`, `finalState`, `finalStateDigest` | compares against what replay reached | a certificate asserting a conclusion its own evidence does not support |

Plus one field with no obligation attached, for triage rather than
verification: `schema`, so a future checker can refuse an unknown
certificate version **by name** — the same discipline the estate already
applies to journals written under an unknown session version.

### 6.2 What must *not* be in it

* **Intermediate states.** They are what the third party is supposed to
  compute. Including them turns evidence into a transcript and makes
  size quadratic-ish in session length. §5.3.
* **Anything the kernel would have to be trusted to have reported
  honestly and that is not otherwise re-derivable.** If a field cannot
  be recomputed from the artifact plus the journal, it is an assertion,
  not evidence, and it belongs in the trusted-base paragraph rather than
  in the certificate.
* **The kernel's own digest of itself.** D-d already killed this; the
  fixed point does not exist. The host computes it; the certificate
  records what the host computed; the third party recomputes it from the
  artifact.

### 6.3 The independence question, sharply

Under D-bc there is one artifact with one digest everywhere. So "an
independently built kernel binary" (draft 17's REF-8 wording) cannot
mean a *different* binary — if it did, D-bc's one-digest property would
be broken. There are exactly three coherent readings, and they are three
different amounts of work:

1. **Build independence** — rebuild from the same model source on a
   clean checkout and require byte-identity. This is REF-6's
   regeneration gate; it adds nothing new at REF-8 and provides no
   semantic independence at all.
2. **Host independence** — run the same artifact under a different host
   (wazero and Bun) and require identical verdicts. Cheap, genuinely
   useful, and already the shape of the existing TS≡Go differential
   walls. It catches host-embedding bugs; it cannot catch a wrong
   kernel.
3. **Implementation independence** — a differently authored checker that
   re-derives verdicts without using the generated kernel. This is the
   only reading that gives semantic independence, and the REF-0 record
   already carved out its admissible form: a small hand-written OCaml
   certificate checker, explicitly preserved because "a checker
   re-derives verdicts rather than standing in for the model's", so the
   no-hand-authored-verdicts ruling does not bar it.

Reading 2 is the one REF-8 should gate on. Reading 3 is a separate
decision with a real cost, and it should be taken deliberately or not at
all — §7.3.

### 6.4 The encoding is part of the trusted base and should be minimised

`cake_lpr` verified its DIMACS parser as a left inverse of the printer,
because the parser is what decides *which claim* is being checked.
[quoted] Our analogue is the certificate's canonical encoding. Two
consequences:

* the certificate should be encoded by the **same** RFC 8785
  canonicalisation REF-2 proves, not by a second, convenient encoder —
  otherwise REF-2's law does not cover the artifact the whole scheme
  rests on;
* until REF-2 lands, any certificate work must state that its encoding
  is walled by the differential corpus rather than proved, exactly as
  the S7 bound is stated today.

---

## 7. Recommendations

Each states its cost, what it adds to the trusted base, and what
reversal would take, per dispatch discipline rule 6.

### 7.1 Resolve REF-8's "independently built kernel binary" before dispatch

**Recommendation.** Reword REF-8's gate to reading 2 of §6.3: *the same
deployed artifact, under both hosts, re-derives the same verdict from
the journal alone*. Record reading 1 as already discharged by REF-6, and
reading 3 as a named, optional extension (§7.3).

* **Cost.** One editing pass on draft 17 before the board, plus the
  operator's ratification that "independently built" meant host
  independence. Nothing to build.
* **Trusted base.** Unchanged. It removes an implied claim of semantic
  independence that the current wording could be read as making and that
  D-bc's one-artifact property cannot deliver.
* **Reversal.** Free until REF-8 dispatches; after that, rewording a
  shipped gate means re-ratifying a ledger row.

### 7.2 Certificates carry commitments, never answers

**Recommendation.** Fix the schema at O1–O8 of §6.1 and pre-register
that no intermediate state enters the certificate.

* **Cost.** The checker must run the kernel once per journal entry
  rather than comparing stored values — strictly more work at check
  time, linear in session length. On the toy reproduction this is
  microseconds; on a real session it is one kernel call per operation,
  the same cost the daemon already paid once.
* **Trusted base.** *Reduces* it: nothing in the certificate is believed
  that cannot be recomputed.
* **Reversal.** Adding fields later is easy; removing them after
  consumers exist is not. Start minimal.

### 7.3 Treat a diverse checker as a separate, later, optional slice

**Recommendation.** Do not put implementation independence in REF-8.
Name it as a candidate follow-on, with the REF-0 record's OCaml checker
niche as its shape.

* **Cost if taken.** A second implementation of the wire semantics,
  hand-authored, which must be maintained against every REF-9 model
  change — precisely the maintenance burden RQ-8 is measuring. It is the
  only thing in this report that would make the living-model loop
  materially more expensive.
* **What it buys.** The one failure mode certificates otherwise cannot
  see: a kernel that is wrong identically on both sides.
* **Trusted base.** Adds a hand-written checker; but note it *subtracts*
  a dependency from the verdict path, since agreement between two
  independently authored implementations is stronger evidence than
  either alone.
* **Reversal.** Deleting a checker is easy; the sunk cost is the reason
  to decide before building, not after.

### 7.4 Make the checker's trusted assumptions mechanical, not documentary

**Recommendation.** Every input the checker consumes must be either
re-derived or **explicitly listed** in the checker's output on success.
`check.mjs` prints the session id, the kernel digest, and the final
digest on success; the real checker should print the complete list of
what it verified, so that a shrinking list is visible in a diff.

* **Cost.** A few lines, plus the discipline of updating a golden output
  when the obligation set changes.
* **Trusted base.** Unchanged, but makes silent shrinkage of the
  obligation set visible. This is the direct counter to the seL4
  precedent's honest admission that its checker trusts a step it decided
  was not worth checking. [quoted]
* **Reversal.** Trivial.

### 7.5 Keep certificates out of the `proved` obligation set

**Recommendation.** REF-8 adds a distinct evidence class to
VERIFICATION.md, not a sixth D-e obligation and not a substitute for
any of the five.

* **Cost.** None. It forgoes the temptation to let a green nightly
  certificate run stand in for a divergence count of zero.
* **Trusted base.** Unchanged. Prevents the overclaim in §2.4.
* **Reversal.** N/A — this is a wording discipline, not a mechanism.

### 7.6 Two constraints handed to earlier slices

Both are cheap now and expensive later; neither reverses a ratified
decision.

* **To REF-1.** The journal must record each operation as the **canonical
  `opBytes` the kernel saw**, not a rendering of it. Otherwise no third
  party can replay, and REF-8's central property is unavailable.
  *Cost:* the journal stores canonical bytes, which are less pleasant to
  read by eye than a summary; a rendering may be stored alongside, never
  instead. *Reversal:* re-writing history in existing journals, i.e. not
  reversible in practice.
* **To REF-4/REF-6.** The kernel's exported build identity must be
  readable **from the artifact by a third party** without running a
  session, since O2 depends on it. *Cost:* one exported symbol, already
  ratified in D-d item 3. *Reversal:* an ABI change.

---

## 8. What the surveyed material does *not* answer for our seam

Named, not glossed.

1. **No prior art for certifying an execution of a stateful service.**
   Everything located certifies a mathematical claim about a function's
   output — unsatisfiability, termination, refinement between two
   program texts. Nothing found certifies "this daemon ran this session
   and here is why the verdict follows". The searches issued and their
   results are recorded in
   [`links-and-quotations.md` §E](reference/rq7-run-certificates/links-and-quotations.md).
   We are designing this schema without a template, and should expect to
   discover its holes ourselves.

2. **The term is already taken.** "Session certificate" means an X.509
   artifact to most of the industry. Nothing in the surveyed material
   offers an established name for what REF-8 emits. This is a naming
   decision the estate has to make, not one it can inherit.

3. **Certificate *authenticity* is entirely out of scope of everything
   surveyed.** Every checker in this material answers "does this verdict
   follow from this evidence?" None answers "who produced this
   certificate, and were they entitled to?" Our seats, principals, and
   close authority (DEV-676) make that a live question and the
   literature is silent on it. `certificate-shape/` deliberately does
   not simulate signatures.

4. **Nothing on the economics of a *nightly* certificate run over real
   traffic.** The published cost figures are per-artifact or per-proof:
   6–8 hours for one seL4 binary, 3 MByte/min for one Coq checker. No
   surveyed project runs a checker continuously over a stream of
   production executions, so there is no published guidance on retention
   (how long do certificates live?), on aggregation (does a night of
   sessions produce one report or ten thousand certificates?), or on
   what to do with the certificate of a session that is later found to
   have been served by a buggy shell.

5. **Nothing on certificate *schema evolution*, which REF-9 guarantees
   we will need.** CPF and LRAT are both versioned formats, but nothing
   surveyed describes what happens to already-issued certificates when
   the model changes underneath them. Under REF-9, a model extension
   changes the kernel digest, which by O1 invalidates every prior
   certificate against the new artifact. Is a certificate a permanent
   record valid against the artifact it names — in which case old
   artifacts must be retained forever — or a transient check valid only
   at HEAD? **The surveyed material does not decide this and REF-8 must.**

6. **No measurement of *our* checking cost exists.** The 5.8 MB and
   734 MB figures in §5.2 are about SAT search and do not transfer.
   Our regime is argued to be linear (§5.3), and the toy reproduction
   runs in milliseconds, but no measurement over a real session length
   or a real gauntlet volume has been made by anyone, including this
   seat. That measurement belongs to REF-8's own spike, not to this
   report, and the argument in §5.3 should be treated as a prediction
   until it is made.

7. **The false-alarm question is answered for validators but not for
   us.** Necula's 10% figure applies to a validator that *reconstructs*
   the correspondence. Our checker replays, so it should have no false
   alarms at all — but "should" is doing work there. A nondeterminism
   anywhere in the replay path (a map iteration order, a timestamp
   leaking into canonical bytes, a locale-dependent comparison) would
   surface as a false alarm, and RQ-6 is the seat holding the catalogue
   of where such things hide. Cross-reading RQ-6's nondeterminism
   sources against the certificate's replay path is work neither seat
   has done.

8. **Whether a certificate can be checked inside Lean at our scale is
   untested.** §3.4 establishes the pattern exists in the toolchain, and
   §5.2 establishes that Lean's default `maxHeartbeats` refused a
   734 MB certificate on this machine. Whether a session-sized foldlab
   certificate is comfortably inside those limits, and whether raising
   `maxHeartbeats` is a sane thing to do in a gate, was **not tested**.

---

## Independent verification — 2026-08-16

Adversarial re-check by a second seat, same machine, same day. Every
cited primary source was re-fetched independently; both reproductions
were re-run from the committed tree; the repo decisions the report
quotes were re-read from their files. Nothing above this line was
edited — findings before fixes.

Method: PDFs downloaded with `curl` and text-extracted with `pypdf`
6.15.0, then grepped for the exact phrases; Lean facts read from
`C:/Users/kokok/scoop/persist/elan/.elan/toolchains/leanprover--lean4---v4.33.0/src/lean`
and re-executed on Lean 4.33.0 (commit `d8b1897…`); `certificate-shape`
and `lean-lrat-certificate` re-run with `bash run.sh`; two extra
adversarial probes run against `certificate-shape` that the report's
own controls do not cover.

### Claim-by-claim

| # | Claim (abridged) | Source | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Lean 4.33.0 ships a verified LRAT checker whose soundness theorem is one-directional: `check lratProof cnf = true → cnf.Unsat` | `Std/Tactic/BVDecide/LRAT/Checker.lean` | **CONFIRMED** | `check_sound` is at lines 39–49 of a 51-line file and is the file's only theorem; source reads `check lratProof cnf → cnf.Unsat`, and `#check` elaborated it to `… = true → cnf.Unsat` on re-run. No converse anywhere in the file. |
| 2 | A SAT-path `bv_decide` proof carries one extra per-declaration axiom `…_native.bv_decide.ax_1_5`; a normalisation-closed goal carries none | `Inspect.lean`; `Lean/Meta/Native.lean` | **CONFIRMED** | Re-ran `run.sh`: `satPath` → `[propext, Classical.choice, Quot.sound, satPath._native.bv_decide.ax_1_5]`; `normPath` → `[propext, Quot.sound]`. `nativeEqTrue` (Native.lean:37–86) calls `unsafe evalConst Bool auxDeclName` and then builds `Declaration.axiomDecl` of type `mkApp3 (mkConst ``Eq [1]) Bool e Bool.true`. |
| 3 | Lean's own docstring: `bv_decide` "trusts the correctness of the code generator and adds a axioms asserting its result" | `Init/Tactics.lean` | **CONFIRMED** | Verbatim at `Init/Tactics.lean:1896`, inside the `bvDecideMacro` docstring, "a axioms" slip intact. (Report says "around line 1897"; it is 1896.) |
| 4 | 8-bit `a*b=b*a` → 5,831,357 B checked in ~2.2 s; 12-bit → 733,925,046 B whose CHECK fails on `maxHeartbeats` after 444 s | `lean-lrat-certificate/TRANSCRIPT.md` | **CONFIRMED, both sizes byte-exact** | Independent `bash run.sh` produced `certificate bytes: 5831357` — byte-identical — with `[good] exit=0 wall=2400ms`. The 12-bit statement was re-run from scratch in a scratch directory: the emitted `.lrat` is **733,925,046 bytes**, byte-identical to the reported figure, and the run ends `error: (deterministic) timeout at `whnf`, maximum number of heartbeats (200000) has been reached`. Wall clock here was 5m27.6s against the report's 444 s — a machine-load difference, not a discrepancy in the finding; the report already declines to assert timing ratios from these runs. |
| 5 | The field says DRAT checking "often takes even more time than solving the problem", attributes it to the format not being detailed enough to avoid search, and notes all verified checkers expect an enriched format | Pollitt/Fleury/Biere, SAT 2023 | **CONFIRMED** | All three verbatim in the fetched PDF: abstract — "checking proofs often takes even more time than solving the problem"; §1 — "the format is not detailed enough to avoid search during checking" and "all verified proof checkers expect an enriched format". Licence line on page 1: "licensed under Creative Commons License CC-BY 4.0". |
| 6 | Three-stage LRAT architecture with solver *and* elaborator untrusted; `refute_correct : ∀ c O, refute c O = true → unsat c` quantifies over the untrusted Oracle | Cruz-Filipe et al., CADE 2017 | **CONFIRMED, with one wording defect** | §1 verbatim: "We do not need to trust whether the original proof is correct." §5 verbatim: `Theorem refute_correct : ∀ (c:list (ad ∗ Clause)) (O:Oracle), refute c O = true → unsat c.` followed by "The universal quantification over the oracle ensures that any errors in its implementation (and in particular in the interface connecting it to the checker) do not affect the correctness of this answer." Arrow is one-directional. **Defect:** the paper's next sentence is "the non-certified checker might even produce an optimized proof from an incorrect proof" — the report (§1 item 2, §2.2) and `links-and-quotations.md` §A2 both insert **"valid"**, which the source does not say. |
| 7 | cake_lpr's theorem is one-directional, admits resource exhaustion inside the guarantee, is verified to x64 machine code, and its DIMACS parser is a verified left inverse of the printer | Tan/Heule/Myreen, SAT Competition 2025 checker description | **CONFIRMED** | Fig. 1 contains `extend_with_resource_limit` and `if out = «s VERIFIED UNSAT\n» then … unsatisfiable (interp fml)`. §III verbatim: "formally verified down to the level of its x64 machine code implementation"; line (2) "it may run out of either heap or stack memory (resource limits)"; and "The DIMACS parser is verified to be left inverse to the DIMACS printer." |
| 8 | Necula: 4× slowdown, "about twice as slow" with RTL parsing, ~10% false alarms, human triage. seL4: 6–8 hours, checker trusts inlining | Necula PLDI 2000; Sewell/Myreen/Klein PLDI 2013 | **CONFIRMED** | Necula verbatim: "slows down compilation by a factor of four"; "both compilation and validation are about twice as slow"; "there is a false alarm in about 10% of the compiled functions"; "Each alarm must be investigated by a human." Sewell §4.1 verbatim: "takes an additional 6–8 hours on modern hardware". §3.3.1 verbatim: "the checker trusts that this problem space is derivable from the functions of interest. Checking that inlining was performed correctly did not seem worthwhile." §5 also carries the Pnueli characterisation the report attributes to it. |
| 9 | The eight-obligation certificate refuses all five tampering controls by name, passes honest before and after, and control 4 is caught twice (O1 and O6) | `certificate-shape/` | **CONFIRMED** | Independent `bash run.sh` reproduced the transcript with identical digests (`kernelDigest 7bd9ac2e…`, `journalHead fcfaa248…`, `finalStateDigest 72fab4b1…`); control 4 printed both `O1 kernel identity` and `O6 journal chain` refusals; controls 0 and 6 green. The *check instruction's* second half is separately **REFUTED** — see D1. |
| 10 | No prior art exists for a per-session runtime conformance certificate over a stateful service's execution; every precedent certifies a claim about a function's output. "Session certificate" is occupied by an X.509/TLS meaning | `links-and-quotations.md` §E | **REFUTED (main clause); UNVERIFIABLE (X.509 clause)** | Two on-point precedents found on the first two widened searches — see D2. The X.509 clause is not established by any source in the report or by re-issuing search 1. |

### Sampled beyond the list

| Claim | Verdict | Evidence |
| --- | --- | --- |
| Config keys `timeout` (10), `trimProofs` (true), `binaryProofs` (true), `acNf`, `maxSteps`, `solverMode` "quoted from `Lean/Meta/Tactic/BVDecide/Attr.lean`" (§3.4, §A5) | **REFUTED as cited** | The keys and defaults are real, but they are in `Std/Tactic/BVDecide/Syntax.lean:40–97` (`structure BVDecideConfig`). `Lean/Meta/Tactic/BVDecide/Attr.lean` contains none of them — its only option is `sat.solver`. No API was invented; the citation is wrong. |
| Mehlhorn: witness "proves that the algorithm has not erred for this particular input"; checker "accepts the triple (x, y, w) if and only if w is a valid witness for the equality y = f (x)" | **CONFIRMED** | Both verbatim in the fetched abstract PDF, together with the `[MMNS11]` survey reference (Computer Science Review 5(2):119–161, 2011) the report cites but could not obtain. |
| SAT Competition: certificates required since 2013; proofs over 100 GB at the local storage limit | **CONFIRMED** | Page verbatim: "Certificates of unsatisfiability have been required for the UNSAT tracks since SAT Competition 2013"; "During SAT Competition 2014, a few runs produced proofs of over 100GB, the local storage limit." |
| CeTA version 3.9, dated 2026-06-16, generated from IsaFoR by Isabelle's code generator, no licence on the page | **CONFIRMED** | Page states version 3.9 released 2026/06/16, describes an "automatically generated Haskell program (using the code generation feature of Isabelle)", and states no licence. |
| Cruz-Filipe cost figures: 225 proofs / 250 GByte; Coq ≈3 MByte/min; ACL2 ≈207 MByte/min | **CONFIRMED** | All verbatim in §7. Minor: `links-and-quotations.md` §A2 says hand inspection confirmed all eleven rejected proofs invalid; the paper says only "We then inspected the smallest alleged proofs by hand". |
| Repo quotations: draft 17's "verified by an independently built kernel binary" and "including everything the shell touched"; D-bc's "deployed artifact's digest — built once, embedded everywhere"; D-e's "no proved-with-asterisks status exists"; D-d item 3; the preserved OCaml checker niche | **CONFIRMED** | All verbatim in `scratch/dispatch/17-the-refinement-ladder.md` and `docs/design/2026-08-16-ref0-extraction-grill-record.md`. |

### Defects

**D1 — `certificate-shape/run.sh` does not exit 2 on a no-op tamper; the
guard the report pre-registers does not work. [ran]**

§5.5 states: "`run.sh` now asserts the bytes changed before running the
check, and exits 2 if the tamper was a no-op." It does not. Copied the
directory, neutered control 1's edit to a no-op, and ran it:

```
===== 1. journal entry edited — expect refusal =====
tamper was a no-op
REFUSED  unreadable: ENOENT: no such file or directory, open 'journal-edited.json'
[edited-entry] exit=1  as expected
```

`SCRIPT_EXIT=0`. The inner `$JS -e …` exits 2; `run.sh` has `set -u`
but no `set -e`, so the script continues, `check.mjs` refuses only
because the file it was told to read does not exist, and `expect 1`
reports **"as expected"**. The neutered control reports success. This is
the same species as the failure §5.5 documents — a control that cannot
fail — with an added twist: the refusal that makes it look green comes
from a missing file, not from a detected tamper.

Two aggravating facts. `expect()` never propagates a mismatch into
`run.sh`'s exit status, so the script exits 0 whatever the six controls
do — an "UNEXPECTED" line is printed and swallowed. And only control 1
has a change-assertion at all: controls 3 and 4 use `sed` against
`certificate.json`, exactly the construct §5.5 caught being a silent
no-op against escaped JSON, with no guard.

*Effect on the report's conclusions:* none of §6.1's obligations, and
none of the recommendations, depend on this. But the pre-registration in
§5.5 — "every planted-corruption row must be shown to *change the
artifact* before it is shown to be refused" — is the right rule stated
over a demonstration that does not implement it. REF-8 should take the
rule and not the implementation.

**D2 — "no prior art" is refuted; two on-point precedents exist. [quoted]**

The claim as worded ("every precedent located certifies a mathematical
claim about a function's output rather than an execution of a stateful
service") is false, and the absence is not a finding:

* **Lima, Herasimau, Raszyk, Traytel, Yuan, "Explainable Online
  Monitoring of Metric Temporal Logic", TACAS 2023, LNCS 13993**
  (<https://www21.in.tum.de/~traytel/papers/tacas23-explanator2/expl2.pdf>,
  retrieved 2026-08-16). Abstract, verbatim: "Runtime monitors analyze
  system execution traces for policy compliance." And: "As a second
  application, our verdicts serve as **certificates in a formally
  verified checker** we develop using the Isabelle proof assistant."
  That is a per-run certificate over the execution trace of a running
  system, produced by an untrusted algorithm and validated by a verified
  checker — REF-8's architecture, over a log rather than a function's
  output. The checker is extracted to OCaml, which is directly relevant
  to §6.3 reading 3 and the REF-0 OCaml niche.
* **Setty, Angel, Lee, "Verifiable state machines: Proofs that untrusted
  services operate correctly", ACM SIGOPS OSR 54(1), 2020**
  (<https://eprint.iacr.org/2020/758.pdf>, retrieved 2026-08-16).
  Abstract, verbatim: "a primitive that enables untrusted services to
  provide cryptographic proofs that they operate correctly." §1 draws
  precisely REF-8's distinction from REF-3: program verification "does
  not eliminate issues that stem from an incorrect **execution** of a
  program". Its Spice/Piperine line certifies state transitions of a
  stateful, concurrent service against a specification.

Neither was reachable from the two searches recorded in §E: search 1 was
a single over-constrained conjunction, and search 2 was about certifying
algorithms. The fields not searched — runtime verification / trace
monitoring, and verifiable state machines / proofs of correct service
execution — are exactly where this literature lives.

What survives: no precedent found for the *specific* combination REF-8
needs (journal replay through a named kernel artifact, kernel-digest
binding, tamper-evidence over a protocol daemon's own log). The honest
sentence is "no template for our exact combination", not "no template".
§8 item 1 and §1 item 10 should be read with D2 attached, and the two
papers above are the first places REF-8 should look before designing the
schema from scratch.

The second half of the claim — that "session certificate" already means
an X.509 artifact "to most of the industry" — is **UNVERIFIABLE** as
stated. Re-issuing §E's search 1 verbatim returned database
session-recovery patents, agentic-broker preprints, and a process-mining
conformance checker, and no TLS results at all; a direct search for the
term returns X.509 pages about certificates *used to establish* TLS
sessions, not a term of art called "session certificate". The naming
caution is reasonable; the evidence offered for it is not.

**D3 — O5 does not refuse "any byte edit anywhere". [ran]**

§6.1's table and `certificate-shape/TRANSCRIPT.md` both give O5's refusal
column as "any byte edit anywhere in the journal". O5 digests
`canonical(journal)` after parsing, so it refuses any edit that survives
canonicalisation and nothing else. Probe: re-serialised `journal.json`
with different whitespace — 1,436 bytes → 1,175 bytes, `cmp` reports the
files differ — and `check.mjs` printed `VERIFIED … exit=0`.

Canonical-form digesting is the right design (it is what §6.4 argues
for). The refusal column is the overclaim. For a document whose subject
is the precise wording of guarantees, "any byte edit" should read "any
edit that changes the canonical bytes".

**D4 — O2 is claimed over `buildIdentity` but is never checked and never
exercised. [ran]**

§6.1 row O2 reads "`modelVersion` + `buildIdentity` — the kernel's
exported self-identification (D-d item 3)" and claims it refuses "an
artifact whose exported build identity does not match the model source".
`emit.mjs` writes `buildIdentity` into the certificate, but `check.mjs`
imports only `{ step, canonical, MODEL_VERSION }` and compares only
`cert.modelVersion`. `BUILD_IDENTITY` is never read on the checking side,
and no control in `run.sh` alters `modelVersion` or `buildIdentity`, so
O2 fires in none of the six controls. Of the eight obligations, seven are
implemented and six are exercised. The report presents the roster as
demonstrated; O2 is asserted.

This one matters for the constraint §7.6 hands to REF-4/REF-6, which
rests on O2. The constraint is right; its demonstration is missing.

**D5 — `genesisState` is an asserted field, not a re-derived one, and
the report's own §6.2 rule flags it. [read]**

§6.2 states: "If a field cannot be recomputed from the artifact plus the
journal, it is an assertion, not evidence." `cert.genesisState` is
exactly such a field — `check.mjs` seeds replay from it, and the journal
chain's genesis commits to `kernelDigest` only, not to `genesisState`. It
belongs either in the chain's genesis alongside the kernel digest, or in
the trusted-base paragraph, and §6.1's table names neither. Not exploited
here (any genesis change that alters replay is caught by O7/O8), but it
is the one place the certificate's own stated rule is violated by the
certificate's own schema.

**D6 — "exactly three coherent readings" of "independently built" is not
exhaustive; and "collides" overstates the tension. [read]**

§6.3 and §7.1 enumerate build / host / implementation independence.
There is a fourth, and it is the one D-bc as amended leaves open:
**builder independence** — a different party, on different
infrastructure, rebuilding from the same source and reproducing the same
digest (the reproducible-builds rebuilder-attestation model). It is not
reading 1: reading 1 removes *build nondeterminism* on a designated
platform, which is precisely how D-bc's amendment scopes REF-6
("byte-identical regeneration is gated on a designated build platform …
cross-platform build byte-identity is recorded as a datum"). Builder
independence removes trust in *the builder*, which REF-6 as scoped does
not cover. It is cheap, it is semantically distinct, and it is unnamed.

Separately, "collides with D-bc" (§1 item 8) is stronger than the
evidence. D-bc pins the digest of the *deployed* artifact; nothing in it
forbids a verifier from rebuilding that artifact and comparing digests.
What exists is an ambiguity in draft 17's wording, which §7.1's
recommendation (one editing pass, no build cost) correctly sizes. The
summary line should say "is ambiguous against D-bc" rather than
"collides with".

**D7 — misattributed citation for the `bv_decide` configuration keys.**
See the sampled table. Dispatch rule 4 requires a configuration key to be
"quoted from a primary source"; the keys are genuine and the defaults are
correct, but the file named does not contain them. Fix the path to
`Std/Tactic/BVDecide/Syntax.lean`.

**D8 — "valid optimised proof" is an embellishment of the CADE 2017
sentence.** See claim 6. Drop "valid", or quote the sentence.

### Discipline compliance (dispatch rules 1–6, draft 19)

| Rule | Verdict |
| --- | --- |
| 1 — every claim carries source and retrieval date | **Met.** Retrieval date stated once and globally (2026-08-16) and every URL recorded; toolchain paths and commit given. |
| 2 — "I ran it" outranks "the docs say" | **Met, and unusually well.** Both reproductions re-ran here and reproduced their transcripts, `certificate-shape` byte-for-byte on every digest. |
| 3 — absence is a finding | **Failed for §8 item 1.** Absence was reported after two searches, one of them off-topic; see D2. |
| 4 — never invent an API | **Met in substance, failed in citation.** No invented signature, flag or key was found anywhere; one key list is attributed to a file that does not contain it (D7). |
| 5 — state what the prior art does not answer | **Met.** §8 names eight gaps, several of them against the seat's own work (§8 items 6 and 8). |
| 6 — no recommendation without its cost | **Met.** All six recommendations carry cost, trusted-base delta and reversal. |
| Reference area README with provenance and licence | **Met at topic level, deviated at root.** `rq7-run-certificates/README.md` records what/where/licence/date per item; the root `docs/research/reference/README.md` the rule asks for does not exist — the seat declares the omission and its reason (concurrent sibling seats), and no sibling wrote one either. |

One further note on grades: the report defines a `[lead]` grade in §"Evidence grades used below" and then never uses it in the body. The
unverified material is honestly marked where it occurs (§4.1 "**Not
obtained as a primary text by this seat**"; §8 item 8 "**not tested**";
`links-and-quotations.md` §C "**Status: LEAD, not verified from primary
text by this seat**"), so nothing is passed off — but the proof-carrying
code lead named in the RQ-7 brief appears only in the reference file and
not in the report body at all.

### Verdict on the decision impact

The tension handed to the operator is real but smaller than stated, and
its option set is incomplete: see D6. The two constraints handed to
REF-1 and REF-4/REF-6 are correctly grounded — D-d item 3 says exactly
what §7.6 says it says, and REF-8's replay property does require the
journal to hold canonical `opBytes` — though the REF-4/REF-6 constraint's
demonstration is missing (D4). The wording correction to draft 17 is
right. The refusal to let REF-8 route to `proved` is right and rests on
D-e obligation 2's verbatim "no proved-with-asterisks status exists"; the
mechanism that makes it necessary — a kernel wrong on both sides staying
green — is demonstrated in code, not merely asserted, since `check.mjs`
imports the same `kernel.mjs` that `emit.mjs` ran.

No ratified decision is contradicted by this report. The material defects
are D1 (a pre-registered guard that does not work), D2 (a refuted absence
claim), and D3/D4 (two obligations whose stated strength exceeds their
demonstration).
