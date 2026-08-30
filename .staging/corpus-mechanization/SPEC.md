# CORPUS-MECHANIZATION — first formal specification

Status: **PRE-GRADE**, drafted 2026-08-28. Not law, not a claim, not an
artifact. This is the document a grilling pass is run against; promotion is
the commit into a graded home (candidate: `experiments/parser-census/`).
Nothing here mints a definition, admits a tool, or stamps a gate — every such
act is listed in §12 as owed.

Authorities this document sits under, never above: root
[AGENTS.md](../../AGENTS.md) (conduct C1–C7, procedures),
[CHARTER.md](../../CHARTER.md) (thesis, tower L0–L5, principles P1–P4),
[library/cas/EFFECTS-BACKEND.md](../../library/cas/EFFECTS-BACKEND.md)
(RATIFIED store-language law, R1–R15 — in particular the direction law and
R7), [CLAIM-GATES.md](../../docs/effect-typescript-semantics/CLAIM-GATES.md)
(G0–G6), [KINDS.md](../../docs/lab-core/KINDS.md),
[TOOLS.md](../../docs/lab-core/TOOLS.md).

Companion proposal absorbed: the construct vector bank note (operator, same
day). Its §3 strata, §6a extraction ledger, and its observed/ascribed/derived
split are adopted here with corrections stated explicitly in §13.

---

## 0. What this specifies

A single mechanized pipeline from **pinned Effect-ecosystem bytes** to
**addressable rows that answer questions about Effect constructs and their
occurrences**, and the seam where those rows join the store language's
verified representation.

It specifies five planes, each with: a carrier (what the data IS), a judgment
(what the plane decides), an obligation set (what must hold), and a gate (the
binary observable that says the plane is green). It does not specify Lean
syntax, file layouts, or emitter internals — those are the mechanization
lane's business, constrained by the obligations here.

**What it is not.** It is not a claim that the estate can read semantics off
text. It is the opposite: a specification for measuring precisely how much of
Effect's operational shape is syntactically recoverable, where that
recovery stops, and what the residue costs. The measurement is the product.

---

## 1. Standing facts

Everything below is read from the tree at `da0cc83a`, not asserted.

**Corpus (P0), materialized.**
`experiments/parser-census/corpus-manifest.json` pins **34 projects**,
**26,145 TypeScript files**, **164,584,757 bytes**. Bytes live under
`corpus/` (gitignored, never committed); the manifest is the committed
artifact. Licenses vetted, permissive only; **10 refusals** recorded with
reasons (no license, NOASSERTION, size deferral, discovery false positive,
near-duplicate). `project-labels.json` fixes a **closed 9-label vocabulary**
— `clean-effect`, `wild-effect`, `estate`, `generated`, `dts-only`,
`non-effect-baseline`, `declaration-heavy`, `variance-annotations`,
`harness` — declared as the sampling strata every experiment reuses.

**Operator caveat already recorded in the manifest:** Effect library source is
the *implementation register*, poor ground truth for a consumer-register
classifier. Training positives come from wild projects and generated fixtures.

**Instruments (P1), admitted in [TOOLS.md](../../docs/lab-core/TOOLS.md).**
`typescript@5.9.2` compiler API (syntax-only, no checker);
`lean4-tree-sitter` @ `3a57f55e` with a vendored C seam and a held defect
(`<in E>` variance annotations unparseable);
`oxlint@1.80.0` + `effect-oxlint@0.3.4` as the production chassis;
`winkComposer` @ `0.5.1` (plumbing only, no statistical claim);
`wink-statistics@2.1.1` (arithmetic only). Every row carries a trust
statement and a **G4 ceiling**; version drift is a re-admission event.

**Recognition (P1/P2 seam), promoted.** `experiments/lift-harness` fixes the
portable contract: an engine is any `recognize : SourceText → Verdict[]`;
verdicts are `Lift | Refusal`; **20 refusal codes**; a **5-class spectrum**
(`applicative-gap`, `selective`, `monadic`, `instrument`, `classification`);
an **8-rule v0 manifest as data** (2 rules disabled, honestly recorded);
canonical JSON with sorted keys at every level; `verdictKey` as the equality.
Measured state: **agreement gate 265/265**, **9/9 lifts on both engines**,
wild census **6,908 candidates, 0 v0 lifts**, branches/loops/handlers
**< 1.2%** of refusals.

**Target surface.** `.reference/catalog/EFFECT-SURFACE.md` groups the pinned
v4 surface into **21 stable groups**, **18 unstable groups**, and a
**14-entry schema slice**. Rule-authoring pin `effect@4.0.0-rc.112`; Effect
monorepo pin `f183370f`.

**Store language.** RATIFIED law. Meaning lives in exactly one place — the
reference handler in Lean. The observation is the **word** (byte-decidable).
The stable API to reason over is strata 1–2 of `Representation.lean`
(first-order content; `Prog`, a lawful and initial monad). The **direction
law**: HOOVER (parse pinned sources) is ingestion and *never mints identity*;
EXECUTE (run the Lean model) is the only way words and fixtures are minted;
MATERIALIZE flows denotation → code, byte-gated, never the reverse.

**Not present in the tree.** `models/bank-r0.json` and `models/bank-v3.json`,
named by the vector-bank note, do not exist at `da0cc83a` in the main tree or
in any of the seven worktrees (searched). This specification therefore treats
the enumerated banks as *described but unmaterialized* and does not depend on
their shape. If they exist in an uncommitted lane, §12 records the join as
owed.

---

## 2. The thesis, stated so it can be falsified

The operator's reading: *Effect code is regular enough that its operational
semantics can be largely specified by ingesting raw text, before any program
reification; so the metaprogrammer's job is data organization, not search.*

Stated formally, that is three separable propositions. Only the first is
close to established; the other two are the program.

**T1 (syntactic forcing).** Effect forces effectful composition through a
small closed set of syntactic forms — generator bodies with `yield*`, `pipe`
chains, method chains on described values, `Layer`/`Service` declarations.
Therefore a *syntax-only* recognizer can assign every declaration a
**graded operational reading**: either an operation sequence, or a classified
reason it is not one.
*Evidence:* the v0 harness assigns a verdict to every declaration it walks,
fail-closed, with two independently-implemented engines agreeing 265/265.
*Status:* supported at the fixture scale; wild-scale totality is a P1
obligation (§5), not yet measured as a coverage number.

**T2 (attribution is layout, not search).** Given a bank organized by the
same coordinates the source text presents (module prefix → member → normalized
form), attributing an occurrence costs a prefix traversal whose length is the
token chain, independent of bank cardinality.
*Status:* a complexity claim with a measurable falsifier (§7.4). Unmeasured.

**T3 (the residue is the interesting part).** What syntax cannot decide —
error-channel constituents behind aliases, requirement sets behind inference,
control flow above the straight-line fragment — is not noise to be
approximated. It is the measured boundary at which semantic work begins, and
its size per stratum is the program's principal instrument reading.
*Status:* the v0 census already produces the first reading of it —
**0 lifts / 6,908 candidates** — and that number is the scoreboard, not a
failure.

**The scoreboard.** This program's single headline metric is **lift
coverage**: the fraction of wild Effect declarations that reach a
representation the store language can execute and check. It is **0/6,908 at
v0**. Every increment in this specification is judged by whether it moves
that fraction with the run gate still green — never by how many rows the bank
holds.

---

## 3. The five planes

| Plane | Carrier | Judgment | Gate | Claim ceiling |
|---|---|---|---|---|
| **P0 Corpus** | Pinned bytes + manifest | *is this artifact admissible evidence?* | Re-resolution reproduces pin, digest, byte count | G0 |
| **P1 Instrument** | Engines over source text | *what verdict does this declaration get?* | Multi-engine verdict agreement on the fixture corpus | admission condition, not a claim |
| **P2 Observation** | Rows (construct ledger) | *what does this row record, and from where?* | Byte-identical regeneration from declared sources | G0 for observed; ungated for ascribed; regenerable for derived |
| **P3 Attribution** | Index over rows | *which row does this occurrence attribute to?* | Index agrees with linear scan; cost flat in bank size | derived; no independent claim |
| **P4 Semantic** | `Prog`, words, theorems | *do the two hosts produce the same word?* | Word equality; kernel-checked theorems | G1 (model), G4 (differential) |

The planes are strictly ordered by trust: **no plane may be used to justify a
plane above it.** P2 never validates P1; P3 never validates P2. Trust enters
only at gates, and each gate compares two independently produced things.

---

## 4. P0 — the corpus plane

### 4.1 Carrier

The committed manifest is the artifact; the bytes are evidence. A corpus
entry is a record: identity, remote, commit pin, license with vetting note,
label set, per-label slice selectors, materialized file and byte counts,
declared Effect dependency ranges, and a note carrying any pin correction.

### 4.2 Obligations

- **C0-1 Pin completeness.** Every entry names a full commit. Refusals name a
  reason. Both are already satisfied at `da0cc83a`.
- **C0-2 Byte exclusion.** Corpus bytes are never committed. The manifest, the
  labels, and derived counts are.
- **C0-3 Label closure.** The label vocabulary is closed and extended only in
  `project-labels.json`, never ad hoc in an experiment. Already stated there;
  this specification adopts it as an obligation.
- **C0-4 Slice determinism.** Where a stratum is sampled rather than taken
  whole (`dts-only`, `non-effect-baseline`), the sampled unit list is
  committed *with the run*. Sampling by package, never by file, for
  declaration corpora.
- **C0-5 Register separation.** The `clean-effect` (library implementation)
  and `wild-effect` (consumer) registers are never pooled in a statistic. The
  manifest's caveat becomes a hard rule: a number computed across registers
  is a defect unless the crossing is the number's subject.
- **C0-6 Control stratum.** `non-effect-baseline` is retained in every run.
  Spine rules firing above a ruled threshold there is a recognizer defect, not
  a discovery.

### 4.3 Growth

The corpus grows by **pin**, never by mutation. A new revision of an existing
project is a new entry sharing an identity, distinguished by pin — the same
historic axis the ledger uses (§6.3). Discovery channels are recorded per
tranche. License vetting precedes materialization; refusals are recorded, not
discarded, because a refusal is evidence about the ecosystem's licensing
surface.

### 4.4 Gate

`check:corpus` (owed, §11): for a sampled subset each run, re-resolve the pin
and assert commit identity, file count, and byte count agree with the
manifest. Cheap, catches silent drift, and needs no network for the
already-materialized case if digests are recorded.

---

## 5. P1 — the instrument plane

### 5.1 Carrier

An **engine** is any realization of `recognize : SourceText → Verdict[]` whose
output round-trips canonical JSON. The contract is already fixed and
promoted; this specification adds no new shape to it, only obligations on how
engines are grown.

A **rule manifest** is first-order data: manifest version, language tag,
instrument pins, and an ordered rule list, each with name, register, scope,
and enabled flag. Disabled rules stay in the manifest with their reason —
absence and disabling must be distinguishable.

### 5.2 The recognition judgment

For a declaration `d` under manifest `M`:

```
M ⊢ d ⇒ lifted(document)   |   M ⊢ d ⇒ refused(code, detail)
```

**Totality (C1-1).** Every declaration the engine walks receives exactly one
verdict. Fail-closed: absence of a rule yields a classified refusal, never
silence and never a guess. This is what makes refusal counts a measurement
rather than an error log.

### 5.3 Laws the manifest must satisfy

These are the load-bearing addition of this specification. Without them a
growing recognizer is not a measuring instrument.

- **L1 — Monotonicity under manifest growth.** If `M' ⊇ M` (rules added or
  enabled, none removed or weakened), then for every declaration `d`:
  `M ⊢ d ⇒ lifted(x)` implies `M' ⊢ d ⇒ lifted(x)` — *the same document*.
  Enabling rules may convert refusals to lifts; it may never convert a lift to
  a refusal, and it may never change an existing lift's document.
  *Falsifier and gate:* a corpus of stored `(declaration, manifest, verdict)`
  triples replayed against every later manifest. A changed lift document is a
  defect, and the ruling is whether to revise the rule or version the
  language — never to overwrite the triple.

- **L2 — Engine interchangeability.** Two engines are interchangeable exactly
  when their verdicts are canon-identical under `verdictKey` on the
  by-construction fixture corpus. This is the *only* trust mechanism at P1,
  and it is already implemented. Engines must share the contract and nothing
  else — a shared walker between "independent" engines voids the gate.

- **L3 — Execution isolation (direction law at P1).** A recognizer HOOVERS.
  It never mints an address, a fixture, or a word. A lift document is a
  *proposal* for execution; only the Lean reference handler executing it mints
  the word. No TypeScript engine may execute a lift document and record the
  result as ground truth.

- **L4 — Deviation visibility.** Every knowingly-held deviation (v0 holds
  three: rule 7 hex pinning disabled, `const-yield-load` disabled, E-BRANCH
  arms unattempted) is recorded in the contract, mapped in the spectrum, and
  re-runs the gate when revised. A silent deviation is a defect.

### 5.4 Growing the instrument

Rules enter under **consumer gating**, mirroring the store language's
signature discipline: a rule enters when a real consumer needs the construct
it recognizes, never speculatively. Each new rule ships with by-construction
fixtures that exercise it positively and negatively, the L1 replay corpus
extended, and both engines updated independently.

### 5.5 The spectrum is the semantics reading

The refusal spectrum is not triage bookkeeping. It is a coarse operational
classification recovered from syntax alone, and it is the concrete form T1
takes:

- `applicative-gap` — the value is composed but the composition is not
  sequential dependence; recognizable, not yet lifted.
- `selective` — branching whose arms are attempted.
- `monadic` — genuine sequential dependence, loops, handlers, closures over
  answers; above the straight-line fragment.
- `classification` — the shape is unrecognized by the current manifest; a
  *recognizer* limit, not a language one.
- `instrument` — an admitted tool's limit (an unparseable construct, an
  unpinned helper); a *tool* limit.

**C1-2 Spectrum honesty.** A refusal is assigned the class that names *what
actually stopped the lift*. Mapping a recognizer limit to `monadic` would
inflate the apparent semantic difficulty of the ecosystem; mapping a genuine
monadic bind to `classification` would inflate apparent recognizer debt. The
v0 held deviation (E-BRANCH → `monadic` because arms are unattempted) is
exactly this hazard, recorded rather than hidden, and it resolves when arms
are attempted.

The per-stratum spectrum histogram is the **principal instrument reading** of
the whole program. It answers, from text alone: how much of wild Effect is
straight-line, how much is branching, how much is genuinely higher-order, and
how much we simply have not taught the recognizer yet — with the last two kept
apart, which is the entire point.

---

## 6. P2 — the observation plane (the construct ledger)

### 6.1 Row identity and the three strata

A row is identified by **(construct, pin, stratum)** and addressed by the
content address of its canonical form. Rows are **immutable**; a construct's
history is a chain of addresses, not a mutated record.

Every row carries exactly one **stratum tag**, and the tags never mix in one
row:

- **OBSERVED** — measured from bytes. Carries: source artifact identity,
  extractor identity and version, pin, and the trust statement under which the
  extractor is admitted. Includes *other people's ascriptions as bytes*:
  a library's own `@category` tag, its doc prose, a changelog entry, a
  discussion title. We record that they said it; we never adopt what they said
  as our claim.
- **ASCRIBED** — the estate's rulings. Small, closed, grill-gated, versioned
  as data. Semantic class, port status, domain and role tags, spectrum rows,
  lift-relevance grade, cross-generation equivalence rulings, model-or-
  black-box rulings, extractor trust statements.
- **DERIVED** — regenerable from observed and ascribed rows by a declared
  function. Never hand-edited. Carries the addresses of every input row.

This is the vector-bank note's split, adopted. The names remain a mint owed
to lab-core (§12); the glosses to carry into the grilling are: observed ≈ the
extensional database, ascribed ≈ our terminology and judgments, derived ≈ the
intensional database computed from both.

### 6.2 Laws

- **L5 — Row immutability.** A row, once addressed, is never rewritten. A
  correction is a new row plus a superseding edge. The ledger is append-only,
  and therefore a Merkle DAG by construction.
- **L6 — Provenance completeness.** Every observed row names artifact,
  extractor, extractor version, and pin. A row that cannot name all four is
  inadmissible — not degraded, inadmissible.
- **L7 — Ascription containment.** No derived row may depend on an ascribed
  value without carrying that ascription's row address. Consequence: revising
  a ruling invalidates *exactly* the derived rows that consumed it,
  mechanically. This is what makes the estate's judgments safe to grow — a
  changed ruling cannot silently contaminate a statistic.
- **L8 — Residue is a value.** Every extraction reports, per stratum,
  `covered + residue = total`, with residue classified by *why*. Unresolved is
  a first-class recorded value; a missing row and an unresolvable row are
  never the same thing. Coverage without its residue is inadmissible.
- **L9 — Identity is minted by execution, never by hoovering.** The extractor
  emits canonical first-order data. The **address** of a row is computed by
  the canonical encoder of record — the Lean side — and any JSON carrier is a
  MATERIALIZATION under the byte-identity gate. This is the direction law
  applied to the ledger, and it is a correction to the vector-bank note (§13).

### 6.3 The dimension record

For a construct `c` at pin `p`, the observed dimension record — the "how many
parameters, of what types, across which versions, what errors can flow
carrying what, what requirements are drawn" question — is:

- **overload set**: per overload, parameter count, per-parameter canonicalized
  type text plus its address, type-parameter count, return shape;
- **arity ladder**: the arities under which the construct can be specified,
  with data-first and data-last recorded as **distinct canonical forms** (they
  are distinct, and pretending otherwise loses the pipeable register);
- **channel decomposition**: where the return shape is `Effect<A, E, R>` (or
  its trailing-`never` elisions), the syntactic constituents of `E` (union
  members; tagged error names with field shapes) and of `R` (service keys);
- **runtime kind and identity**: `typeof` classification, TypeId/symbol
  identities, variance annotations;
- **self-description**: the pin's own doc prose, `@example` blocks, `@since`,
  `@category`, `@deprecated` — recorded as observed bytes, attributed to the
  library.

**C2-1 Syntactic honesty on channels.** Extraction is syntax-only; no type
checker is admitted. Therefore `E` and `R` constituents are recoverable
**only where syntactically present**. An alias, a conditional type, or an
inferred union is *residue*, classified as such under L8. The note's
"extracted, never inferred" is right; this specification adds the consequence
it must carry — a measured residue class, reported per module. Admitting the
checker later is a re-admission event with its own trust statement, because a
checker's output is inference, not observation.

**C2-2 Canonical form definition is a ruling, not an implementation detail.**
"Canonicalized type text" is undefined until the normalization rules are
ruled: whitespace, identifier qualification, type-parameter renaming, member
ordering, elision handling. Until that ruling lands, no address may be minted
for a signature row. Owed, §12.

### 6.4 The observed-occurrence rows

Per occurrence, per corpus pin: resolved construct; normalized **form hash**
(call shape and argument-kind vector); saturation and pipe-position evidence;
site provenance (project pin, file, byte span); containment context (entity
kind, bracket interval, depth); co-occurrence sets at span/entity/file grains;
import-style distribution; the repo's own Effect version; observed
error-handling (which `E` members are actually caught); test-stratum usage
recorded separately; adjacent comment lines.

**C2-3 Occurrence rows are stratum-scoped.** Every occurrence row names its
corpus stratum, and no aggregate crosses `clean-effect` / `wild-effect`
without saying so (C0-5).

**C2-4 Discourse rows carry an ethics ruling.** Community-discussion evidence
enters only as *aggregate frequencies and thread titles from pinnable public
archives*. No stored quotations of individuals, no raw chat scraping. The note
proposes this; this specification treats it as a **blocking precondition** —
the discourse stratum does not begin until that ruling is made explicitly.

### 6.5 Version chains

Rows join across pins by construct identity. A construct's chain is the
ordered sequence of its row addresses; presence and absence per pin is
observed data, and canary sets (what appeared, what vanished) are **derived**
from it. Renames that no chain can observe — a construct moving between
namespaces across generations — are **ascribed** equivalence rulings, and
under L7 every derived fact that crosses such a rename carries the ruling's
address.

**C2-5 Chain representation is owed** (explicit edges versus recomputed
diffs). Recommendation for the grilling: recompute diffs, store nothing —
canary sets are cheap, and stored edges are a second source of truth.

### 6.6 The interesting derived rows

Named because they are the reason the ledger is worth building, and each is
computable only once the strata are separated:

- **doc-versus-usage divergence** — constructs whose observed wild usage
  departs from their documented purpose;
- **friction coefficient** — discussion frequency over usage frequency;
  discussed far more than used suggests confusion or aspiration, used far
  more than discussed suggests an invisible workhorse;
- **migration pain** — discussion spikes joined to version-chain edges;
- **lift-coverage rollup** — per construct, per module, per stratum: the
  fraction of occurrences inside declarations that reach a lift (§8). This is
  the scoreboard of §2, resolved to the construct level, and it tells the
  recognizer lane exactly which construct to teach next.

### 6.7 Gate

`check:ledger-rows` (owed): regenerate every observed and derived row from the
pinned bytes and the ascription set; assert byte identity with the committed
carrier; assert every row satisfies L6 (provenance completeness) and L8
(residue reported); assert L7 (no derived row cites an ascription it does not
name).

---

## 7. P3 — the attribution plane

### 7.1 Carrier

An index over ledger rows mirroring the coordinate system: module prefix →
member → form address. The pinned Effect distribution ships `Trie`
(collections group of the surface catalog), so the carrier needs no new
machinery; the index is built at load from the ledger. The index is
**derived** — never authored, never committed as a source of truth, always
reconstructible. (The note refers to a pattern-bank service that "builds this
today"; no such service exists in the tree at `da0cc83a` — searched. If it
lives in an uncommitted lane, §12 item 17 covers the join.)

### 7.2 The attribution judgment

```
Index ⊢ occurrence ⇒ row-address   |   Index ⊢ occurrence ⇒ unattributed(reason)
```

Resolution: import-resolved module prefix, then member, then — when the deep
question is asked — the occurrence's normalized form address lands on the
exact observed-form row.

### 7.3 Laws

- **L10 — Index conservativity.** The index answers exactly what a linear
  scan of the ledger answers. Gated by differential replay on a sample every
  run. An index that answers *more* than the ledger is fabricating.
- **L11 — Unattributed is a value.** Occurrences that resolve to no row are
  counted and classified (unknown module, unknown member, known member with
  unknown form). Attribution coverage is reported with its residue, per L8.
  An occurrence silently dropped is a defect.

### 7.4 The cost obligation — and its falsifier

T2 claims attribution cost is prefix traversal, independent of bank size. That
is a claim, so it gets a measurement and a falsifier:

**C3-1.** Attribution wall-time per occurrence is measured against ledger
cardinality across at least three ledger sizes spanning an order of magnitude.
The obligation is a **flat** curve within a ruled tolerance. A rising curve
falsifies T2 for the current layout, and the response is a layout change, not
a re-scoped claim.

The word "instantaneous" never appears in a claim. The claim is a complexity
bound with a measurement behind it.

---

## 8. P4 — the semantic plane, and where verification actually lives

This is the plane the other four exist to serve, and the only one where the
estate's verification vocabulary applies.

### 8.1 The chain

```
source text  --P1-->  verdict  --lift-->  lift document
             --EXECUTE (Lean, reference handler)-->  word
             --differential (generated Effect host)-->  word'
             gate: word = word'   (byte-decidable)
```

A lift document is already the shape of the store language's run instructions
(`Instruction` / `Ref` / word). The reference handler is the *only* bearer of
meaning; the TypeScript host is a realization claimed against it by
observational agreement, and the observation is the word. This is ratified law
(R10), not a proposal.

### 8.2 What is verifiable, precisely

- **G1 (model).** Kernel-checked theorems over `Prog` and the reference
  handler. The recognizer's laws L1 (monotonicity) and L10 (index
  conservativity) are candidates for mechanization once their carriers are
  Lean data. The lift-document → `Prog` translation is a candidate G3
  (extraction) statement, and stating it precisely is a named obligation, not
  a claim being made here.
- **G4 (implementation conformance).** Word equality between the Lean
  reference and the generated Effect host on lifted programs. This is real and
  green today at the vector scale.
- **Not verifiable, ever, by this machinery.** That an occurrence "means"
  something. That an ascription is correct. That a statistic generalizes
  beyond its corpus. Those are, respectively, a ruling, a ruling, and a
  sampling-design question. None of them may be stamped.

### 8.3 The seam that must stay stable

`node → row address → dimension record`. When the store language's
continuation tree carries construct addresses, every node answers dimension
queries through the ledger. Everything in §6 may grow; this interface may not
drift without a ruling, because it is the join through which observation
reaches verification.

### 8.4 Coverage growth is the only progress measure

An increment lands only if it moves lift coverage (§2) with the run gate
still green, or if it demonstrably reduces the residue that blocks such a
move. Rows added, modules ingested, and constructs enumerated are **inputs**,
not progress. This is stated as an obligation because the failure mode of a
data-organization program is a beautiful bank that nothing consumes.

---

## 9. Claim discipline

| Thing | Highest permissible stamp | Why |
|---|---|---|
| A corpus pin | G0 | Byte selection, nothing more |
| An extractor's inventory | G0 evidence, admitted only through its cross-instrument gate | Trust statements bound it to shape facts |
| A recognition verdict | no G-stamp | An engine's output; the agreement gate is an admission condition, not a claim |
| A census statistic | G4 ceiling, sampled evidence | Both harness tools carry explicit "no statistical claim" trust statements |
| An ascription | no stamp | It is a ruling, and rulings are not claims |
| A derived row | no independent stamp | Inherits the weakest input's standing |
| A word-equality run | G4 | Differential conformance on the stated domain |
| A theorem over the model | G1 | Kernel-checked, axiom report required |

**C5 applies without exception.** Nothing in this pipeline may be described as
sound, verified, equivalent, or preserving unless it links a named judgment or
theorem. "The recognizer agrees with itself across two engines" is not a
verification result; it is an agreement measurement, and it is stated that
way.

---

## 10. Scale

Current corpus: 26,145 files / 157 MiB. Order-of-magnitude expectations, to be
replaced by measurements as soon as the extractor runs — recorded here so an
overrun is visible as a surprise rather than absorbed silently:

- **Rows.** Signature-stratum rows scale with the declared surface (39
  module groups plus the schema slice); occurrence rows scale with corpus
  declarations, which is the number that could run large. The mitigation is
  built in: occurrence rows are keyed by *form address*, so repeated identical
  usage collapses to a count on one row rather than N rows. Whether that
  collapse actually dominates is the first thing the extractor measures.
- **Regeneration.** Per-pin, embarrassingly parallel, deterministic. The gate
  is per-row byte identity, so a partial regeneration is checkable.
- **The store-admission direction.** The ledger as store content — nodes and
  refs in the CAS itself, making the analysis substrate an instance of the
  thing being analyzed — is a direction, grill-gated, and **nothing in §4–§8
  depends on it**. The JSON carrier serves until the ruling. Note the honest
  attraction: under R12's tower, a service implemented as a program over a
  lower signature is just a handler, so a ledger that is store content is not
  a novelty — it is the tower applied once more.

---

## 11. Stages

Each stage has a binary done-condition. Stages are ordered by dependency;
S2–S4 can run concurrently once S1 lands.

- **S0 — Rulings.** The blocking ones from §12 are ruled: row schema and
  canonical-form normalization (C2-2), the naming mint, the discourse ethics
  ruling (C2-4). *Done ⇔ each has an entry in the owning CONTEXT.md.*
  **Blocking: no address may be minted before C2-2.**
- **S1 — L1 replay corpus.** Stored `(declaration, manifest, verdict)` triples
  and the replay check that enforces monotonicity. *Done ⇔ a manifest revision
  that changes a lift document turns the gate red, demonstrated on a
  deliberately bad revision.* Cheap, and it protects everything after it.
- **S2 — Signature extractor.** Per pin, syntax-only walk of the package's
  `.d.ts`, emitting signature and self-description rows with residue reported
  per L8, under the two-instrument agreement discipline already admitted.
  *Done ⇔ `--check` byte-gated regeneration is green and the residue report
  exists for every module in the surface catalog.* The variance-annotation
  defect will refuse on the tree-sitter instrument over the schema surface by
  design; the carve-out or grammar re-admission is decided here, in the open,
  not silently (this is already flagged in the ratified ingestion notes).
- **S3 — Occurrence extractor.** Form hashing over span-linked census hits;
  occurrence rows accrete per corpus run keyed to the manifest's pins.
  *Done ⇔ per-stratum spectrum histograms regenerate byte-identically, and
  attribution coverage with residue is reported.*
- **S4 — Index and cost measurement.** Build the trie from the ledger; run
  L10 conservativity replay and the C3-1 flat-cost measurement.
  *Done ⇔ conservativity green and the cost curve published with its
  tolerance — including if it falsifies T2.*
- **S5 — Version chains.** Rows joined across pins: the v4 rc line, v3.22.1,
  and the `@effect-ts` generation the old-register tranche already pins.
  *Done ⇔ canary sets recomputed from presence data, no stored edges (pending
  C2-5).*
- **S6 — Coverage-driven recognizer growth.** The lift-coverage rollup (§6.6)
  selects the next construct to teach; a rule enters under consumer gating
  with fixtures, both engines, and the L1 corpus extended.
  *Done ⇔ lift coverage strictly greater than 0/6,908 with the agreement gate
  and the word-equality run gate both green.* **This is the first stage that
  moves the scoreboard.**
- **S7 — The semantic join.** Construct addresses carried on program nodes;
  dimension queries answered through the ledger at the §8.3 interface.
  *Done ⇔ a program node resolves to its row and its dimension record, in the
  Lean model, with the run gate green.*

**Ordering note.** S6 before S7 is deliberate: an unconsumed ledger is the
failure mode this specification is written to prevent, so the first consumer
lands before the join is generalized.

---

## 12. Owed — mints, rulings, admissions

Nothing below may be treated as settled. Each is listed with its owner.

**Mints owed (lab-core CONTEXT.md unless noted).**
1. `observed` / `ascribed` / `derived` — the three strata, with glosses and
   avoid-lists.
2. The whole artifact's name. The note offers "vector bank"; the rows are
   coordinatized, content-addressed, append-only records, and "bank" suggests
   mutable storage. Recommendation: **construct ledger** for the row set —
   consistent with the estate's existing regenerated ledgers — and
   **observation plane** for the P0–P4 pipeline. Operator's call.
3. `lift coverage` — the scoreboard metric, with its denominator defined
   (candidates per stratum) so it cannot drift.
4. `residue` as a first-class recorded value (L8), if lab-core does not
   already carry an adequate term.
5. Artifact kind for a ledger row set — `taxonomy` and `model` both misfit;
   a new kind may be owed to [KINDS.md](../../docs/lab-core/KINDS.md).

**Rulings owed.**
6. **Row schema and canonical-form normalization** (C2-2) — blocking S2.
7. **JSDoc-as-purpose admission** — the library's own words, attributed,
   never adopted as our claim; needs a TOOLS.md-grade trust statement for the
   doc extractor.
8. **Version-chain representation** (C2-5) — recommendation: recompute.
9. **Discourse ethics** (C2-4) — blocking the discourse stratum entirely.
10. **Store-admission direction** — ledger as store content; independent of
    everything else, so it can be ruled late.
11. **Complexity**, if it is to be a column at all: one ruled definition
    before any row carries it. The note lists it as derived; derived from what
    is undefined today.
12. **Control-stratum threshold** (C0-6) — the rate at which spine rules
    firing on non-Effect code counts as a recognizer defect.
13. **Cost tolerance** (C3-1) — what "flat" means numerically, ruled *before*
    the measurement, not after.

**Admissions owed ([TOOLS.md](../../docs/lab-core/TOOLS.md)).**
14. Any new extractor instrument for `.d.ts` walking, if it is not one of the
    two already admitted.
15. The doc-prose extractor (ruling 7's instrument).
16. Any archive-crawling instrument for the discourse stratum — and only
    after ruling 9.

**Joins owed.**
17. The enumerated banks named in the vector-bank note
    (`models/bank-r0.json`, `bank-v3.json`) are not in the tree at
    `da0cc83a`. If they exist in an uncommitted lane, their shape must be
    reconciled with §6.1 before S2 emits rows, or they are superseded.

---

## 13. Corrections to the vector-bank note

Stated plainly, because the note is the input this specification builds on and
divergence is a stop condition (C2).

- **Identity minting.** The note says the bank "is an append-only Merkle DAG
  by construction" and rows are "ADDRESSED by the hash of canonical content."
  Under the ratified direction law, hoovering never mints identity. The
  correction (L9): extraction emits canonical first-order data; the canonical
  encoder of record computes the address; the JSON file is a materialization
  under the byte gate. The DAG is real — it is just minted on the execute
  side, not the ingest side.
- **Channel extraction coverage.** "Extracted, never inferred" is correct and
  is kept. What must accompany it is the residue it implies (C2-1): with no
  type checker admitted, aliased and inferred error and requirement channels
  are unrecoverable, and their measured size per module is a required output.
- **"Complete static reasoning power."** The note frames a fully-dimensioned
  bank as the road to it. This specification does not adopt that phrasing:
  what a fully-dimensioned ledger delivers is *complete syntactic
  attribution*, which is a necessary input to reasoning and not reasoning
  itself. The reasoning claims live at P4 and carry G1/G4, nothing more.
- **Progress measure.** The note's plan is organized by strata and pins. This
  specification adds the scoreboard (§2, §8.4) and subordinates row growth to
  it, because 0/6,908 is the number that matters and no quantity of rows
  changes it by itself.
- **Speed.** "Almost instantaneously" becomes a measured complexity
  obligation with a falsifier (C3-1). Kept as an aim, never stated as a
  property.

---

## 14. Falsifiers

The specification is wrong, and should be revised rather than defended, if:

1. **T1 fails at wild scale** — recognition totality cannot be maintained over
   wild corpora without unclassified silence, so refusal counts stop being a
   measurement.
2. **The spectrum does not separate** — recognizer debt and genuine monadic
   structure cannot be told apart in practice, making the principal instrument
   reading uninterpretable.
3. **C3-1 shows a rising cost curve** — attribution is search after all, and
   the layout thesis needs replacing.
4. **Residue dominates** — syntactic channel extraction leaves so large a
   residue that the dimension record answers few real questions, forcing the
   checker-admission decision much earlier than planned.
5. **Coverage will not move** — S6 cannot raise lift coverage above zero
   without violating L1 or reddening the run gate, meaning wild Effect sits
   structurally above the fragment the store language can currently execute,
   and the store language's fragment is the thing that must grow first.

Each of these is a finding worth having. None of them is a reason to soften a
claim after the fact.
