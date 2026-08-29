# R-A — Unison's lessons, re-read from the corpus

**Grade: G0 advisory. Date: 2026-08-25. This report decides nothing; the rulings are the
operator's.** It is a consolidation pass, not a design pass: nothing here is invented, and no
external fact is asserted without a receipt from a document already held in this repository.
Where a source the lane wanted is absent on this host, the line reads **ACQUISITION-GAP**.
Web access was not used. No file was edited except this one.

Operator directive for the lane, verbatim: *"we're trying to learn from the mistakes of unison
not repeat them."*

---

## 0. Sources read, with receipts

| # | Source | What it supplied |
|---|---|---|
| S1 | `docs/entity-store/audit/2026-08-25-wave2-faults.md` | the organizing frame — F-25…F-45 against the theory each violates |
| S2 | `docs/entity-store/audit/2026-08-25-wave2-triage.md` | the severity ranking and the recommended repair order (families 1–3) |
| S3 | `.staging/explore/unison-verification-claims.md` | the claims dossier: C1–C21, P1–P13, D1–D10, T1–T11, §5 coverage reality, §8 live-tracker addendum |
| S4 | `.staging/e1/unison-hashing.md` (717 lines) | the mechanism recipe against clone `84b95a623711b57b9ff7163f124b214d626b81e4`: §2.3 wire format, §3 alpha-invariance, §4 cycles, §5 tags, §6 inside/outside, §9 stability, §10's 22 conformance requirements, §11 open questions |
| S5 | `.staging/explore/hash-db-anatomy.md` (1205 lines) | the three-layer picture, §3.4/§3.5 the two shipped defects placed on it, §7.1–§7.5 the design axes, §8 the straw and §8.7 its owed obligations |
| S6 | `.staging/explore/language-design-case-studies.md` §4 | Unison's own published rationale, the ABT lineage, the pretty-printer as load-bearing |
| S7 | `docs/entity-store/KICKOFF.md` §3 (L1–L7), §4 (§4.1–§4.6), §17, §18 (G1–G8) | the seven laws and where each was paid for; what makes this not Unison; naming as entities |
| S8 | `docs/entity-store/STORE-MODEL.md` §1–§9 | the model, §5 typed reachability, §7 rulings G3/Q11/Q12/Q13, §9 scaffold state |
| S9 | `docs/entity-store/MAPPING.md` | the 30-row disposition table and the three admission rules |
| S10 | `docs/entity-store/STORE-SHELL.md` §1–§8 | the disk layout, the PUT boundary, the differential harness |
| S11 | `docs/entity-store/audit/FINDINGS.md` rows F-9, F-13, F-14, F-37 (and the whole ledger) | the dispositions this lane must not contradict |
| S12 | `.reference/catalog/REFERENCES.md` lines 111, 124–134; `.reference/catalog/PAPERS.md` §canonical-hashing (11 sources) | the role scoping that governs what may be cited for what |
| S13 | `.staging/scouts/2026-08-25-wave2/R3-transport-admission.md` targets 3 and SP-11 | the ten proved spelling families and SP-6′, the unbounded one |
| S14 | `formal/entity-store/E2/Encode.lean:47,80,125`; `E2/Obligations.lean:19–29` | the actual byte forms, used once (lesson U-3) to check a Unison trap against our code |

### Acquisition gaps recorded (host-level, not corpus-level)

- **ACQUISITION-GAP — the Unison clone is not on this host.** `.reference/clones/` does not
  exist here; the clone pinned at `84b95a6` is a PC-side artifact. Every `file:line` citation
  below is therefore **one hop removed**: it is quoted from S4 or S5, which read the clone
  first-hand. Nothing in this report is a fresh source reading of Unison.
- **ACQUISITION-GAP — the papers are pinned but their bytes are absent here.**
  `.reference/papers/` holds only `README.md` on this Mac. Maziarz 2021 (`37cda15b…`),
  Blaauwbroek–Olšák–Geuvers 2024 (`2538ba5c…`), Helbling 2020 (`1a4f2e4b…`),
  Grabmayer–Rochel 2014 (`a867452b…`) and the two SCOTT entries are all in
  `.reference/provenance/papers.lock.json` and role-scoped in `PAPERS.md` under cluster
  **canonical-hashing**, whose lock note says "Local copies are gitignored". So the pins are
  real and the role scoping is real; the reading is not available here. Helbling's critique of
  Unison is used below **only** through S3's verbatim excerpt.
- **Catalog note, not a gap.** S3 §7 states that none of the three hashing papers appears in
  `REFERENCES.md`. Confirmed: `REFERENCES.md`'s Unison rows are Dunfield & Krishnaswami 2013
  (typechecker, "does not support … content addressing") and Lindley/McBride/McLaughlin 2016
  (Frank, "does not support … Unison's exact ability implementation or hashing discipline"),
  plus line 111's architecture-and-context-only row for the Unison-in-production experience
  report ("No theorem about Effect, JavaScript, or this model"). The hashing literature is
  role-scoped **in `PAPERS.md` by cluster instead**, which S3 did not check. So the corpus is
  scoped; `REFERENCES.md` simply is not where that scoping lives.

### Reading conventions

Each lesson carries **(a)** the receipt, **(b)** what it bears on, naming F-numbers, and
**(c)** one of three tags:

- **CONFIRMS-CURRENT-DESIGN** — the corpus supports a choice E2 has already made.
- **CHALLENGES-CURRENT-DESIGN** — the corpus supplies evidence against a ratified choice.
- **GAP-WE-ARE-AT-RISK-OF-REPEATING** — E2 wrote down the lesson and has not (yet) discharged
  it in the artifact.

A lesson can carry a split tag; where it does, the split is the finding.

---

## Part I — The encoding layer (layer b)

### U-1 — Unframed token serialization: unwritten discipline, unchecked

**(a) Receipt.** S4 §2.3, the third stated consequence: *"There is no framing between tokens
beyond what each token contributes. `Tag` sequences are the only discriminator, so tag
assignments per constructor are load-bearing."* S5 §3.4 places the counterexample: the lab's
own `Fragment/Stream.lean:76` proves `v2_stream_not_injective` with `[.int 5]` vs `[.nat 5]`,
and notes worse — *"eight `Tag 0` tokens serialize identically to one `Int 0`"* — concluding
that what keeps Unison alive is *"an unwritten discipline … and nothing checks that
discipline."*

**(b) Bears on.** L2 (KICKOFF §3), the whole framed scheme, and the discharged obligations:
`encSchema_inj` / `encValue_inj` are now two-line M4a corollaries (STORE-MODEL §9, seat wave).
The lower half of layer (b) is closed for E2 in a way it has never been closed for Unison.

**(c) CONFIRMS-CURRENT-DESIGN.** With one carried caveat that S5 §8.2 already wrote down and
that wave 2 has now made concrete: *"stream-level injectivity is necessary but not
sufficient."* F-27 and F-34 live in the upper half — but note they are the **opposite**
failure from Unison's. Unison's unframed stream is *under*-specified (many carriers, one byte
string). E2's carrier is *over*-specified (one denotation, many carriers, hence many byte
strings). Framing solved the direction Unison failed at, and created no defence against the
other direction. That asymmetry is the single most useful sentence in this report for wave 3.

### U-2 — The same value encoded two ways depending on which token carries it

**(a) Receipt.** S4 §2.3 consequence 2: *"`Hashed` is length-free while `Bytes` is
length-prefixed … a `Hash` reached through the generic `Tokenizable` instance and a `Hash`
emitted as a `Hashed` token are **encoded differently**. This is a real trap for a
reimplementation."* Restated as conformance item 6 in S4 §10, and again in S5 §8.2 as *"one
trap inherited from Unison and worth fixing in the straw."*

**(b) Bears on.** E2 now has **three** sites where an address enters a pre-image: `.ref`
(schema plane), `Value.vaddr` (A-1, value plane), and the `sAddr` slot of `preimageE`.
Checked against the artifact: `E2/Encode.lean:47` defines `encAddress a = encNat a.bytes.length
++ a.bytes`; `:80` emits `.vaddr a => 0x16 :: encAddress a`; `:125` emits `.ref a => 0x37 ::
encAddress a`; `E2/Obligations.lean:26` uses `encAddress schemaAddr` in `preimageE`. One
function, three call sites, length-framed at all three.

**(c) CONFIRMS-CURRENT-DESIGN.** The trap is closed by construction, and A-1 — which was the
moment it could have re-opened, since it added the third site — did not re-open it. Recorded
as a positive result, in the F-31/F-38 tradition of pinning what survived.

### U-3 — #3509: routing carrier information around the encoder

**(a) Receipt.** S5 §3.4 traces it first-hand: `Decl v a = Either (EffectDeclaration v a)
(DataDeclaration v a)`, `EffectDeclaration` a newtype over `DataDeclaration`, and
`Convert.hs:251-267` with the source's own comment — *"want to unwrap the decl before doing the
rehashing, and then wrap it back up the same way."* S5's verdict: *"The tag is stripped, parked
in a side map, and re-attached after hashing … routed around the encoder, by design, to keep
the hashing types simple."* S3 records it as D3 and as C7b (*"implicit, never stated … and
**false**"*), issue #3509, still open since 2022-10-14.

**(b) Bears on.** L3 (KICKOFF §3), KICKOFF §4.1's fail-closed admission, MAPPING row 19
(per-property `isMutable` MAPS+ID — *"dropping it would be unprecedented L-3509"*), row 5
(array `isMutable` COLLAPSE-PRICED, permitted only because *Effect's own codec drops the same
thing*), and F-6 (`Json`/`MutableJson` are one `Declaration` differing only by an annotation
string).

**(c) CONFIRMS-CURRENT-DESIGN.** The rule E2 wrote — the encoder's domain is the whole carrier,
no side maps — is the exact inverse of the mechanism, and MAPPING's disposition vocabulary
(COLLAPSE-PRICED vs MAPS+ID) is a working discipline for the one case where dropping is
defensible. See U-4 for the one place the estate broke its own rule on purpose.

### U-4 — Q12 is the estate's own L-3509, and wave 2 proved the price

**(a) Receipt.** KICKOFF §4.3, in the estate's own words: *"where the pinned library's
observable semantics make an order significant … E2's equivalence must NOT quotient it away —
being coarser than the subject's semantics is #3509's shape again, one level up."* Q12
(STORE-MODEL §7) then kept `Conforms` blind to the union `mode` byte as a **priced
divergence**, reasoning that exclusivity is a decode semantic and conformance is a typing
judgment. F-36 (S1 register, S2 tier) established the price is real, not notional: *"under
`oneOf`, a second successful member match is a decode failure (census §5a,
`SchemaAST.ts:3071-3073`), while `Conforms` accepts. M17 would therefore certify a value
Effect's decoder rejects. `mode` is in identity, so the two schemas are distinct addresses —
the divergence is observable, not notional."* Receipt: R3 `ov_reachable`, `mode_is_in_identity`
(kernel).

**(b) Bears on.** F-36, F-25 (M17's statement, whose anti-claim is where R3 recommends the
price be named), Q12, MAPPING row 26.

**(c) CHALLENGES-CURRENT-DESIGN.** Not because Q12 is wrong — the reasoning is stated and the
divergence was priced up front, which is more than Unison ever did — but because the corpus's
own framing makes the shape uncomfortable. #3509's defining feature is not that a bit was lost;
it is that a judgment was **coarser than the semantics it purported to model** and the project
called it a simplification. Q12 is coarser than Effect's decoder and calls it a price. The
difference is documentation, not mechanism. R3's recommendation (name the price in M17's
anti-claim rather than pay it) keeps the honesty and costs nothing; the corpus supports it.

### U-5 — #2787: canonical order manufactured from derived hashes, ties broken by name

**(a) Receipt.** S4 §4.3 gives the mechanism in full — permutation environment, sort members by
their pass-one hashes, re-hash in the distinguished environment, a third sort on `hashName`.
§4.4: ties yield `IncompleteElementOrderingError`. S4 §10 item 16 states the consequence
flatly: *"the tie is broken by input order, which is `Map.toList` order, which is `Ord v` order
on names. **In these cases the hash is name-dependent.**"* S5 §3.5 places it as the dual of
#3509 — *"one under-specifies, one over-specifies. Neither is a digest problem, and neither is
fixable at layer (c)"* — and S5 §7.2 states the bill: *"The cost of admitting cycles is that
you owe a total, tie-free canonical order."*

**(b) Bears on.** L4, which is E2's answer verbatim: *"object fields sort by field name
(duplicates rejected at admission, so no ties exist) … **Nothing in E2 ever sorts by a
hash.**"* And then: F-12, F-40, F-41, F-28, F-33.

**(c) Split — CONFIRMS the principle, GAP-WE-ARE-AT-RISK-OF-REPEATING the implementation.**
This is the sharpest finding in the report and deserves stating precisely.

L4's tie-freedom is not a property of the sort. It is a property of the *admission check* that
is supposed to make ties unreachable. F-12 proved the check was never there: `canonFields` on a
run of equal keys is an **involution, not idempotent** — that is the tie case, arriving by the
exact route L4 promised had been closed. A-3 then carried `dupFreeS` into `WFS` for schemas.
F-40 proved the boundary still admits them (a palindromic duplicate-key run byte-compares equal
to its own re-canonicalization). F-41 proved the mirror (the boundary rejects non-palindromic
duplicate-key bytes it produced itself). F-28 proved the **value** plane was never covered at
all — A-3 left value-plane duplicate-freedom as "a boundary admission, not a `Reachable`
clause", and the boundary does not check it. F-33 proved the boundary enforces **no part** of
`WFS`.

So: E2 read #2787, wrote down the correct fix, and shipped the same failure shape by a
different route — a canonical order whose tie-freedom rests on an admission check that was not
implemented on either plane. The difference from Unison is that we found it in two days with a
kernel, and Unison has not found the fix in five and a half years. The similarity is that the
principle in the design document did not by itself put the check in the artifact.

### U-6 — Mitigation-not-fix, and how fast a hard error gets softened

**(a) Receipt.** S3 §4/D1 and the §8 live-tracker addendum. PR #6007 (merged 2025-12-04) makes
top-level ambiguous components a hard error; its own body says *"This doesn't fix the issue,
but it does prevent the problematic situation."* Then, verbatim from the addendum: *"The
hard-fail was softened twice within a day: PR #6035 exempted internal let-bindings, and PR
#6038 (merged 2025-12-05) converted failure→warning and made the **runtime ignore the warning
entirely** when hashing top-level components (needed to un-break `@unison/cloud`)."* The
pinned clone (1.4.0 release day, 2026-08-19) still carries `hashingVersion = Tag 2`: *"no new
hashing version exists; the real fix has not been started."*

**(b) Bears on.** Repair family 2 (F-33, F-40, F-32, F-41), whose recommended shape (S2) is
*"one boundary amendment: `WFS` as a named check plus decidable acyclicity, with STORE-SHELL
§4/§5 narrowed to what `check` actually establishes."*

**(c) GAP-WE-ARE-AT-RISK-OF-REPEATING.** The estate has no rule about what happens when a
newly-tightened admission check rejects something a dogfood consumer depends on. Unison's
answer took 24 hours and produced a warning the runtime ignores. E2's dogfood surface is
KICKOFF §8 and the harness scripts; the moment `WFS` becomes a real boundary check, the same
pressure applies. Worth an explicit posture in the family-2 ruling: whether a boundary check,
once enacted, may be downgraded to a warning, and if so under what act.

### U-7 — The invariant enforced at the top plane and silently dropped one plane down

**(a) Receipt.** S3/D2: *"`hashCycle` deliberately discards the warning for internal letrecs
(`ABT.hs:169-174`), and `internal-incomplete-element-ordering.md` pins that as intended
behaviour. So the ambiguity that is fatal at top level is silently accepted one level down."*
S3 marks it *"By design, unargued."* The in-tree transcript says why, verbatim (S3 C17): *"On
top level components this is an error, but we don't want to error on letrecs which are internal
to a definition."*

**(b) Bears on.** Two E2 instances, both open:
- **F-28.** Duplicate-key freedom became a `Reachable` clause for schemas (A-3 / `dupFreeS`) and
  stayed "a boundary admission" for values — and the boundary does not check it. Same shape:
  fatal on one plane, accepted on the other, with a stated reason (*"a JS object cannot carry
  duplicate keys, so the excluded values have no host counterpart"*) that F-28 refuted by
  constructing reachable duplicate-key values via `.record` and via `.lit`.
- **F-26.** `dupFreeS (.lit _) = true` unconditionally, so under A-6 as ruled the involution
  reappears **one plane up** in the lit payload. R1's repair — `dupFreeS (.lit v) := dupFreeV
  v` — is precisely "carry the invariant down into the nested plane".

**(c) GAP-WE-ARE-AT-RISK-OF-REPEATING.** The generalizable rule the corpus supports: *an
invariant that is a hard error at one plane and a comment at another will be violated at the
other.* F-26's repair and F-28's ruling are the same rule applied twice; wave 3 could state it
once.

### U-8 — The reference-transparency bypass: a bare digest and a pre-image in one space

**(a) Receipt.** S4 §5.1, called *"the single most surprising rule"*: `TermRef
(ReferenceDerived h 0)` *"bypasses `accumulate` entirely and **is** the component hash — no
`Tag 1` prefix, no tag, no rehash."* Conformance item 13 (S4 §10) restates it: *"`is` `h`,
verbatim, with no `accumulate`, no version byte, no tags."* S3's T6 names the hazard: *"a raw
64-byte hash and an `accumulate`d value now inhabit the same space — that is precisely an
injectivity hazard."* Asserted in a comment (C10); S3 §1.1 records **no test pins it**.

**(b) Bears on.** STORE-MODEL §2's pre-image shape (`versionByte ∷ tag_k ∷ ser_k(canon_k c)`),
M7 kind separation (pre-image half proved, `kind_separation`), and NEG-1 (*"dropping the kind
tag admits a schema/entity pre-image collision"*).

**(c) CONFIRMS-CURRENT-DESIGN.** This is the best concrete argument in the corpus for why M7's
pre-image-level statement must stay unconditional and why no `pre_k` may ever have an
exception: Unison has exactly one bypass, it exists for an ergonomic reason (`x = 1+1; y = x`
hashing alike), and it puts an unstructured 64-byte value into the same universe as structured
pre-images with nothing to tell them apart.

### U-9 — Layer separation is the easy theorem; the collisions live inside one layer

**(a) Receipt.** S3 C7: term/type/decl prefix distinct namespace bytes (`Tag 1`/`Tag 0`/`Tag
2`), asserted at `Term.hs:147-149`, `Type.hs:136-137`, `DataDeclaration.hs:115-116`. S3's T8
draws the honest pair: *"disjoint across layers, **not** injective within the decl layer"* —
C7b/D3 being the counterexample. S3 §1.1 records the disjointness claim has **no** test.

**(b) Bears on.** M7 (proved at the pre-image level for S vs E — the easy half, done). And the
hard half, which E2 has **no statement of**: nothing in the M1–M19 ledger says "distinct source
constructs take distinct addresses **within** kind S". F-34 is exactly the refutation of the
statement that was never made — at least ten spelling families, one unbounded.

**(c) GAP-WE-ARE-AT-RISK-OF-REPEATING.** Kind separation is proved; intra-kind faithfulness is
not stated. S3's T1 (*"injectivity of the tokenizer"*) names the shape and, importantly,
predicts its honest form: *"the honest theorem is probably 'injective *except on this
characterised set*', and characterising that set is itself the result."* F-34's ten families
**are** that characterisation, already in hand.

---

## Part II — Names, identity, and ambient inputs

### U-10 — Alpha-invariance built into the encoder, and E2's deliberate inversion

**(a) Receipt.** S4 §3: *"`Abs` contributes no tokens at all … `Var` hashes as its De Bruijn
index."* S5 §3.6's "Take" column: *"Binder erasure inside the encoder … alpha-invariance by
construction, not by a pass."* S6 §4 supplies Unison's published version: *"all named arguments
[are replaced] by positionally-numbered variable references."*

**(b) Bears on.** F-9 (*"the `mu` discriminator in the pre-image splits alpha-equivalent
recursive schemas — the inverse of Unison's design"*), G3 (discriminator stays in identity;
alpha-invariance a recorded non-goal v1), KICKOFF §4.2, L5's D1/D2/D3 spine theses.

**(c) CHALLENGES-CURRENT-DESIGN — assessed at length in Part IV.** E2 kept De Bruijn indices
for `var` (so binder *names* are still erased) and put the discriminator *string* in identity.
The inversion is partial and deliberate, and the F-27/F-34 evidence bears directly on whether
its price was correctly estimated. See §IV.

### U-11 — Names in identity by accident: three separate leaks, none of them intended

**(a) Receipt.** Three, all in S4 §10 and S3 §4:
1. **`unique` GUIDs** (item 22, and §11 open question 9, marked *resolved, and it is a hard
   blocker*): the GUID is looked up *by the type's name* in the codebase, or minted from *32
   bytes of a cryptographic DRG plus the declaration's line and column*. Consequence, verbatim:
   *"a `unique type` hash is **not** a function of its source text."* S3/D6 and P1/P3 are the
   claims it breaks.
2. **Cycle tie-breaks** (item 16, D1): stable `sortOn` falls back to `Ord v` on names.
3. **Decl constructor tie-breaks** (D4, S4 §11 open question 2): *"two constructors with
   identical types appear to be silently ordered by name"* — and, unlike the cycle case,
   **no warning at all**. S3 records D4 as *"Not filed as an issue that I found."*

**(b) Bears on.** L5, M16 (L-names-inert), STORE-MODEL §8 (*"No names in identity … the
discriminator is the one priced carve-out"*), and F-39.

**(c) CONFIRMS-CURRENT-DESIGN, with one boundary correction.** E2 has one carve-out, declared,
and no randomness anywhere in identity. F-39 does **not** put names in identity — it makes the
name→address map non-functional across model and disk. Different failure, same family (a host
incidental reaching an observable). Do not let the wave-3 write-up conflate them.

### U-12 — The host's native string order (and E2's uncovered twin: the host's native string equality)

**(a) Receipt.** S4 §2.4: *"`Set` and `Map` go through `Set.toList` / `Map.toList` … **Haskell's
`Ord` ordering of the key type is part of the hash.**"* Conformance item 9 spells out the
hazard: *"UTF-16-agnostic code-point-wise `Char` comparison in GHC — an implementation in a
language whose default string ordering differs … will diverge on astral-plane names."* KICKOFF
§4.5 records that E2 read this and took the countermeasure: *"byte-wise ordering where ordering
is needed — Unison's choices, adopted here deliberately and written down (their astral-plane
`Ord` trap, item 9, is avoided by never using a language's native string order)."*

**(b) Bears on.** F-39, tier S1, rank 3 in the triage: *"Name keys are Lean `String`s in the
model and filenames on disk. On a case-folding filesystem (APFS, NTFS) `name-set "Widget"` then
`name-set "widget"` yields two model bindings and one disk file … **both exiting 0**."*

**(c) GAP-WE-ARE-AT-RISK-OF-REPEATING — and the gap is precisely locatable.** KICKOFF §4.5's
rule is "never use a host's native string **order**". F-39 is the same lesson one predicate
over: a host's native string **equality**. The rule was written for the identity plane and
never extended to the name plane, and the name plane is where the estate has two hosts (Lean's
`String`, and APFS/NTFS's case-folding filename comparison) that disagree. Whatever family-3
ruling lands, the general rule worth minting is: *no host's string relation — order or equality
— is ever load-bearing for an observable, on any plane.*

### U-13 — Ambient inputs reaching a hash, and what the G-S gate is for

**(a) Receipt.** S3/D6 (GUID depends on a random draw, a source position, and a codebase
lookup), D8 (#5714, open: *"If a dependency happens to be loaded in a scratch file, the
dependent gets a different runtime hash than in a fresh session"*), and S4 §11 open question 10:
*"Given that the parser consults codebase state to resolve a hash-affecting field, it is worth
auditing whether anything else in `ParsingEnv` reaches the hash. **Not investigated.**"*

**(b) Bears on.** F-43, the S1-rank-1 finding, now fixed at `2f33ae0`: *"a clock, `IO.getEnv`,
or a random source in `main` built all-gates-green"*, and *"the digest `Sha3.Impl.sha3_512`
[was] shadowable — the one function whose silent replacement forges every address in the
store."*

**(c) CONFIRMS-CURRENT-DESIGN.** The G-S gate is the mechanized answer to the audit Unison's own
report calls "not investigated" after twelve years. The corpus supports keeping the gate's
scope defined by **module membership** rather than name prefix (the F-43 repair), because
Unison's leaks all entered through paths nobody thought to name.

### U-14 — Terms carry their types, and D7 is Unison's F-34

**(a) Receipt.** S4 §6 Inside: *"**The type of a term.** This is easy to miss … a term's
inferred/declared type is part of its hash."* Conformance item 17: *"An implementation must
therefore reproduce Unison's *typechecker* output, not just its parser."* And then D7 (#3328,
open since 2022-08-15): *"Semantically identical terms with differently-**written** type
ascriptions get different hashes — `foo = '175` with signature `'Nat` vs `() -> Nat` vs
`a ->{} Nat` fall into three distinct hash groups."* S3's judgment: *"the hash tracks the
elaborated type, not the meaning."*

**(b) Bears on.** STORE-MODEL §5 (*"because `sAddr` is inside the entity's pre-image … the same
value at two schemas is two entities at two addresses"*), and — the load-bearing part —
**F-27 and F-34**.

**(c) Split.** CONFIRMS the entity-plane choice: E2 embeds the schema's *address*, not the
schema's structure, so E2 does not inherit Unison's "you must reproduce the elaborator" wall
(S3's T10, which it calls *"the wall any byte-conformance effort hits"*). But D7 is, as a
failure class, **identical to F-27/F-34**: one denotation, several written forms, several
addresses, no admission rule that picks one. Unison filed D7 in 2022; it is open. That is the
corpus's evidence on the question wave 3 will ask about F-27/F-34 — *how urgent is this?* —
and the answer it gives is: **this class does not get fixed after it ships.** Admission is the
only cheap moment.

### U-15 — Hashing is undefined on open terms, and Unison chose to refuse

**(a) Receipt.** S4 §3 rule 3: *"A free variable not in the environment is a **hard error**
(`die`). Hashing is only defined on closed-enough terms."* S3/D9 records it as a live issue
(#4748, open) *against* Unison's own totality claim P1. And S3's C15/C16 record the positive
side, verbatim from the in-tree error transcript: *"We can't allow these terms into the
codebase because in certain cases there are multiple valid distinct components which would
receive the same hash."*

**(b) Bears on.** F-33: *"A schema `.var 0` (open de Bruijn index) and `(mu d (var 0))`
(unguarded) both store and check clean."*

**(c) GAP-WE-ARE-AT-RISK-OF-REPEATING, inverted.** Unison's defect is that it *crashes* where
it claims totality. E2's defect is the opposite and worse for a store: it *accepts* what its
own `WFS` forbids, and returns exit 0. The corpus's positive exhibit is C15/C16 — the project
chose to refuse at the boundary rather than hash ambiguously, and wrote the reason into the
error text. That is the model for family 2's repair posture.

---

## Part III — Store, versioning, transport, and evidence

### U-16 — Hash-version doctrine: the version byte, the column, and the untested soundness argument

**(a) Receipt.** S4 §1: `hashingVersion = Tag 2`, prepended *inside `accumulate`* — hence *"once
per hashed node, not once per definition"* (S4 §10 item 2 calls getting this wrong *"a plausible
and fatal mistake"*). S4 §9 gives the doctrine: `ContentAddressable.hs` — hashing packages
*"should never change"*; `Tokenizable.hs:56-58` — a hash change *"requires a complete codebase
migration"*; `Tokenizable.hs:28-36` — if the function changes at all, the version must bump so
that *every* value's hash changes, else base32 collisions across versions in the `hash` table.
S3 grades that last one C4: *"a genuine **soundness** argument, stated in prose, never
discharged … The reasoning is not tested."* Empirically: exactly one transition (V1→V2), a full
rehash-and-canonicalize migration, then the V1 rows purged by migration 3; **no
`unison-hashing-v1` package survives**. S5 §3.2 adds that `hash_object.hash_version` is *"a
prepared migration seam that has been used exactly once"* and is degenerate today (every row
stamped `2`). S3 §4 closes the ledger: issue #466 *"Add version info to Hashes"* open since
2019-04-19; **no published stability guarantee exists**.

**(b) Bears on.** L6, STORE-MODEL §1 (`versionByte`), §2's pre-image line, and S5 §8.7's owed
obligation 3.

**(c) CONFIRMS-CURRENT-DESIGN, with one genuine improvement and one owed item.**
- *The improvement, worth recording.* Because E2 stores **pre-image bytes verbatim** (L6,
  STORE-SHELL §4), the version byte is readable off disk with `xxd`. Unison needed a
  `hash_version` **column** precisely because its storage codec is not its hashing codec (U-18);
  E2 needs no side table for the same discrimination. That is a second-order payoff of the
  store-the-pre-image ruling that the corpus does not state anywhere and wave 3 may want to.
- *The owed item.* S5 §8.3 notes the estate has already proved once, in
  `sha3_ne_prefips_spec`, that a domain separator does its job, and asks whether
  `version_byte_separates` is provable in the same style *"rather than merely asserted"*. It is
  listed at S5 §8.7 item 3 as owed; it does not appear in STORE-MODEL §6's M1–M19 ledger. C4 is
  the untested prose soundness argument Unison never discharged; the estate can discharge its
  analogue cheaply and has not.

### U-17 — Unison's own newest hashing code abandoned the token scheme for canonical CBOR

**(a) Receipt.** S4 §9, under *"A divergent newer scheme exists"*:
`Unison\Hashing\V2\HistoryComments.hs` (reachable via schema migrations 23–26) *"hashes history
comments with a **completely different pipeline**: CBOR canonical encoding
(`Codec.CBOR.Encoding`) fed to SHA3-512 directly, with its own `commentHashingVersion = 1` /
`revisionHashingVersion = 1` counters, not the `Token`/`accumulate` machinery. The comment
explains the CBOR choice as giving **unambiguous field framing and architecture-independent
determinism**."*

**(b) Bears on.** L2, and the credibility of the framed scheme generally.

**(c) CONFIRMS-CURRENT-DESIGN — and this is the strongest single receipt in the lane.** Every
other argument for framing in this corpus comes from outside Unison (git's header, DAG-CBOR's
canonical rules, the lab's own `v2_stream_not_injective`). This one comes from **inside**: when
the Unison project wrote new hashing code in the 2020s, it did not reach for its own tokenizer;
it reached for canonical CBOR and wrote "unambiguous field framing" as the reason. That is the
project conceding L2 in its own source tree, without ever revisiting V2.

### U-18 — Hashing codec ≠ storage codec, and what that cost

**(a) Receipt.** S4 §0: *"You cannot rehash a definition from `object.bytes` alone — you must
decode, resolve `LocalIds` against the `text`/`object` tables, convert to the
`Unison.Hashing.V2` types, then tokenize."* S5 §7.5 generalizes: *"Re-hash-on-read is cheap
exactly to the degree that your stored bytes ARE your pre-image bytes."* S5 §8.4 records the
straw's reasoning: *"Unison had a reason — the storage codec interns text and uses varints, so
it is much smaller — but the lab does not have Unison's scale problem and should not pre-pay
Unison's verification cost."*

**(b) Bears on.** L6, STORE-SHELL §4 (SH5's full scan), and F-44 — `sha3_512` at ~26 KB/s, every
verb re-opening with a full scan, ~76 s per verb after a single 2 MB object.

**(c) CONFIRMS-CURRENT-DESIGN, with an honest note.** E2 took the lesson and the verification
cost arrived anyway, from an unmodelled direction: not codec conversion but digest throughput ×
full rescan. Worth saying plainly, because the corpus's rule ("cheap to the degree stored bytes
are pre-image bytes") is true and was not sufficient.

### U-19 — Packing is a storage change that touches no address — and F-44's repair is legitimate under it

**(a) Receipt.** S5 §2.4, on git's packfiles: *"Delta encoding is invisible to the address. An
object's address is always the digest of its full canonical pre-image, never of its delta
representation."* And the generalization: *"**The address commits you to an encoding, not to a
storage format.**"* S5 §8.4 leans on it explicitly to keep the v0 directory-of-files
decision non-binding.

**(b) Bears on.** F-44 (S4 tier, noted for v1: *"a v1 concern for verification-on-open
amortization"*) and STORE-SHELL §4's *"Manifest/append-log optimizations arrive only by
amendment."*

**(c) CONFIRMS-CURRENT-DESIGN.** Recorded because it answers a question F-44 leaves open: a
manifest or append-log amortization is git's packfile move, and the corpus's own rule says it
is address-neutral. The scale note is worth carrying too — S4 §8 records Unison at SQLite
schema version **26**, a migration ladder of 24 steps, against **one** hash-version transition.
Storage churns an order of magnitude more than identity. Storing the pre-image couples the two;
the coupling is safe only as long as amendments to layout leave bytes alone, which is exactly
what §2.4 licenses.

### U-20 — Names as a content-addressed causal spine: the one thing to steal outright

**(a) Receipt.** S5 §3.3: *"Renaming a definition produces a new namespace hash. The
definition's own hash is untouched."* And §7.3: *"Unison's variation is the one worth stealing:
it makes the *name map itself* a content-addressed value, with a causal parent chain, so the
mutable cell holds an address of a *versioned* map … Then 'what were the names last Tuesday' is
a lookup, not an archaeology expedition."* S4 §5.5 gives the shapes (`Branch`, `Causal`).

**(b) Bears on.** KICKOFF §17, which adopts it verbatim (*"history is the Unison causal spine as
plain data"*), amendments A-1 and A-2, and F-13 (G5: the naming-convergence aspiration is
demoted to pending-A-5 because it dies on array order-sensitivity).

**(c) CONFIRMS-CURRENT-DESIGN, with two hazards the corpus supplies for the A-2 design.**
1. S4 §5.5 notes that `Branch`'s `tokens` field order (terms, types, **children, patches**)
   *differs from the record declaration order* (terms, types, patches, children), with the
   remark *"The token order is what counts."* A hand-maintained correspondence with no check.
   E2's R-10 canonical field sort makes declaration order irrelevant, so the hazard is closed by
   construction — but only for `object`, and A-2's name-view shape
   (`{bindings, parent, base, annotations}`) must go through that node, not a bespoke encoding.
2. `Causal`'s parents are `Set`-ordered — U-12's hazard again, in the naming plane specifically,
   which is where F-39 already bit.

### U-21 — Test-coverage reality: golden vectors detect change, they do not establish anything

**(a) Receipt.** S3 §5, reported as absence and then as judgment. *"Property-based tests of
hashing invariants: none."* `hedgehog` is in the tree but used only for **serialization
round-trips** (ANF, MCode, and the **sync wire format**) — *"None touches definition hashing,
alpha-invariance, or renaming."* The team *does* property-test name parsing, text utilities and
relation algebra with its own `EasyTest` generators, so *"It is not applied to hashing. That is
a choice, not a missing capability."* There is **no term/type generator in the tree at all**, so
the obvious property cannot even be written. The 535 pinned hashes of `all-base-hashes.md` state
their own purpose — making *accidental* changes visible — and S3's verdict is: *"It is a change
detector, not a spec."* The closing judgment: *"exactly what you get when a team believes an
invariant and tests it once."*

**(b) Bears on.** STORE-SHELL §6 (the differential harness: *"Scripts are committed
fixtures"*), the refutation waves, and F-45 (the docs say nine committed scripts; there are
ten).

**(c) Split — CONFIRMS the refutation-wave method, GAP for the harness.** The harness is a
committed-fixture change detector of exactly the kind S3 grades as *"detects change, proves
nothing"*. Evidence from this estate's own record: F-39 (an S1 silent wrong answer) was found by
a refuter reaching for the filesystem's case-folding, not by the harness; so were F-40, F-41,
F-42, F-43. The harness's purpose (STORE-SHELL §1 rung 1) is model-vs-disk agreement, and it is
the right instrument for that — but it is not a source of new faults, and the record now shows
which instrument is. Worth stating so nobody later reads a green harness as coverage.

### U-22 — Sync/transport, and what the corpus actually records

**(a) Receipt.** Four items, each small, and the honest statement is that the corpus records
**no substantial Unison sync-design lesson**:
1. Unison property-tests its **transport** codec (`unison-share-api/tests/Unison/Test/Sync/`)
   and not its identity codec (S3 §5).
2. The migration-3 purge of V1 hash objects is *"preceded by the 14-line explanation of the
   sync crash it fixed"* (S4 §8) — i.e. the one hash-version transition produced a sync
   incident.
3. Runtime **value** serialization has its own format versions (v4, v5) with golden `.hash`
   files, *"a different artifact from definition hashes"* (S3 §1.3).
4. `docs/repoformats/v2.markdown` is a **storage-layout** document. S3 §1.2 states the finding
   precisely: *"Note what this document does **not** contain: any statement of an invariant the
   hashing algorithm satisfies. It is a storage layout document. It describes where hashes
   live, never what they mean."*

**(b) Bears on.** F-37 (*"git's connectivity and `fsck` cover git's own DAG; our reference edges
live inside blob content git never parses, so they contribute zero to WF2/WF3"*), F-14 / M19
(git delivers a set; `Reachable` is sequential), F-30 (M19 refuted four ways while still
prose), STORE-SHELL §5's wire protocol and R-15c.

**(c) CONFIRMS-CURRENT-DESIGN, and records an ACQUISITION-GAP.** Item 4 is the one that lands:
the estate's separation of STORE-MODEL (invariants) from STORE-SHELL (layout) is exactly the
document Unison never wrote, and F-37's finding — that git contributes nothing to *our*
invariants — is the same insight applied to a borrowed transport. **ACQUISITION-GAP:** the
corpus contains no analysis of Unison Share's sync protocol, its entity-set transfer, or its
consistency model. If wave 3 wants transport lessons beyond git-as-bulk-sync, they are not held
locally.

### U-23 — Builtins hashed by name against a registry: the trust moves, it does not vanish

**(a) Receipt.** S4 §6 Inside: *"**Builtin names**, as `Text` — `ReferenceBuiltin "Nat"` hashes
its name. Builtins are named, not hashed."* Conformance item 21: *"the implementation must carry
Unison's exact builtin name table."* KICKOFF §4.1 adopts the mechanism explicitly: refinements
enter from *"a closed, serializable check vocabulary … transformations and declarations enter by
name against a pinned registry, **exactly as Unison hashes builtins by name against its builtin
table**."*

**(b) Bears on.** The R-4 allowlist — **deferred** to a dedicated session (G7) — while MAPPING
already commits six minted ids (`lab/keyword/Void`, `lab/keyword/Undefined`,
`lab/keyword/Symbol`, `lab/uniqueSymbol`, `lab/enum`, `lab/mutable`, plus a conditional
`lab/pattern`). And on F-5 (the relabelling hole: *"annotations spread last + `Filter.annotate`
+ id dispatch lets a check claim to be a predicate it does not enact"*) and **F-29** (*"check
payloads are address-significant and nothing canonicalizes them"* — two source-identical
refinements take two addresses).

**(c) CONFIRMS the mechanism, GAP on its consequence.** Naming a thing by an id does not remove
the injectivity question; it relocates it into the registry, where nothing in the ledger
currently covers it. Unison's builtin table is an unversioned dependency of every hash and
nobody has ever stated an invariant about it. E2's version is R-4, and the state today is: the
allowlist's **shape** is open (G7), six rows are committed anyway (MAPPING rule 3), the payload
plane is uncanonicalized (F-29), and `checkSem` owes `canonV`-invariance as an admission
criterion (F-24). That cluster is one dedicated session, and the corpus says it is load-bearing.

### U-24 — Pretty-print → reparse is not hash-preserving, and the honest workaround is a split corpus

**(a) Receipt.** S3/D5: issue #823, **open since 2019-09-28**; the project's own round-trip
transcript carries a second corpus, `reparses.u`, explicitly labelled *"These are currently all
expected to have different hashes on round trip."* S6 §4 explains the mechanism structurally:
`TermPrinter.hs` *"re-derives operator precedence, `use`-clause elision, and name qualification
on every render, because none of that survives in the tree"*, and carries `etaReduce`, commented
*"Gets rid of unsightly `_eta` expansion"* — S6's verdict: *"the printer actively undoes
elaboration; output is a readable reconstruction, not a faithful serialization."*

**(b) Bears on.** KICKOFF §4.4 (the two-view problem), **G6** (*"The address subject is the AST
as constructed … Codec-derived forms are transformations; they may become entities later, never
the identity of the source schema"*), F-4 (Effect's codec path reorders union members), and
**F-16** — A-4 broke the shell's exhaustive `renderSchema` match and *"the parser falls through
silently."*

**(c) CONFIRMS-CURRENT-DESIGN.** G6 is the ruling that prevents D5 from ever being a defect,
because it refuses the claim that would make it one. But note that E2 **owns a render/parse
pair** in the shell, F-16 already showed it silently desynchronizing under a carrier amendment,
and there is no statement anywhere in the ledger that shell render ∘ parse is address-preserving.
Unison's honest answer to exactly this was a second corpus labelled as known-divergent. If E2
never intends to claim shell round-trip fidelity, saying so in STORE-SHELL §7 ("Not claimed")
costs nothing and closes the reading.

### U-25 — Floats

**(a) Receipt.** S4 §10 item 4: *"IEEE-754 binary64 big-endian for `Double`, with whatever
NaN/-0.0 bit patterns Haskell's `doubleBE` produces. **Float hashing is a portability
hazard.**"* S4 §11 open question 6: *"No test found pinning the hash of `NaN`, `-0.0`, or
subnormals."* Note also S4 §5.1: `TermFloat n` emits a **raw `Double` token, not
`accumulateToken`** — an inconsistency with every neighbouring case.

**(b) Bears on.** G2 / F-8: `Value` stays float-free in v1; float-bearing schemas and values are
REJECTED-v1 *explicitly and loudly*, and *"silently reinterpreting Effect's `Number` as `Int`
is forbidden (the #3509 spirit)."*

**(c) CONFIRMS-CURRENT-DESIGN.** Cleanly. The corpus supplies both the hazard and the untested
edge cases; G2 declines the whole surface for v1 and says so loudly rather than quietly
narrowing.

### U-26 — The literature that solves #2787 is already in the estate's catalog

**(a) Receipt.** Helbling's critique, quoted verbatim in S3 §3.2 from the PDF (p. 16): *"Unison
uses the technique given in this paper of hashing entire strongly connected components, but
resorts to arbitrarily ordering nodes when the non-recursive hashes between two nodes are
equivalent. This presents issues in certain scenarios where nodes have the same non-recursive
hashes but do not lie in the same orbit."* Published **February 2020**; Unison filed the same
bug against itself in **January 2022**; mitigated (not fixed) **December 2025**. S3's §8
addendum records the last word on the issue: an unanswered community proposal (2025-08-03) for a
quadratic canonical SCC ordering *"inspired by the 'Scott' graph-canonization method"*, with no
maintainer reply in over a year. `PAPERS.md` cluster **canonical-hashing** holds eleven sources
including Helbling, both SCOTT papers, Grabmayer–Rochel's *Maximal Sharing in the Lambda Calculus
with letrec*, and both Hashing-Modulo-Alpha papers — role-scoped as *"the working set for a
content-addressing scheme with proved invariance … **Directly bears on the cycle-ordering defect
this estate is tracking**"*, with the standing caution *"Any claim that a published scheme is
sound as stated for this estate's term algebra"* is **not** supported.

**(b) Bears on.** L7 and KICKOFF §4.2, which delete the bug class rather than solve it
(recursion inside one carrier as a `mu` binder, so the store graph is a DAG and *"no cross-unit
cycle machinery exists at all"*), and **R-3** (mutual recursion) — still deferred, with report
C's finding that *"SCC-as-unit is not expressible while `.ref` carries no component index"*.

**(c) CONFIRMS-CURRENT-DESIGN.** Two things worth pinning. First, the estate bought the escape
route (the whole canonical-hashing cluster) and then designed so it does not need it — that is
the correct order, and the cluster stays live insurance the day R-3 is revisited. Second, the
chronology is the estate's best external argument for its own method: an outside graph-theory
paper named the defect ~2 years before the project did and ~5.8 years before anything shipped.
Refutation waves exist to compress that interval, and F-30 (M19 refuted four ways *while still
prose*) is the estate's counter-example to the Unison timeline.

### U-27 — Unconditional public claims, conditional honest theorems

**(a) Receipt.** S3 §2.2's P11 is graded *"the strongest formal claim Unison makes anywhere"* —
*"the hash may be used to unambiguously refer to that term or type in all contexts"* — and
marked *"none — and it is falsified in-tree"* (D3, D4). S3 §2.1's P4 is the birthday-bound
arithmetic about SHA3-512, and S3's T1 names the elision exactly: *"it is only a claim about
*Unison* if the encoding is injective."* S3's closing judgment: *"the honest theorem statements
here are mostly **conditional or partial** … Unison states these claims unconditionally, and the
conditions are exactly what nobody has written down."* S3 §0: nobody has ever posted a proof of
any property of Unison's hashing. S3 §1.2 adds that the in-tree repo-format spec states no
algorithmic invariant at all.

**(b) Bears on.** L1, M5/M6 (Direction A unconditional, Direction B with `hInj` as a named
hypothesis *never* an axiom), STORE-MODEL §1 (*"Collision resistance is never stated"*), §6's
per-theorem anti-claim column, and the Claim posture sections of both documents.

**(c) CONFIRMS-CURRENT-DESIGN.** The two-direction discipline and the anti-claim column are
precisely the instrument whose absence S3 spends forty pages documenting. Worth one sentence in
any wave-3 write-up: the difference between the estate and Unison here is not proof volume, it
is that every E2 claim carries the conditions on its face.

---

## Part IV — F-9 / G3 re-assessed against the wave-2 spelling evidence

*Analysis, not a ruling.*

**What was ruled.** F-9: *"the `mu` discriminator in the pre-image splits alpha-equivalent
recursive schemas — the inverse of Unison's design."* G3 (KICKOFF §18, STORE-MODEL §7):
*"Discriminator stays in identity (D1's priced carve-out). Alpha-invariance of recursive
schemas is a non-goal v1; the over-specification tension (report A) is recorded, not resolved."*
The rationale is L4 and KICKOFF §4.2: the discriminator is what makes recursive-group order
*"total and tie-free because admission rejects duplicate discriminators (D1)"*, and this
*"deletes the entire #2787 bug class"*.

**What wave 2 added.** Two things, and they pull in opposite directions.

**(1) F-34 / SP-6′ weakens the ruling's *scope*, not its core.** R3 proved (S13, target 3) an
unbounded family: `.mu d₁ X` and `.mu d₂ X` denote the same thing for every pair of
discriminator strings whenever `X` is binder-free, with a `↔` on `Conforms` for all values and
all environments plus a byte receipt through `encSchema_inj`. R3's own note is the precise
statement: *"SP-6′ shows the tension is not merely alpha-invariance: for a body that does not
use its binder, the discriminator string is **pure address entropy** — an unbounded family of
addresses for one denotation."* And SP-6 shows `.mu d X` ≡ `X` outright for closed `X`.

This is a real weakening, but of a bounded kind. G3's justification is that the discriminator
*buys* something: a tie-free order for recursive groups (KICKOFF §4.2) and a
source-derivable identity token (L5's D3). In the SP-6′ family the discriminator buys
**nothing** — the binder is unused, there is no group, there is no order to make tie-free. So
the priced carve-out is being charged in a region where its consideration is absent. R3 supplies
the surgical repair and prices it: *"An admission rule '`mu` whose body does not reference the
binder is inadmissible' kills the family at zero cost and is decidable (`guardSpineB`'s
machinery already computes the predicate)."*

Read carefully, that repair **does not touch G3 at all**. It removes the region where the
discriminator is pure entropy and leaves the region where G3's reasoning applies untouched. So
the corpus's evidence is: G3 survives; MAPPING's admission rules do not.

**(2) F-27 / SP-7…SP-10 do not bear on G3, and it matters not to conflate them.** The A-4
collapse pairs (`.array e ≡ .tupleRest .nil e` for every `e`; `.tuple es ≡ .tupleRest es Never`;
`.record Never ≡ .object .nil`; `.array Never ≡ .tuple .nil`) are constructor-overlap, produced
by an amendment landing beside pre-existing constructors. R3 names them *"A-4 fallout"*. The
`.array e ≡ .tupleRest .nil e` family is infinite in `e` but it is not *entropic* — the two
forms are genuinely two carrier spellings, and one of them is admissible. Different problem,
different repair (a MAPPING rule, per constructor pair), same session.

**(3) The evidence that *strengthens* G3, which is easy to miss.** SP-2 and SP-4 —
`.union .anyOf ms ≡ .union .oneOf ms` and member-order permutation, both proved equal on
`Conforms` — do **not** license collapsing, because `mode` and member order are semantic for
Effect's decoder (census §5(a), and F-36's kernel receipt). R3 draws the conclusion the G3
question needs: *"What they **do** prove is that `Conforms` is not the right yardstick for the
single-spelling rule: the rule must be phrased against the **source construct**, not against
conformance."*

Apply that yardstick to `mu`. Under `Conforms`, `.mu d₁ X` and `.mu d₂ X` are indistinguishable
— so a `Conforms`-based rule would collapse them and, with them, would collapse every
discriminator distinction, including the ones G3 is buying. Under the *source-construct*
yardstick, two `Suspend`s with different identifiers are two source constructs (MAPPING row 21:
`Suspend` MAPS to `.mu`/`.var`, *"discriminator mandatory (D1) and in identity (G3)"*), and the
question is only whether the source can produce a `Suspend` whose body ignores its binder.
**That is the entire live question**, and it is bounded, decidable, and answerable from the
pinned bytes.

**Net assessment (analysis).** The wave-2 evidence **strengthens** G3's core and **weakens the
coverage of the rule that was supposed to protect it**. Concretely:

- G3's reasoning holds wherever the discriminator does work: recursive groups, where it supplies
  the tie-free order that deletes the #2787 class (U-5).
- Wave 2 found one region where it does no work (binder-free bodies) and named a decidable,
  zero-cost admission rule for it.
- The `Conforms`-vs-source-construct distinction R3 forced is the thing that makes an
  alpha-invariance objection to G3 answerable at all. Without it, "these two schemas accept the
  same values" would be an argument for erasing the discriminator entirely — which would
  restore #2787's precondition and cost L5's D3 (source-derivability).
- U-14's D7 supplies the urgency estimate: this exact failure class (one denotation, several
  written forms, several addresses) has been open in Unison since 2022. It does not get fixed
  after it ships.
- The one honest caution against G3 that the corpus supports and wave 2 did **not** settle:
  D1's admission decidability and D2's scoped injectivity are spine theses (L5), and the
  correspondence question KICKOFF §4.2 recorded as *pending, not assumed* — *"what in the pinned
  library maps to the discriminator (candidate: the identifier annotation)"* — is still pending.
  G3 prices a carve-out whose source counterpart is not yet identified. That is not a reason to
  reverse G3; it is a reason not to promote any claim that E2's `mu` identity corresponds to
  anything in Effect until the mapping is pinned.

---

## Part V — Top lessons for wave 3

*Ranked by how directly each would change a pending repair (S2's families 1–3 and the S3
admission rulings). Each line names the lesson, the repair it moves, and what changes.*

| # | Lesson | Pending repair it moves | What it changes |
|---|---|---|---|
| **1** | **U-5 — a canonical order is only as tie-free as the admission check that is actually implemented.** L4 named the #2787 fix and the check landed in `WFS` for schemas only, never in the boundary and never on the value plane. | **Family 2** (F-33, F-40, F-41, F-32) and **family 1** (F-28) | Makes the family-2 amendment's scope explicit: `WFS` as a *named boundary check* on **both** planes, or the tie-freedom claim in L4 is withdrawn. F-28 is not a separate finding under this reading — it is family 2's value-plane half. |
| **2** | **U-7 — an invariant that is a hard error on one plane and a comment on another will be violated on the other.** Unison's D2 (fatal at top level, silently accepted inside `let rec`, pinned as intended, *unargued*) is F-28 and F-26 in one sentence. | **F-26** (blocks A-6) and **F-28** | Supplies the general form of R1's `dupFreeS (.lit v) := dupFreeV v` repair and of F-28's ruling: state the rule once ("every plane a carrier nests into inherits the carrier's admission clauses") instead of twice as ad-hoc patches. |
| **3** | **U-14 + Part IV — the spelling class does not get fixed after it ships.** D7 (#3328) is F-27/F-34's twin and has been open in Unison since 2022; R3 already supplies the yardstick (source construct, not `Conforms`) and a zero-cost decidable rule for the unbounded family. | **F-27, F-34** (S3, admission) | Raises admission above its S3 rank on urgency grounds *without* changing its severity: the repair is cheap now and never gets cheaper. Also settles that the yardstick question must be answered before the rules are rewritten. |
| **4** | **U-15 — refuse at the boundary rather than admit ambiguously; Unison wrote the reason into the error text (C15/C16).** | **F-33** (`check` clean ⇏ reachable) | Gives family 2's posture a precedent and a template: the boundary's job is to refuse, and the refusal message should say what would otherwise be ambiguous. |
| **5** | **U-6 — a hard error survives about 24 hours once a dogfood consumer breaks** (#6007 → #6035 → #6038, runtime ignores the warning). | **Family 2**, and the standing posture for every future admission tightening | Argues for deciding *now*, in the family-2 ruling, whether an enacted boundary check may ever be downgraded to a warning, and by what act. Cheap to write; the corpus shows it is not cheap to retrofit. |
| **6** | **U-12 — the rule is "no host string *relation*", not "no host string *order*".** KICKOFF §4.5 closed the order trap on the identity plane and left the equality trap open on the name plane. | **F-39** (S1, family 3) | Reframes family 3 from "which plane is authoritative" to "which relation is authoritative", which is the decidable question; and generalizes the fix so the name plane is not patched alone. |
| **7** | **U-4 — Q12 is the estate's own L-3509, by the estate's own definition (KICKOFF §4.3).** F-36 proved the price is observable. | **F-36** (family 1) | Supports R3's recommendation to **name the price in M17's anti-claim rather than pay it** — which is also the cheapest disposition, since M17 is already being restated for F-25. |
| **8** | **U-9 + U-23 — the intra-kind faithfulness statement does not exist, and naming-by-id relocates injectivity into the registry.** M7 proves the easy half; nothing states the hard half; R-4's shape is still deferred while six ids are already committed. | **F-29, F-24, F-5** → the R-4 session (G7) | Argues the R-4 session is not an admin task: it owns the payload canonicalization (F-29), the `checkSem` invariance criterion (F-24), the relabelling hole (F-5), and the registry's status as an unstated dependency of every refine address. |
| **9** | **U-16 — `version_byte_separates` is owed, provable in a style the estate has already used once** (`sha3_ne_prefips_spec`), and is Unison's untested C4 soundness argument in our own ledger. | not a wave-2 fault — a ledger gap (S5 §8.7 item 3) | Adds one cheap, well-shaped statement to the M-ledger and closes the one place where E2 currently asserts what Unison merely asserted. |
| **10** | **U-21 — committed fixtures detect change; they do not establish coverage.** Every S1 fault in wave 2 was found by a refuter, none by the harness. | reading discipline for STORE-SHELL §6, and the wave-3 method | Prevents a green harness from being read as coverage, and supports continuing to fund refutation waves as the instrument that actually finds faults. |

**Two positive results worth carrying into wave 3** (in the F-31/F-38 tradition of pinning what
survived): **U-2** — the `Hashed`/`Bytes` trap that S5 flagged for the straw is closed by
construction, and A-1 did not re-open it despite adding a third address site; and **U-17** —
Unison's own newest hashing code (`HistoryComments.hs`) abandoned the token scheme for canonical
CBOR citing *"unambiguous field framing"*, which is the project conceding L2 inside its own tree.

**Two ACQUISITION-GAPs to record against future lanes.** No analysis of Unison Share's sync
protocol or consistency model is held locally (U-22), and the `canonical-hashing` paper cluster
— which is the working set for any future R-3 revisit — is pinned and role-scoped but its bytes
are not on this host (§0).

---

*End of report. G0 advisory. It decides nothing.*
