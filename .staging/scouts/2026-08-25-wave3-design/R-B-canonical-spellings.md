# R-B — canonical forms and the spelling-family problem

**Posture: G0 advisory, 2026-08-25. This document decides nothing.** It is a consolidation
pass over design work and literature the estate already holds. Rulings are the operator's.
Every external fact carries an in-repo receipt (`file:line`); anything that would need a
source this host does not hold is marked **ACQUISITION-GAP** with the paper named. No web
access was used or available.

Lane: wave-2 faults **F-27**, **F-34**, **F-29**, and the duplicate-key mechanism behind
**F-40/F-41**.

Receipt conventions used below:
- **PROVED** — a kernel-checked theorem named in a probe file in `.staging/scouts/`.
- **SOURCE** — a `file:line` citation into the pinned Effect bytes, quoted through
  `docs/entity-store/research/schema-ast-census.md` (this host holds the census, not the
  clone).
- **DERIVED** — my own reasoning from definitions in `formal/entity-store/E2/`. Not proved.
  Flagged individually; each names the probe that would settle it.
- **ACQUISITION-GAP** — needs a document not on this host.

---

## 0. Summary of what the consolidation found

1. The single-spelling rule (MAPPING admission rule 2) is not a rule. It is a placeholder
   naming two instances. Refuter 3 proved ten families; scout A's mapping-wave report
   already held an eleventh that nobody carried forward; F-29 is a twelfth axis; and two
   of the ten generalise from `Never` to *any uninhabited schema*, which no finite
   syntactic clause can catch (§2.4, DERIVED).
2. The ten families do **not** form one problem. They split on an axis the estate already
   ruled on and then lost track of: **eight are cross-constructor collapses, three are
   intra-constructor order/mode facts that G6/Q12 forbid collapsing** (SP-2, SP-4, SP-5),
   and one of the eight (SP-3) is *also* forbidden under `oneOf` for a reason nobody has
   recorded (§2.3, SOURCE).
3. `canonS` is, today, **constructor-preserving at every one of its thirteen equations**
   (`E2/Canon.lean:37-51`). All three ratified canonicalization acts (R-10, Q11, Q13/A-6)
   are intra-constructor. Both ratified single-spelling instances (MAPPING rows 12 and 23)
   are boundary rejections. **The estate's implicit posture already partitions the problem
   the way §2 does** — it simply never wrote the partition down.
4. Consequently option (a) — folding normalization into `canonS` — cannot absorb *any* of
   the ten "for free": each absorption either widens the declared equivalence beyond
   KICKOFF §4.3's per-constructor menu (a scheme-version act by that document's own words)
   or makes the equivalence coarser than the subject (the #3509 shape, which §4.3
   explicitly forbids one level up).
5. The unbounded `mu` family *does* have a finite clause, in either option (b) or option
   (a) form, and it costs about twenty lines: a decidable `usesBinderB` mirroring
   `closedB`'s recursion skeleton exactly (§5.2, DERIVED with the proof sketch).
6. Option (c) — carrier narrowing — kills **fewer families than it looks like it kills**.
   Merging `.tuple`/`.array`/`.tupleRest` into one Effect-shaped `Arrays` node dissolves
   SP-7 (the *infinite* family, F-27's headline) but leaves SP-8, SP-9, SP-10 standing,
   because those are about an uninhabited schema in a position, not about redundant
   constructors (§6.3, DERIVED).
7. F-29 (check payloads) rides along with (a) only, and only at the price of a **new,
   currently unstated invariance** on the R-4 allowlist that is strictly stronger than
   F-24's (§7).

---

## 1. The fault surface, restated against the sources

### 1.1 What admission rule 2 actually says

`docs/entity-store/MAPPING.md:60-62`:

> **Single-spelling rule** — where the carrier offers multiple byte forms for one source
> construct (`Never` via `anyOf`-nil vs `oneOf`-nil; `TemplateLiteral`'s three spellings),
> exactly one is admissible; the others are rejected at the boundary.

Two things about that sentence matter for the repair design space.

**First, it names the right subject and the wrong yardstick.** "One source construct" is the
correct frame — refuter 3 says so explicitly (`R3-transport-admission.md`, Target 3 notes:
"the rule must be phrased against the *source construct*, not against conformance"). But the
ten proved families were found by asking `Conforms`, which is the lab's typing judgment, not
the source's identity. Some families are source-real and some are not; §2 separates them.

**Second, its two ratified instances were both discharged by rejection, not canonicalization.**
MAPPING row 12 (`:36`) rules the `oneOf`-nil spelling of `Never` INADMISSIBLE; row 23 (`:46`)
rules the `refine` spelling of `TemplateLiteral` "the ONLY admissible one". Neither was
absorbed into `canonS`. That is a precedent for option (b), set twice, on the same day the
rule was written.

### 1.2 F-34 — the coverage fault

Ten families, each a full `↔` on `Conforms` for all values and all environments, each with a
byte receipt through the proved `encSchema_inj`
(`.staging/scouts/2026-08-25-wave2/R3-p3_spellings.lean`, `preimage_ne` at `:18-21`). One is
unbounded: `sp6_bytes_family` (`:158-159`) proves `.mu "d1" X ≠ .mu "d2" X` at the pre-image
for closed `X`, and `sp6_same` (`:151-154`) proves both denote `X` — **one address per
discriminator string, for a single denotation.**

### 1.3 F-27 — the infinite family A-4 created

`.array e ≡ .tupleRest .nil e` for **every** `e`, proved generically
(`R1-p3_a4_edges.lean`, `A1_array_eq_tupleRest_nil`, "does not depend on any axioms"), with
`A2_two_addresses` giving the byte split (`encSchema` opens `.array` at `0x34` and
`.tupleRest` at `0x3B` — `E2/Encode.lean:122,129`). Plus `.tuple es ≡ .tupleRest es Never`
generically (`B3_tuple_eq_tupleRest_never`) and `.record Never ≡ .object .nil` (`D2`).

R1's own disposition line is worth quoting because it is prior estate writing on exactly the
question this brief asks (`R1-canon-bridges.md` §8 row e):

> The single-spelling rule (MAPPING, ruled for `Never`) is re-applied to A-4's constructors:
> an admission rule rejecting `tupleRest` with an empty element list, and a `canonS`
> normalization is **not** the answer (it would change `Conforms`' subject)

and R1's Q-R1-3 already enumerates the same three options this brief re-opens, adding the
cost that matters: a normalizing `canonS` "would need `Conforms env (canonS s) v ↔ Conforms
env s v`, which is a *new and much stronger* obligation than anything pinned."

### 1.4 F-40 / F-41 — the duplicate-key mechanism, and why it is a *different* fault

It is worth being precise, because F-40/F-41 look like a spelling problem and are not.

`insertField` places an equal key **after** the existing run (`E2/Canon.lean:28-34`; the test
is `if key < k`, false on ties), while `canonFields` folds right-to-left (`:53-55`). On a
run of equal keys the pass therefore **reverses** the run — an involution, not idempotence
(F-12's mechanism, STORE-MODEL §7 A-3 record at `:249-257`).

Two consequences, mirror images:

- **F-40**: an involution's fixed points are its palindromes, so a *palindromic* duplicate-key
  run byte-compares equal to its own re-canonicalization and sails through STORE-SHELL §5
  check 2 (`STORE-SHELL.md:107`; `Shell/Boundary.lean:137-138`). Receipt: a three-field
  carrier keyed `"a"` carrying **two different schemas** is admitted and checks clean
  (`r2-12-dupkey-admitted.script`, model and disk agreeing).
- **F-41**: a *non-palindromic* duplicate-key run is rejected `non-canonical` — bytes the
  shell itself just produced (`r2-14-canon-involution-self-reject.script`). Stated exactly:
  `preimageS` is not idempotent as a byte function.

**This is a canonicalizer defect, not a spelling family.** No two distinct *source*
constructs are involved; a duplicate-key field list has no source counterpart at all
(Effect's `Objects` constructor throws on duplicate property names — SOURCE:
`SchemaAST.ts:2119-2121`, census §1). Its repair is the family-2 boundary amendment already
ranked in the triage (`2026-08-25-wave2-triage.md:79-81`): **have the boundary call `WFS`**,
which already contains `dupFreeS` since A-3 (`E2/Model.lean:163-164`).

The relevance to this lane is structural, not mechanical, and it is the strongest argument in
the whole report: **F-40/F-41 are what happens when a normalization pass is asked to carry an
admission rule.** `canonS` was made to do the work of a predicate, and on the inputs the
predicate would have rejected, the pass is not even a function of the equivalence class. Any
option that adds *more* rewriting to `canonS` inherits that hazard shape; any option that adds
a predicate does not. §4.4 returns to this.

### 1.5 F-29 — check payloads

`canonS` passes the check through whole (`E2/Canon.lean:42`: `| .refine s c => .refine (canonS
s) c`). `litsCanonicalB` does not inspect it (`E2/Bridge.lean:37`), `dupFreeS` does not
(`E2/Canon.lean:118`), and A-6 does not reach it. So two source-identical refinements whose
payloads differ only in field order take two addresses (`C5`/`C6`/`C7` via `encSchema_inj`).

The source-side receipt that makes this a real fault rather than a lab curiosity: a check's
serializable identity is `{ id, payload }` with `payload: Schema.Json`
(SOURCE: `SchemaRepresentation.ts:36-38`, census §2b) — a JSON object, whose key order is a
host incidental. That is verbatim the Q11 rationale for minting `canonV` in the first place
(STORE-MODEL §7 Q11 record, `:234-241`: host incidentals rejected "per the closure-identity
precedent").

---

## 2. Re-partitioning the ten families

### 2.1 The axis

The question "can `canonS` absorb this?" has a single governing answer in the corpus, and it
is KICKOFF §4.3 (`docs/entity-store/KICKOFF.md:195-198`):

> **the declared equivalence is compositional over the schema algebra** — each constructor
> contributes its clause, the menu is exactly the constructor menu, and widening it means
> adding a constructor, which is a new scheme version, never an amendment.

and the first of its two honest notes (`:211-213`):

> where the pinned library's observable semantics make an order significant (unions, if
> first-match holds), E2's equivalence must NOT quotient it away — being coarser than the
> subject's semantics is #3509's shape again, one level up.

Those two sentences partition the ten families exactly. A family is either **cross-constructor**
(absorbing it widens ≈ past the per-constructor menu — a scheme-version act by §4.3's own
words) or **intra-constructor and semantic** (absorbing it makes ≈ coarser than the subject —
forbidden). Nothing lands in a third bucket where absorption is free.

### 2.2 The table

`src?` asks whether the two spellings correspond to **one** Effect source construct — the
yardstick admission rule 2 actually names. `≈-effect` states what absorbing the family would
do to the declared equivalence.

| # | Spelling A ≡ B | Receipt | src? | Class | ≈-effect of absorbing |
|---|---|---|---|---|---|
| SP-1 | `.union m [X]` ≡ `X` | `sp1_same`/`sp1_bytes` | **two** — Effect's `Union` node with one member is a distinct AST node (SOURCE `SchemaAST.ts:2913-2917`) | cross-constructor | widens ≈; makes the lab blind to a node Effect constructs |
| SP-2 | `anyOf ms` ≡ `oneOf ms` | `sp2_same`/`sp2_bytes` | one node, **two modes** | intra-constructor, **semantic** | **FORBIDDEN** — `mode` is decode semantics (SOURCE `SchemaAST.ts:3071-3079`); G6/Q12 |
| SP-3 | `.union m [X,X]` ≡ `.union m [X]` | `sp3_same`/`sp3_bytes` | UNVERIFIED whether Effect normalizes a duplicate member | mixed | safe-ish under `anyOf`; **FORBIDDEN under `oneOf`** — see §2.3 |
| SP-4 | `[X,Y]` ≡ `[Y,X]` | `sp4_same`/`sp4_bytes` | one node, **two orders** | intra-constructor, **semantic** | **FORBIDDEN** — first-match decode, order-sensitive even under concurrency (SOURCE census §5a, `SchemaAST.ts:2845,2965`) |
| SP-5 | `refine (refine S c₁) c₂` ≡ swapped | `sp5_same`/`sp5_bytes` | one Effect node carrying a check **array** | intra-construct, **semantic** | **FORBIDDEN** — annotations resolve off the **last** check (SOURCE `internal/schema/annotations.ts:6-8`) |
| SP-6 | `.mu d X` ≡ `X`, `X` binder-free | `sp6_same`/`sp6_bytes_vs_body` | **one** — a non-recursive `Suspend` is transparent in Effect's own lowering (SOURCE `toJsonSchemaDocument.ts:329-330`) | cross-constructor | widens ≈; **no source distinction lost** |
| SP-6′ | `.mu d₁ X` ≡ `.mu d₂ X` | `sp6_bytes_family` | **one** — `Suspend` has no identity field at all (SOURCE `SchemaAST.ts:3144-3160`, census §1: "No identity field") | cross-discriminator, **unbounded** | widens ≈; collides with G3 only for *binder-using* bodies (§5.2) |
| SP-7 | `.tupleRest .nil R` ≡ `.array R` | `A1_…` (generic), `sp7_*` | **one** — Effect's `Arrays` is a single node with `elements` **and** `rest` (SOURCE `SchemaAST.ts:1683-1688`) | cross-constructor, **infinite** | widens ≈; pure lab artefact |
| SP-8 | `.tupleRest ES Never` ≡ `.tuple ES` | `B3_…` (generic), `sp8_*` | same node; `rest = [never]` is a legal-but-odd source spelling — **UNVERIFIED** whether Effect normalizes it | cross-constructor | widens ≈ |
| SP-9 | `.record Never` ≡ `.object .nil` | `D2_…`, `sp9_*` | **one** node (`Objects` carries both `propertySignatures` and `indexSignatures` — SOURCE `SchemaAST.ts:2099-2100`) | cross-constructor | widens ≈ |
| SP-10 | `.array Never` ≡ `.tuple .nil` | `B4_…`, `sp10_*` | **two** — `never[]` and `[]` are distinct legal source types | cross-constructor | widens ≈; **loses a source distinction** |

Answer to the brief's sub-question (a), stated plainly: **`canonS` can absorb none of the ten
without changing ≈.** Eight can be absorbed *coherently* if the operator is willing to widen ≈
deliberately (SP-1, SP-3-under-anyOf, SP-6, SP-6′, SP-7, SP-8, SP-9, SP-10). Three must never
be absorbed (SP-2, SP-4, SP-5), plus SP-3-under-oneOf. The word §4.3 attaches to a deliberate
widening is "a new scheme version, never an amendment".

### 2.3 SP-3 under `oneOf` — a Q12 instance nobody recorded

Refuter 3 flagged SP-2 and SP-4 as Q12-shaped. SP-3 is too, and harder.

Under `oneOf`, a second successful member match is a decode **failure** (SOURCE:
`SchemaAST.ts:3071-3073`, quoted in census §5a — `s.successes.push(candidate); return
Exit.fail(new SchemaIssue.OneOf(...))`). So `oneOf [X, X]` **fails to decode every value that
matches `X`**, while `oneOf [X]` decodes it. `Conforms` calls them identical (`sp3_same`, whose
proof is mode-agnostic — `Conforms.union_mem` at `E2/Model.lean:230-231` never inspects
`mode`). The two schemas are therefore not merely two spellings; at the decoder they are
nearly opposites.

This is F-36's mechanism reappearing at a spelling the wave did not test. **DERIVED** — the
census receipt is direct, but no probe exists pairing it to SP-3. A one-line addition to a
future `p4_q12`-shaped probe would pin it.

Consequence for the design space: any clause that dedups union members must be `mode`-gated,
and a `canonS` that dedups unconditionally would silently convert a schema Effect's decoder
rejects into one it accepts. That is L-3509 (`.staging/explore/hash-db-anatomy.md:423-455`),
manufactured by our own canonicalizer.

### 2.4 The families the ten do not contain

Four more, all in the corpus already:

1. **Refine-chain vs check-group.** `.refine (.refine s c₁) c₂` and `.refine s (.filterGroup
   [c₁, c₂])` are "two spellings of the same Effect node with two addresses (`p04`, `≠` →
   `true`). **L-2787.**" — scout A, `A-expressibility.md` §8, mapping wave, 2026-08-25. The
   root cause is an **arity mismatch**: Effect attaches a non-empty *array* of checks to one
   node (SOURCE `SchemaAST.ts:612`, `Checks` non-empty array), the carrier attaches one check
   per `.refine` (`E2/Core.lean:88`). This family was recorded, ruled on nowhere, and is
   absent from F-34's ten.
2. **Mutual-recursion entry point.** `mutualFromA` and `mutualFromB` are one group and two
   addresses (`p05`, scout A §6). Effect's answer is one flat `references` table covering both
   roots (SOURCE census §6). Deferred under R-3 because `.ref` carries no component index
   (KICKOFF §18 riders, `:1039-1041`). This is #2787's own shape
   (`hash-db-anatomy.md:423-455`) and the estate's straw already priced it:
   "an SCC has no intrinsic member order, so the straw owes a total, tie-free canonical
   order… Nested `mu` does not pay that bill; it picks an entry point instead" (§8.1 at
   `:920-940`, and scout A §6).
3. **F-29's check payload** — §1.5. A per-`Check` axis orthogonal to all ten.
4. **The `Never` families generalise. DERIVED, unproved.** SP-8, SP-9 and SP-10 are stated
   with `Never = .union .anyOf .nil`, but the proofs turn only on *uninhabitedness*:
   `all_never_nil` (`R3-p3_spellings.lean:34-37`) derives `vs = .nil` from
   `ConformsAll env never vs` using only `never_empty`. The same derivation goes through for
   any `U` with `¬ Conforms env U v` for all `v` — e.g. `.tuple (.cons Never .nil)`,
   `.object (.cons k Never false .nil)`, `.refine Never c`. So `.tupleRest ES U ≡ .tuple ES`
   for **every uninhabited `U`**, and likewise for `.record U` and `.array U`.

   **This is the load-bearing caveat for options (a) and (b) alike.** Uninhabitedness is a
   semantic property; any *syntactic* clause (whether a `canonS` rewrite or a boundary
   predicate) catches only the spellings it enumerates. Enumerating `.union _ .nil` catches
   the proved instances and misses the rest. A complete rule would need a decision procedure
   for emptiness over the carrier — plausible for this algebra given `guardedB`, but nobody
   has stated it, and it is strictly more work than everything else in this report.

   Settling probe: extend `R3-p3_spellings.lean` with a `Uninhabited` predicate and re-prove
   `sp8`/`sp9`/`sp10` generically over it.

### 2.5 What that means for F-34's disposition

F-34 says the rule "names 2 constructs; there are ≥10". The consolidation says the honest
count is **≥14 axes, one infinite (SP-7), one unbounded (SP-6′), and one unbounded in a way no
finite syntactic clause reaches (§2.4 item 4)**. The "≥" in F-34 is doing more work than it
looks like it is, and any repair that presents itself as an enumeration should say so.

---

## 3. What the estate has already written about this exact shape

Consolidated here so no option is argued from scratch.

**On canonicalization vs erasure vs rejection.**
- `hash-db-anatomy.md:950` — on alpha-invariance: *"building it inside the encoder (Unison's
  way) is cheaper and more defensible than building it as a normalization pass."* The estate
  has already reached a conclusion on normalization passes, in this exact problem domain.
- `hash-db-anatomy.md:95` — *"Everything you exclude is a normalization you must then
  defend."* The dual: every absorbed family becomes a standing obligation.
- `hash-db-anatomy.md:423-455` — the L-2787/L-3509 taxonomy. Every family in §2 is an L-2787
  (encoder admits information the class does not contain); every forbidden absorption in §2
  would manufacture an L-3509 (identity coarser than the subject).

**On multiple spellings as a language-design failure.**
- `syntax-grammar-design.md:140` — Concrete's LL(1) review constraint list, verbatim:
  *"does not add multiple competing syntaxes for the same construct"*, stated **before** any
  candidate change is considered.
- `syntax-grammar-design.md:157-159` — Concrete's written non-goals include *"multiple
  equivalent syntaxes for enum construction or matching"*, and the estate's own commentary:
  *"A list of things you have decided not to do is one of the most valuable documents a
  language project can have. It is also the one nobody writes."* MAPPING's admission rules
  are that list, and F-34 is the report that it was never written properly.
- `syntax-grammar-design.md:1617` — the checklist item: *"Content-addressed core ⇒ no `paren`
  node, no redundant encodings"*, and `:1643` — *"For a content-addressed spine, canonical."*
- `syntax-grammar-design.md:73` — *"You are building a content-addressed core, which means
  your AST's identity is a hash, which means canonicality is not optional."*
- `language-design-case-studies.md:193` — Elm shipped *"removes redundant syntax to improve
  the 'code texture'"* as a release feature: **deletion of spellings, not normalization of
  them.** That is option (c), with a precedent.

**On what the redundancy costs downstream.**
- `syntax-grammar-design.md:1187` — the `paren`-node analysis, whose closing sentence is the
  shape of every family in §2: hand-build a tree the parser never produces and the printer's
  roundtrip guarantee evaporates. Transposed: hand-build `.tupleRest .nil e` and the
  admission story evaporates.
- `syntax-grammar-design.md` §5.1 — the theorem spectrum. **T3 printer injectivity** is named
  there as *"what says your rendering does not conflate two programs — a property a
  content-addressed system cares about directly."* The spelling families are T3's dual:
  the carrier conflates nothing, but *the source* is conflated onto many carriers.

**On binder identity specifically.**
- `language-design-case-studies.md:261-263` — Unison's ABT `Eq` **is** alpha equivalence, and
  the estate's own gloss: *"which is exactly why names cannot be part of identity."*
- `language-design-case-studies.md:251` — Unison hashes mutually-recursive definitions as one
  cycle using De Bruijn indices, *"canonically sorted so the result is order-independent."*
- `A-expressibility.md` §6 — the carrier *"has the de Bruijn half and not the erasure half"*,
  and the pointed question: *"whether the price was quoted against this consequence."*
  SP-6′ is that consequence, now with a byte receipt.
- KICKOFF §18 G3 (`:1032`) is the counterweight: *"Discriminator stays in identity (D1's
  priced carve-out). Alpha-invariance of recursive schemas is a non-goal v1."*

**On the model/boundary asymmetry** (this is the pattern every option must be scored against).
The estate has now hit it four times: F-3 (spec demanded `canonV`, scaffold did not
implement), F-12/A-3 (model accepted duplicate keys the boundary was assumed to reject),
F-21→F-40/F-41 (the boundary's assumed coverage was false), F-35 (`.lit (.vaddr a)`, where
refuter 3 wrote **CLAUSE OWED** in as many words). Each time the resolution was the same:
*the model acquires the clause.* Refuter 2's framing of the same problem
(`R2-boundary.md` §2.5): the recogniser for "well-formed stored object" is *"spread across
`stripPre`, `decodeSchema`, the canonicity byte-compare, and `scanObject`, with no single
predicate naming the accepted language. `WFS` is that predicate, it exists, it is decidable,
and the boundary does not call it."*

**Literature the catalog licenses but this host cannot supply.** `.reference/catalog/PAPERS.md:66-87`
names an eleven-paper cluster, "Canonical hashing, alpha-equivalence, and graph canonization",
whose CLUSTER ROLE text licenses exactly: *"how to hash terms modulo binding, how to canonize
cyclic and shared structure, and what the known algorithms cost"*, and forbids: *"any claim
that a published scheme is sound as stated for this estate's term algebra; each carries its own
equivalence relation and must be restated before it binds."*

The PDFs are **not on this host** — `.reference/papers/` holds only its README, which states
the corpus is gitignored and per-host (`.reference/papers/README.md:3-9`). Therefore, named
**ACQUISITION-GAP**, with what each would bear on:

| Paper (as catalogued) | Would bear on |
|---|---|
| Hashing Modulo Alpha-Equivalence (arXiv:2105.02856v1) | SP-6/SP-6′ — the cost of a binder-erasing hash, i.e. whether G3's carve-out is priced correctly |
| Hashing Modulo Context-Sensitive Alpha-Equivalence (arXiv:2401.02948v3) | the same, under the `mu`-body context the carrier actually has |
| A Simple Formalization of Alpha-Equivalence (arXiv:2507.10181v2) | the Lean statement shape for a binder-invariant `≈`, if the operator ever revisits G3 |
| Maximal Sharing in the Lambda Calculus with letrec (arXiv:1401.1460v5) | option (a): what a normalization-to-maximal-sharing pass costs, and whether it terminates |
| Implementing and reasoning about hash-consed data structures in Coq (arXiv:1311.2959v4) | option (a) mechanized: the proof burden of a normalizing constructor layer |
| Directed Graph Hashing (arXiv:2002.06653v3); Scott (doi:10.1007/978-3-030-36687-2_48); SCOTT correctness/complexity | §2.4 item 2 — the mutual-recursion entry-point family and the tie-free order the straw owes |
| Slotted E-Graphs (doi:10.1145/3729326); Lifting E-Graphs (arXiv:2606.22734v1) | deciding the collapse relation itself, rather than enumerating clauses |
| Efficient Coalgebraic Partition Refinement (doi:10.4230/LIPIcs.CONCUR.2017.28) | §2.4 item 4 — whether "same denotation" is decidable over this carrier |

Nothing below leans on any of them.

---

## 4. Option (a) — fold normalization into `canonS`

### 4.1 The mechanism

`canonS` gains cross-constructor rewrite equations. E.g.
`| .tupleRest .nil e => canonS (.array e)`,
`| .record cod => if cod is Never then .object .nil else …`,
`| .mu d b => if usesBinderB 0 b then .mu d (canonS b) else canonS b`.

It stays structurally recursive (`termination_by structural x => x` survives — every subcall
is on a proper subterm), so no termination work is added.

### 4.2 Coverage

Eight of ten: SP-1, SP-3 (**anyOf only**), SP-6, SP-6′, SP-7, SP-8, SP-9, SP-10. Plus F-29
(§7). Plus §2.4 item 1 (refine-chain → `filterGroup`) if the carrier keeps its current shape.
**Not** SP-2, SP-4, SP-5 (forbidden). **Not** §2.4 item 4's semantic generalisation, except
for the spellings explicitly enumerated. **Not** F-40/F-41 — a different mechanism (§1.4).

Two positive side effects worth naming:

- **It repairs F-41 for the families it absorbs.** `preimageS` fails to be idempotent as a
  byte function on duplicate-key input; on the *spelling* families it is currently idempotent
  by accident (both spellings are `canonS` fixed points), and after absorption there is one
  fixed point per class. Q5 canonical-image strictness gets *stronger*.
- **It is the only option that makes the address itself the canonical form**, which is what
  `syntax-grammar-design.md:1617` and `:1643` say a content-addressed spine wants.

### 4.3 What it does to the theorem base

This is where option (a) is expensive, and the cost is concentrated in one place.

**B4 changes character.** `ObligationCanonRespectsConforms` (`E2/Bridge.lean:75-81`) is today a
one-way implication over a **constructor-preserving** `canonS`:
`Conforms env s v → Conforms env (canonS s) (canonV v)`. Every case is congruence. After
absorption, the rewritten cases are no longer congruence; each needs its SP theorem.

Good news, and it is real: **the generic versions of the three A-4 families already exist.**
`A1_array_eq_tupleRest_nil` is stated "for every `e`"; `B3_tuple_eq_tupleRest_never` "for every
`es`"; `D2_record_never_eq_object_nil` has no parameter. SP-1/SP-3/SP-10 are proved only at
instances (`X = .prim .str`) in `R3-p3_spellings.lean` and would need generic restatements —
mechanical, the proofs are three to eight lines each.

**SP-6/SP-6′ need one new generic lemma, and it is cheap. DERIVED, with the argument:**
`substS k u (.var i) = if i = k then u else .var i` (`E2/Model.lean:180`) — no shifting — and
`.mu d b` recurses at `k+1` (`:181`). So if `.var k` never occurs at binding-depth `k` in `b`,
then `substS 0 u b = b` for every `u`, hence `unfoldMu d b = b` (`:197-198`), hence
`Conforms env (.mu d b) v ↔ Conforms env b v` by one `cases` in each direction — the exact
shape of `sp6_same`, generalised. This is the whole of SP-6 and SP-6′ at once: absorb
binder-free `mu` and the unbounded family collapses to a single address.

**The `WFS` bridges survive the `mu` absorption.** B1 (`ObligationCanonPreservesClosed`):
`closedB 0 (.mu d b) = closedB 1 b`, and binder-free plus `closedB 1 b` gives `closedB 0 b`,
so rewriting to `b` preserves closedness. B2 (guarded): `guardSpineB 0 b` is vacuous on a
binder-free body and `guardedB b` is already a conjunct (`:144`). B3 (dupFree): `dupFreeS
(.mu _ b) = dupFreeS b` (`E2/Canon.lean:121`). **DERIVED** — none of these three is proved,
but each is a one-liner.

**The obligation that does not exist yet.** R1's Q-R1-3 named it: a normalizing `canonS`
wants `Conforms env (canonS s) v ↔ Conforms env s v` — the **biconditional**, not B4's
implication, and not conditioned on `canonV` of the value. That is a new pinned statement, and
it is the one that must be re-proved every time a rewrite equation is added. It is also the
statement that would let M17's repair route (iii) — *"`Conforms` is redefined to be the
judgment on canonical forms only"*, R1's own recommendation — actually work.

**Blast radius, measured.** Each carrier constructor is mentioned ~17–23 times across
`formal/entity-store/E2/*.lean` (measured: `tuple` 21, `array` 22, `record` 23, `tupleRest`
23, `mu` 18, `union` 17, `refine` 17). Option (a) touches `canonS`'s equations only (13
lines), but every lemma family that inducts over `canonS` — `E2/Closure.lean`'s
`mem_refsS_canon` and kin, 17 theorems — must be re-checked case-by-case, because the
induction hypothesis no longer lines up constructor-for-constructor.

### 4.4 The hazard that F-40/F-41 already demonstrated

`canonS` is currently a *sorting* pass and it is already not a function of its intended
equivalence class on inputs the admission rule was supposed to exclude (§1.4). Every new
rewrite equation is a new opportunity for the same failure: a rewrite whose fixed points are
not what the designer expected. F-12 was found by a scout probe, not by inspection; F-40 was
found by a Python re-implementation of the wire format and forty hand-crafted pre-images.

The mitigation is stateable: an added obligation
`∀ s, canonS (canonS s) = canonS s` **unconditionally** for the rewriting fragment, plus a
sweep. The estate has the sweep idiom already — A-6's repair was "verified over 15,310
schemas", B4's clauses "true over 61,494 schemas" (`R1-canon-bridges.md` §8). So the guard
exists; it is not free.

### 4.5 Address stability

Every absorbed family moves at most one of its two spellings. **The normal form is a free
choice, and it should be made to minimise movement:** choose `.array e` (not `.tupleRest .nil
e`), `.tuple es` (not `.tupleRest es Never`), `.object .nil` (not `.record Never`),
`.tuple .nil` (not `.array Never`), `X` (not `.mu d X`). With those choices, **every address
that existed before A-4 landed is unchanged**, and only schemas spelled in the A-4
constructors or with a vacuous `mu` move.

The estate's own precedent for pricing this: Q13/A-6, where the operator ruled that "the
address change to lit-bearing schemas is free pre-push" (STORE-MODEL §7, `:288-290`). The
same window is open: `versionByte` is still `0x01` (`E2/Obligations.lean:15`), R-2 has not
frozen the constructor set, and the pre-push hook means nothing has left the host
(audit day-one §6.2).

---

## 5. Option (b) — a decidable canonical-spelling predicate

### 5.1 The mechanism

A new `canonicalSpellingB : SchemaCore → Bool`, one clause per family, in the same idiom as
`dupFreeS`/`closedB`/`guardedB` — mutual, structural, `Bool`-valued, gate-clean. Two places it
can live, and the choice is the whole ruling:

- **Boundary only** — `Shell/Boundary.lean`'s `admit` gains a check (`:125-138`). Zero model
  change. **This re-opens the model-accepts/boundary-rejects gap for the fifth time** (§3).
- **`WFS` conjunct** — `E2/Model.lean:163-164` gains a fourth conjunct, exactly as A-3 added
  `dupFreeS`; the boundary then calls `WFS`, which the family-2 repair already requires it to
  do (`2026-08-25-wave2-triage.md:79-81`).

The second is the A-3 shape, and A-3's own cost record is the estimate: *"every seat proof
rebuilds green over the strengthened `Reachable`"* (STORE-MODEL §7, `:257-260`). Strengthening
`WFS` strengthens a **hypothesis**: every theorem that *takes* `WFS` stays true with no proof
change; every theorem quantified over `Reachable` stays true because `Reachable` shrinks. Only
theorems that **construct** a `Reachable` witness break — and there is a known one:
`sp11_reachable` (`R3-p3_spellings.lean:243-245`), which is a refutation exhibit, not an asset.

### 5.2 The clause list, including the finite clause for the unbounded family

Enumerated against §2.2, with the "reject" side chosen to preserve pre-A-4 addresses:

| Clause | Kills |
|---|---|
| `.tupleRest es _` requires `es ≠ .nil` | SP-7 (the infinite family) |
| `.tupleRest _ rest` requires `rest ≠ Never` | SP-8 |
| `.record cod` requires `cod ≠ Never` | SP-9 |
| `.array e` requires `e ≠ Never` | SP-10 |
| `.union _ ms` requires `ms.length ≠ 1` | SP-1 |
| `.union .anyOf ms` requires `ms` duplicate-free (mode-gated per §2.3) | SP-3 (anyOf) |
| `.mu d b` requires `usesBinderB 0 b = true` | **SP-6 and the whole unbounded SP-6′ family** |
| (`Never` itself spelled `.union .anyOf .nil`, `oneOf`-nil rejected) | MAPPING row 12, already ruled |

**How the unbounded family gets a finite clause.** This is the brief's sharpest sub-question
and it has a clean answer. The family `{ .mu d X : d ∈ String }` is unbounded in `d`, but the
*condition that makes it a family* is a property of `X` alone: `X` does not reference the
binder. One decidable predicate on the body kills every member at once.

`usesBinderB : Nat → SchemaCore → Bool` mirrors `closedB`'s recursion skeleton exactly
(`E2/Model.lean:85-110`) with one changed leaf: `| .var i => decide (i = k)` instead of
`decide (i < k)`, `or`-combining instead of `and`-combining, and `| .mu _ b => usesBinderB
(k+1) b`. About twenty lines, mutual over `SchemaCore`/`FieldList`/`SchemaList`, structural,
no new axioms. **DERIVED** — not written, but the skeleton is copy-shaped from an existing
definition, and `guardSpineB` (`:118-124`) already carries the depth-indexed `.var` comparison
this needs (`| .var j => decide (j ≠ i)`), differing only in stopping at value-consuming
constructors.

Note what the clause does **not** do, and this matters for G3: `.mu d₁ b` and `.mu d₂ b` for a
**binder-using** `b` remain two addresses. That is G3's ratified carve-out (KICKOFF §18,
`:1032`), untouched. The clause removes exactly the case where the discriminator is
identifying nothing — which is why refuter 3 called it "zero cost". Whether the *residual*
family (binder-using bodies under different discriminators) is also denotation-collapsing is
**UNPROVED**: `Conforms.mu` never inspects `d` (`E2/Model.lean:235`), which suggests it is,
but `unfoldMu` reinstates `d` in the substituted term, so the two unfoldings differ
syntactically and no `cases`-level proof closes it. Settling probe: state
`Conforms env (.mu d₁ b) v ↔ Conforms env (.mu d₂ b) v` and attempt it; if it holds, G3's
carve-out prices an unbounded family, not a bounded one, and the operator should know that.

### 5.3 What it costs and what it cannot do

**Spec change:** MAPPING admission rule 2 is rewritten from a sentence into a clause table;
STORE-MODEL §5 gains the `WFS` clause; STORE-SHELL §5 gains the check. All additive prose.

**Proof rework:** near zero, for the reason in §5.1. The additive-vs-arity law
(audit day-one §6.4) classifies this as additive: no constructor arity changes, no name a seat
imports changes.

**Address stability:** **perfect.** No address moves. Rejected schemas were never storable in
a compliant store to begin with; existing objects spelled the rejected way become
retro-inadmissible, which for a store that has never left the host is a null set.

**What it cannot do:**
1. It cannot make the fault structurally impossible. The carrier still *offers* the redundant
   spelling; a future function that constructs carriers directly (the Stage-2 generator, a
   proof-side witness, `Reachable.putS` in a lemma) can still build one. Option (c) is the only
   one that removes the possibility.
2. It cannot reach §2.4 item 4's semantic generalisation, for the same reason (a) cannot: it
   enumerates spellings.
3. Its **completeness is not provable today**, and this deserves to be said out loud. A
   spelling rule is complete when the admissible set has exactly one representative per source
   construct. The estate has no formal source-side equivalence — refuter 3's point that
   `Conforms` is the wrong yardstick cuts here too — and the source side is TypeScript. So the
   clause table can be *enumerated and audited against the census*, never proved exhaustive.
   That is a permanent property of options (a) and (b) alike, and the honest register for it
   is an unchecked-claim marker (audit §6.3).

---

## 6. Option (c) — carrier narrowing by amendment

### 6.1 What A-4's history actually says about cost

A-4 is the estate's only carrier amendment and its record is unusually complete.

- **Ruled** under G4 (KICKOFF §18, `:1033`) on the strength of scout receipts that the
  workarounds were wrong *at the value plane* — `flat_rejected`, `object_exact_width` — with
  the operator's stated reason: "value shapes cannot be patched later".
- **Scoped as a serialization point.** The dispatch brief
  (`dispatch/2026-08-25-worktree-4-amendment-a4.md:3-7`) calls it "the SERIALIZATION-POINT
  amendment… the one worktree allowed to" touch E2 core modules, "because nothing else in
  `formal/` is in flight."
- **Method: let the compiler enumerate the work.** "Add the constructors to `E2/Core.lean`,
  then let the build errors be the todo list: every exhaustive match in
  Core/Encode/Decode/Canon/Model — AND the seat-delivered lemma families in `E2/Closure.lean`"
  (`:36-39`).
- **Delivered in one seat-day**, first-pass, zero rework rounds (audit day-one §7).
- **Price paid:** tags `0x3B`/`0x3C` (additive — "old encodings decode unchanged",
  `:22-23`); `tags_distinct` extended to 13 variants; **"every pre-existing statement
  byte-identical except the ordered `tags_distinct` extension"** (STORE-MODEL §7, `:270-273`).
- **And the fault it created**, discovered two days later: F-27. The dispatch brief pinned
  `canonS` for the new constructors ("recurse only; no sorting") and pinned `Conforms`, and
  nobody asked the dual question. R1's verdict is exact: *"A-4 re-opened the same class and
  the single-spelling rule was not re-applied, because A-4 was argued at the value plane…
  and nobody asked the dual question."*

**The generalisable lesson, which is prior estate writing:** a carrier amendment ruled on
expressibility grounds is cheap *when additive*, and its real cost is the admission-rule debt
it silently incurs. A-4 cost one seat-day of implementation and produced an infinite spelling
family that is still open.

### 6.2 Why (c) is strictly more expensive than A-4 was

A-4 was **additive**. Option (c) is **removal or merge**, which the additive-vs-arity law
(ratified, audit day-one §6.4) puts on the other side of the line: *"arity or name changes to
anything a seat imports are serialization points."*

Concretely, versus A-4's price list:
- Pre-existing statements are **not** byte-identical: every statement mentioning a removed or
  re-arity'd constructor changes. `tags_distinct` shrinks (13 → 11 for the Arrays+Objects
  merge), which is a genuine statement change, not an extension.
- Tags are **not** additive: old encodings do **not** decode unchanged. That is a
  `versionByte` question (`E2/Obligations.lean:15`, still `0x01`) and therefore a scheme
  version — which §4.3 already says is the right register for widening ≈ anyway.
- Every address of every array-shaped or object-shaped schema moves. That is the whole store,
  not a family.
- ~20 mention sites per affected constructor across E2 (measured, §4.3), the same compiler-
  driven todo list A-4 used, but with statements in it.

The window for paying this is named and still open: **R-2, the constructor freeze**, which
"now explicitly waits on A-4" (KICKOFF §18 riders, `:1039`). After R-2 the price is a scheme
version; before it, it is one serialization point.

### 6.3 What merging actually kills — less than it appears. DERIVED.

This is the finding that most changes how option (c) should be scored.

The natural (c) move is to mirror the source: Effect has **one** `Arrays` node with
`elements` and `rest` (SOURCE `SchemaAST.ts:1685-1688`) and **one** `Objects` node with
`propertySignatures` and `indexSignatures` (SOURCE `:2099-2100`). The lab has three
constructors for the first and two for the second. So merge:
`.arrays (elems : SchemaList) (rest : Option SchemaCore)` and
`.objects (fields : FieldList) (index : Option SchemaCore)`.

Work it through:

| Family | Under the merge | Killed? |
|---|---|---|
| SP-7 `.tupleRest .nil R` vs `.array R` | both become `.arrays .nil (some R)` | **YES** — and this is F-27's infinite family, structurally dissolved |
| SP-8 `.tupleRest ES Never` vs `.tuple ES` | `.arrays ES (some Never)` vs `.arrays ES none` | **NO** — still two |
| SP-9 `.record Never` vs `.object .nil` | `.objects .nil (some Never)` vs `.objects .nil none` | **NO** — still two |
| SP-10 `.array Never` vs `.tuple .nil` | `.arrays .nil (some Never)` vs `.arrays .nil none` | **NO** — still two |
| SP-1/3/6/6′ | untouched | NO |

**The merge kills exactly the families caused by having two constructors for one source node.
It does not touch the families caused by an uninhabited schema in a position** — those are
SP-8, SP-9, SP-10 and they still need a rule (`rest`/`index` may not be uninhabited), which
under the merge is naturally spelled as a normalization (`some Never ↦ none`) or a clause.

**Two independent gains the merge does buy**, both worth recording because neither is about
spellings:
1. **It closes an expressibility gap MAPPING has no row for.** Effect's `Objects` can carry
   property signatures **and** index signatures simultaneously; MAPPING row 16 maps the first
   to `.object` and row 18 the second to `.record` (`MAPPING.md:39,41`), with no row for both.
   The current carrier cannot express `{ a: string, [k: string]: number }` at all. **DERIVED**
   from the census field list plus the MAPPING table; no probe exists.
2. **A third merge is available on the same argument**: Effect attaches a check **array** to
   one node (`SchemaAST.ts:612`), so `.refine (s) (checks : CheckList)` would dissolve
   §2.4 item 1's refine-chain-vs-filterGroup family. It would **not** dissolve SP-5 (check
   order), which must survive — annotations resolve off the last check
   (SOURCE `internal/schema/annotations.ts:6-8`).

### 6.4 Coverage summary for (c)

SP-7 structurally (plus §2.4 item 1 with the checks merge). Everything else still needs (a)
or (b). Option (c) is therefore **not an alternative to (a)/(b) — it is a way of making one
family unspellable**, at the price of a non-additive amendment, and it must be paired with
one of the others.

---

## 7. Where F-29 rides along

| Option | Does F-29 ride? | How |
|---|---|---|
| (a) `canonS` | **YES** | the `refine` equation becomes `.refine (canonS s) (canonC c)`, where `canonC` applies `canonV` to `Check.filter`'s payload and recurses through `CheckList`. This is R1 disposition row f, "Q13's scope extended to `Check` payloads", and it is the natural completion of Q13/A-6: one carrier, one canonical form. |
| (b) predicate | **YES, differently** | A clause "every `Check.filter` payload is `canonV`-fixed" — decidable, `litsCanonicalB`-shaped (`E2/Bridge.lean:29-30` is the exact idiom: `canonV v == v`). Rejects rather than rewrites. |
| (c) carrier | no | orthogonal |

**The asymmetry between (a) and (b) here is sharp and is the best single illustration of the
whole report.**

Under (b), rejecting a non-canonical payload assumes nothing about what checks *mean*. Under
(a), rewriting the payload **changes the check's identity**, and `checkSem` is a parameter of
`ConformsEnv` (`E2/Model.lean:210-212`) that reads it. So (a) silently requires a new
invariance:

> `∀ c v, env.checkSem c v ↔ env.checkSem (canonC c) v`

This is **strictly stronger than F-24's** and distinct from it. F-24 (recorded at
`E2/Bridge.lean:13-14`, and carried into B4's hypothesis at `:77`) requires invariance under
`canonV` of the check's **argument**. The new one requires invariance under canonicalization of
the check's **own payload**. Nothing in the corpus states it, and it would become an R-4
allowlist admission criterion — every admitted check id must be proved or asserted
payload-canonicalization-invariant before it can be minted.

Given F-29 is already routed to the R-4 session (`FINDINGS.md` row F-29, "OPEN — R-4 session
input") and G7 deferred the allowlist's *shape* entirely (KICKOFF §18, `:1036`), the honest
statement is: **(a)'s version of the F-29 repair cannot be costed until R-4 has a shape.**
(b)'s version can be costed today and costs one clause.

---

## 8. Cost table

Costed against the three axes the brief names. "Migration event" = an address changes, i.e.
anything already stored under the old address is orphaned.

| | **(a) fold into `canonS`** | **(b) decidable predicate** | **(c) carrier narrowing** |
|---|---|---|---|
| **Families covered** | 8 of 10 + F-29 + §2.4 item 1 | 7 of 10 + F-29 (as a clause) | SP-7 only (+ item 1 with the checks merge) |
| **Families it must not touch** | SP-2, SP-4, SP-5, SP-3/oneOf | same | n/a |
| **Reaches §2.4 item 4 (uninhabited generalisation)** | no | no | no |
| **Spec change** | KICKOFF §4.3's equivalence table gains cross-constructor rows; `versionByte` question; MAPPING rule 2 rewritten | MAPPING rule 2 → clause table; STORE-MODEL §5 `WFS` clause; STORE-SHELL §5 check | STORE-MODEL §5 carrier; MAPPING rows 2/3/4 and 16/18 collapse; R-2 scope |
| **Proof rework** | **high.** B4 stops being congruence; a new biconditional obligation must be pinned and re-proved per equation; `E2/Closure.lean`'s 17 induction lemmas re-checked; a new unconditional-idempotence guard + sweep (§4.4) | **near zero.** Hypothesis strengthening only (A-3's precedent). Breaks only `Reachable`-constructing exhibits, of which the one known is a refutation witness | **high and different.** Statements change, not just proofs. `tags_distinct` shrinks. Compiler-driven todo list ≈ A-4's, with statements in it |
| **New definitions owed** | `usesBinderB` (~20 lines); `canonC`; generic restatements of SP-1/3/10 | `canonicalSpellingB` (~40 lines); `usesBinderB` (~20 lines) | two merged constructors + their thirteen-way match arms ×~20 sites each |
| **Address stability** | **movement, bounded and choosable.** With the §4.5 normal-form choices, only A-4-spelled and vacuous-`mu` schemas move. Free pre-push by Q13's precedent | **perfect.** No address moves | **total.** Every array-shaped and object-shaped address moves; scheme-version register |
| **Migration events** | one per absorbed family, all pre-push | none | one, global |
| **Inherits F-40's hazard shape** (§1.4) | **yes** — more rewriting in the pass that already failed to be a function of its class | no — a predicate has no fixed points to get wrong | no |
| **Makes the fault unspellable** | no (carrier still offers both) | no | **yes, for SP-7** |
| **Register per KICKOFF §4.3** | widening ≈ = "a new scheme version, never an amendment" | no change to ≈ | carrier change = amendment (pre-R-2) or scheme version (post) |
| **Precedent in the estate** | R-10, Q11, Q13/A-6 — all **intra**-constructor; none cross-constructor | MAPPING rows 12 and 23 — both single-spelling instances, both discharged this way; A-3 for the `WFS` mechanics | A-4, in the additive direction only |

---

## 9. Ranked analysis

Ranking is by *coherence with what the estate has already ruled*, then by cost. **No
recommendation; the ruling is the operator's.**

**1. (b), landed as a `WFS` conjunct rather than a boundary-only check.**
It is the only option whose register is "amendment" rather than "scheme version". It is the
shape both existing single-spelling rulings already took. It rides on a repair the triage
already ranks as owed for a different reason — family 2's "one boundary amendment: `WFS` as a
named check" (`:79-81`) — so its marginal cost over work already scheduled is a clause table
and one twenty-line predicate. It moves no address. It closes the unbounded `mu` family
completely. Its weaknesses are honest and stateable: it does not make the fault unspellable,
and its completeness is unprovable (§5.3.3).

**2. (a), scoped narrowly to the cases where the source has no counterpart.**
Strongest where the collapsed spelling is a *pure lab artefact* — SP-6/SP-6′ (Effect's
`Suspend` has no identity field at all) and SP-7 (Effect's `Arrays` is one node). Weakest, and
in my reading actively hazardous, where the two spellings correspond to two genuine source
types (SP-10: `never[]` and `[]`), because there the absorption is L-3509 — the identity
becoming coarser than the subject, which §4.3 forbids and which is the defect this whole
program was founded to avoid. Its proof cost is real and concentrated in B4; its normal-form
choice can make its address cost near-zero (§4.5). And it is the only option that carries
F-29 to the "one carrier, one canonical form" conclusion Q13 already reached for `lit`
payloads — at the price of an unstated `checkSem` invariance (§7).

**3. (c), as a *companion* to 1 or 2, timed to R-2.**
It is the only option that makes a family structurally impossible, and the family it kills is
the infinite one. It also closes a real expressibility gap (§6.3 item 1) that has nothing to
do with spellings and that MAPPING currently cannot express at all. But it kills far fewer
families than its framing suggests (§6.3), it is non-additive where A-4 was additive, and its
address cost is total. Its natural window is R-2, which is explicitly waiting.

### The cheapest coherent posture — an observation, not a ruling

Reading the corpus rather than the options, the posture that costs least while contradicting
nothing already ratified looks like this:

**Keep `canonS` constructor-preserving. Put the spelling rule in `WFS`. Reserve carrier
narrowing for the R-2 window, and reserve `canonS` rewriting for the one place the estate has
already ruled the principle — check payloads — if and only if R-4 can carry the invariance.**

The reasons are all in the record, not in this analysis:

- `canonS`'s thirteen equations are constructor-preserving today, all three canonicalization
  rulings are intra-constructor, and both single-spelling rulings are rejections. **The
  partition already exists in the estate's behaviour**; writing it down is free and changes
  nothing.
- The estate's own literature pass reached the same conclusion in the adjacent case:
  *"building it inside the encoder… is cheaper and more defensible than building it as a
  normalization pass"* (`hash-db-anatomy.md:950`).
- Every prior instance of the model/boundary asymmetry (F-3, F-12, F-21/F-40, F-35) was
  resolved by giving the model the clause. Doing that pre-emptively here costs one conjunct
  and avoids a fifth instance.
- The one fault in this lane that a normalization pass *caused* rather than cured is
  F-40/F-41, and it was caused by asking `canonS` to carry an admission rule (§1.4).

The visible cost of that posture, stated so it is not discovered later: it leaves `.array e`
and `.tupleRest .nil e` **both in the carrier** with one of them permanently inadmissible —
i.e. it leaves the trap in the type and puts a sign next to it. That is precisely what
Concrete's non-goals list does (`syntax-grammar-design.md:157-159`) and precisely what Elm
chose *not* to do when it deleted redundant syntax outright (`:193`). The estate has both
precedents and has never chosen between them.

---

## 10. Open questions, and what this pass did not do

**Questions the corpus does not answer** (routed, not asked of the operator by me):

1. Does Effect's `Union` constructor normalize a singleton or a duplicate member? Bears on
   SP-1 and SP-3. **UNVERIFIED** — refuter 3 flagged it, and the place to check is report B's
   catalog against the pinned bytes. Not checkable on this host beyond the census.
2. Does Effect normalize `rest: [never]` on `Arrays`? Bears on SP-8. Same route.
3. Is the residual `mu` family (binder-*using* bodies, differing discriminators) also
   denotation-collapsing? If yes, G3's carve-out prices an unbounded family. Settling probe in
   §5.2.
4. Is SP-3 under `oneOf` an L-3509 rather than a spelling family? Census receipt in §2.3;
   no probe.
5. Is `.tupleRest ES U ≡ .tuple ES` for every uninhabited `U`? If yes (and the derivation in
   §2.4 says it is), no finite syntactic clause is complete, and the completeness claim of any
   spelling rule needs an unchecked-claim marker. Settling probe in §2.4.

**Not done here, deliberately:**
- No file was edited except this one.
- No Lean was run; every "PROVED" citation is to an existing probe and its `.out` axiom
  report, not re-verified by me.
- The R-4 allowlist shape (G7-deferred) is not designed here; §7 only states the invariance it
  would have to carry.
- The mutual-recursion entry-point family (§2.4 item 2) is R-3's, and R-3 stays deferred.
- The eleven-paper canonical-hashing cluster is ACQUISITION-GAP throughout (§3); nothing above
  rests on it, and the catalog's own text forbids transferring any of it without restatement.
