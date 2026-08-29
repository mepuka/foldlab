# R-F — the program spine: what the design corpus already decided, and what stands after wave 2

**Status: G0 advisory, 2026-08-25. This report decides nothing.** It is a consolidation
pass, not a design pass: the operator's frame for wave 3 is that *the model already did
much of this design work*, so the job here is recovery and re-verification, not
invention. Every claim below carries a receipt (`file` or `file:line`, or a §-reference
into a ratified document). Where the corpus is silent I say so rather than fill the gap.
No web access was used. No file was edited except this one.

**Lane:** the program spine — stable development areas and the shape of the engineering
specification.

**Sources read in full:** `docs/entity-store/{KICKOFF,STORE-MODEL,STORE-SHELL,MAPPING,PROCEDURE}.md`;
`docs/entity-store/audit/{2026-08-25-wave2-faults,2026-08-25-wave2-triage,FINDINGS,2026-08-25-day-one}.md`;
`docs/entity-store/research/lean-toolchain-mechanization-notes.md`;
`.staging/explore/{state-of-play,spine-design-inputs,concrete-spine-feasibility}.md`;
`.staging/explore/{implementation-approach-notes,concrete-absorb-path}.md` (§§0/B/C.5/E and
§§4/5 respectively). **Source read for verification, not narrative:**
`formal/entity-store/README.md` and `formal/entity-store/E2/*.lean` (the proved ledger was
checked against the source, not taken from prose); `docs/entity-store/dispatch/*.md`;
`experiments/{entity-store-extract,entity-store-generate}/README.md`.

**Receipt convention.** `[R]` ratified · `[P]` proposed / recommended, not ruled ·
`[S]` superseded by a later ruling · `[X-Fnn]` contradicted by wave 2, F-number cited ·
`[U]` under discussion, explicitly nothing ratified.

---

## 0. The one thing to read first

The corpus has **two distinct objects both called "the spine"**, and conflating them is
the fastest way to mis-plan wave 3.

1. **The theorem spine** — E1's T1–T13, carried into KICKOFF §5's F/S/D/V/K/A/ST table
   and then *superseded* by STORE-MODEL §6's M1–M19 + NEG-1/NEG-2 inventory. This is the
   entity store's spine, and it is what the stability stratification in §2 stratifies.
   Receipt: KICKOFF §2 "E1's theorem spine (T1–T13) … carry over intact"; STORE-MODEL §6.
2. **The spine *language*** — the v1 declarative JSON combiner over git-storable
   directories (`.staging/explore/spine-design-inputs.md` §3). KICKOFF §2 rules this
   **"Adjacent, not merged"**: "It is a language; E2 is a store. The store is a candidate
   substrate for the spine later, and the two must not blur into one scope." `[R]`

Everything in this report is about (1). Where (2) contributes it is as a *design input*
that was already absorbed into (1) — specifically the D1/D2/D3 discriminator ladder
(spine-design-inputs §2 → KICKOFF §4.2, L5, and ruling G3), and the scope-shape
reasoning (spine-design-inputs §4 → the decision that recursion lives inside one
addressed unit, KICKOFF L7).

A third, unrelated "spine" appears in `concrete-spine-feasibility.md`: that document is a
probe of **lambdaclass/concrete**'s Core IR as a *candidate carrier for a hash-chainable
language*, dated 2026-08-24, and its headline established fact is narrow —
"Concrete's Core IR (v4.28.0 source, 4-file closure, 1585 lines) is consumable at Lean
v4.33.1 with zero changes" (§2). Nothing downstream of it was ever taken into the entity
store; the carrier chosen was Schema Core, not Concrete's `CExpr` (KICKOFF §2: "E2 is O1
with the term language chosen: Schema Core instead of an untyped lambda calculus").
Treat that document as *closed prior art* for wave 3, with one live import noted in §1.2.

---

## 1. The recovered map — what the corpus already decided

### 1.1 The program spine: the ladder from theory to running code

The corpus already fixed a **five-rung ladder**, and each rung has an owning document.
This is the single most load-bearing recovered structure, because it is the answer to
"what is the engineering specification" (§3).

| Rung | Content | Owning document | Receipt | Status |
|---|---|---|---|---|
| **Theory** | seven case-study laws L1–L7; the carrier→encoding→address frame plus two maps beside it (store, names) | `KICKOFF.md` §1, §3 | KICKOFF §3 (L1…L7, each with where it was paid for) | `[R]` |
| **Model spec** | state, operations, invariants, theorem inventory M1–M19, joints A/B/C, Q-rulings, A-amendments | `STORE-MODEL.md` | STORE-MODEL §1 header: "this document owns the store itself — state, operations, invariants, and the theorem inventory" | `[R]` by grilling 2026-08-25 |
| **Committed data** | the Effect-variant → carrier disposition table, admission rules, minted-id register | `MAPPING.md` | MAPPING header: "the committed data the Stage 2 generator transcribes" | `[R]` G1–G8 |
| **Engineering spec** | claim ladder, IO whitelist, on-disk layout, PUT boundary, differential harness, SH-rulings | `STORE-SHELL.md` | PROCEDURE §7 registry row: "the executable-store specification … the shell's single authority" | `[R]` SH1–SH8 |
| **Mechanical status** | the extracted proved ledger, both sides | `LEDGER.md` (planned) | PROCEDURE §8; **file does not exist** (verified: `docs/entity-store/LEDGER.md` absent) | `[P]`, seat in flight (worktree 5) |

**The loop that moves work between rungs is itself ratified.** PROCEDURE.md §2 fixes six
phases (Ground → Refutation wave → Grill and amend → Pin and brief → Implementation wave
→ Adjudicate and integrate → Audit) and §1 names the epistemology explicitly:
"Lakatos's proofs-and-refutations made mechanical". `[R]` 2026-08-25.

Three cycle rules from PROCEDURE §3 constrain wave-3 planning directly:

- waves are operator-fired, with one standing exception — **"a falsification finding
  opens a grill immediately"** (relevant: six S1 faults are open);
- refutation and implementation waves may overlap, **but grill phases may not** —
  "at most one open docket, because rulings serialize through the operator";
- no push without the dual-host gate.

**Where the program sits** (KICKOFF §2, `[R]`): E2 is the charter's H2/L2 rung made
concrete; it *consolidates* E1 rather than competing with it; it consumes `formal/fips202`
as a Lake dependency; and "Sequencing is unchanged by this kickoff: A1/A2 remains the next
artifact unless the operator reorders" — ratified as R-8. **Flag:** the record of the last
two days shows the entity store consuming essentially all seat capacity; whether R-8 still
holds is an operator question this report cannot answer and does not.

### 1.2 The absorb path — what was decided to take, and what to fork on

`concrete-absorb-path.md` §4 splits into nine absorb items (A1–A9) and ten fork points
(D1–D10). The corpus has already *acted on* several without labelling them as absorbs;
recording the correspondence is the useful consolidation:

| Item | Corpus decision it became | Receipt | Status |
|---|---|---|---|
| **A2** — evidence classes that never collapse into a checkmark | the estate's C5 claim discipline and STORE-SHELL §1's **four-rung claim ladder** (rung 0 by construction / rung 1 tested / rung 2 proved / rung 3 research-grade) | STORE-SHELL §1; PROCEDURE §5 "no soundness word without its named judgment (estate C5)" | `[R]` |
| **A3** — file bugs against your own evidence machinery, in-tree, before fixing | `audit/FINDINGS.md` as an append-only F-numbered ledger with one-time disposition updates | PROCEDURE §6 | `[R]` |
| **A5** — eligibility as an explicit mechanical predicate | typed rejections everywhere with stable machine-readable reason codes | KICKOFF §10 agent-drivability rule 4 | `[R]` |
| **A8** — two ledgers, deliberately (facts vs evidence) | PROCEDURE §8's **two-sided** mechanical ledger: model side (axiom reports) and live-build side (G-S gates + harness) | PROCEDURE §8 | `[P]`, unbuilt |
| **A9** — gates that are themselves tested | the opaque/unsafe gate "validated negatively" by a deliberate `partial def` probe; F-43's repair "negatively validated (`IO.getEnv` in `main` now fails G-S3), then reverted" | KICKOFF §12 scaffold record; wave2-faults F-43 Repair | `[R]` in practice |
| **A4** — one extraction, many reports | *not adopted, and not refused* — no corpus decision found | — | corpus silent |
| **A6** — a reusable lemma layer with a fuel keystone | **structurally declined**: fuel is "derived from input length and absent from every public statement" (decode) and "no fuel anywhere in statements" (joint C) | STORE-MODEL §7 joint C; §9 decode-seat record | `[R]`, opposite direction |
| **D1** — binders as surface-name strings | **forked**: de Bruijn `var`/`mu` with a mandatory discriminator | KICKOFF §4.2 | `[R]` |
| **D2** — hand-rolled S-expression digest, truncated | **forked**: framed encoding, injectivity a proved obligation, 64-byte untruncated address | KICKOFF L2, §5; STORE-MODEL §2 | `[R]` |
| **D3** — "the subject is the body alone" | **absorbed as a lesson**: *what you hash defines what your evidence is about*; the corpus's answer is L3 ("never route carrier information around the encoder") | KICKOFF §3 L3 | `[R]` |
| **D8** — zero external proof libraries | **partially forked**: identity layer stays Mathlib-free; **R-16b** proposes a fenced Mathlib target for the projection/dynamics layers | KICKOFF §16 R-16b, "adopt" | `[P]`, not ruled |

One live import from `concrete-spine-feasibility.md` deserves carrying forward: its §3
observation that **provenance fields poison a content address** (`declSpan`,
`sourceFile`) and that Concrete's body-level nodes carry no spans. The entity store's
equivalent decision — annotations are excluded *by not existing in the carrier at all*,
so their exclusion is type-level and not a normalization pass to defend — is KICKOFF §4.3
final paragraph, `[R]`. That is the same lesson, taken one level stronger.

The nine-week absorb plan (`concrete-absorb-path.md` §5) is a **reading curriculum for a
human**, not a program plan. It has no dependency on anything in §2 or §3 below and
should not be scheduled against seat capacity.

### 1.3 Generation architecture — the decided shape of "generated vs hand-written"

KICKOFF §12 is the most operationally specific ratified section in the corpus, and it is
what the engineering spec's *build* looks like.

| # | Decision | Receipt | Status |
|---|---|---|---|
| P1 | **Committed-text generation**: extractor → `inventory.json` (committed) → generator → committed `.lean` files → `lake build` → axiom allowlist → opaque/unsafe scan → `leanchecker --fresh` on both hosts → `mise run gen` + `git diff --exit-code` | KICKOFF §12 | `[R]` |
| P1′ | The **alternative is disqualified by measurement**, not taste: reading inventory JSON at elaboration time left "a stale olean holding a now-false theorem while `lake build` and the clean-tree check stayed green" — Lake does not track non-`.lean` inputs | KICKOFF §12 | `[R]` |
| P2 | **Shape B is the correspondence gate**: generated type ascriptions per variant + a generated exhaustive tag match + a decided distinctness lemma + the generated serializer's match arms. Shape A (environment walk + `decide`) is kept only as a bootstrap/diagnostic tool | KICKOFF §12 | `[R]` |
| P3 | **Trust statement**: the extractor alone is trusted. "The generator is not trusted because everything it emits is checked" | KICKOFF §12 | `[R]` |
| P4 | Carrier shape: **mutual, monomorphic** (`SchemaCore`/`FieldList`/`SchemaList`) — nested `List (String × SchemaCore × Bool)` measured to refuse `deriving DecidableEq` and to break the `induction` tactic | KICKOFF §12, R-12 | `[R]` |
| P5 | **Never derive** `Repr`/`Ord`/`ToJson`/`FromJson`/`ToExpr` on the carrier; hand-generate mutual companions with `termination_by structural`. Rationale: `partial def` elaborates to an `opaque` constant and `#print axioms` reports **nothing** | KICKOFF §12 | `[R]`; standing estate gate |
| P6 | Tactic ladder by axiom cost: explicit terms/`injection`/`noConfusion` → `decide` → `simp` → `grind only […]` → hand proof; **bare `grind` banned in generated code** | KICKOFF §12 | `[R]` |
| P7 | Scaling walls: `Nat`-folds decide to ~150k nodes; `String`-encodes hit the heartbeat wall near **2,000 characters** — KATs compare byte lists / `Nat` measures, never whole strings | KICKOFF §12 | `[R]` |

**What P1–P3 imply about surfaces** (this is deliverable (3)'s core, stated as the corpus
already implies it, not as a new proposal):

- **Generated, never hand-edited:** the carrier enumeration, the tag map, the
  correspondence ascriptions, the framed serializer's per-variant match arms, the
  obligation ledger's per-variant rows, and fixtures. KICKOFF §12 names the emission set
  as `Schema/{Core,Correspondence,Encode,Obligations,Fixtures}.lean`.
- **Hand-written and trusted:** the extractor, and only the extractor.
- **Hand-written and untrusted-because-checked:** every proof, plus everything downstream
  of the carrier that is *not* a per-variant transcription — canonicalization policy,
  `Reachable`, the resolve layer, the shell.

**Verified gap between the ratified architecture and the tree.** KICKOFF §12's "first
three build steps" are (1) hand-written carrier, (2) `mise run gen` end-to-end on a small
inventory, (3) Shape B + the scan. Today: `formal/entity-store/E2/Core.lean` is
hand-written (README table), while `experiments/entity-store-generate/generated/` emits
only `Inventory.lean` + `Fixtures.lean` (verified by directory listing) — i.e. step 2 is
done *beside* the artifact, not *of* it. **The E2 carrier is not yet generated from the
inventory.** No fault number covers this; it is a recorded plan-vs-tree delta, not a
falsification. Companion gate: `experiments/entity-store-extract/README.md` records that
"TOOLS.md admission rows remain DRAFTS … awaiting the operator ruling (C4)", and KICKOFF
§12 requires an admission entry "before its output enters gated work" — so the extractor's
output is not yet admissible into gated work at all.

### 1.4 Deployment topology — status is *under discussion*, and one ratification

KICKOFF §15 carries an explicit header: **"UNDER DISCUSSION — nothing ratified"**.

| # | Item | Status | Receipt |
|---|---|---|---|
| — | Organizing principle: immutable plane (coordination-free) vs a mutable plane made arbitrarily small; "every topology question reduces to: where does the name plane live, and where do reads get denoted" | `[U]` | KICKOFF §15 |
| — | Rung ladder T-A (single node) → T-B (coordinator + seats) → T-C (hub + edges) → T-D (federation) | `[U]` | KICKOFF §15 |
| R-15a | Mediated-read policy / heat capture | `[U]` — three options tabled; sampling proposed for rejection ("an estimator is not a denotation") | KICKOFF §15 table |
| R-15b | Name-plane story at T-C | `[U]` — proposed staged: content-addressed name-map versions, map itself a store entity; CRDT deferred with trigger. Partly pre-empted by §17's naming-as-entities direction, which is `[R]` as *direction* | KICKOFF §15, §17 |
| R-15c | **git as v1 transport** | **`[R]` 2026-08-25** ("yeah git as transport") — two layers, never conflated: git addresses transport integrity, SHA3-512 addresses semantic identity | KICKOFF §15 |
| R-15d | Federation posture | `[U]` — "defer whole; never break D3" | KICKOFF §15 |

**Wave 2 attached two riders to the one ratified row.** F-37 `[X-F37]`: git's connectivity
and `fsck` cover git's own DAG; our reference edges live inside blob content git never
parses, so **git contributes zero to WF2/WF3** — with three named hazards (`core.autocrlf`
on binary pre-images, 128-hex filenames vs Windows `MAX_PATH`, checkout deleting objects
— "append-only is not a git property"), the dual-host ones flagged UNVERIFIED. And G8's
fence still stands independently: "R-15c makes no G1 claim until M19 is proved"
(STORE-MODEL §6 M19 row) — with M19 itself now refuted as worded (F-30).

Net: **deployment topology is the least-decided area in the corpus, and its one
ratified row is now the one carrying two open riders.** Nothing here is safe to develop
against.

### 1.5 Two ratified directions that are aspirations, not machinery

Recorded because the corpus itself flags them, and because day-one's lesson 3 was exactly
this failure mode ("Ratified aspiration outran the model"):

- **§16 dynamics synthesis** (cost carrier with a proved phase distinction; trace →
  provenance polynomial → valuation; demand-shaped heat; the universe frame; flagship
  theorem **T-B address–projection commutation**). Ratified as a *direction* with three
  landed surveys. Its two convergence aspirations — provenance merge and naming
  convergence — were **DEMOTED to pending-A-5** by ruling G5 (STORE-MODEL §7): "both die
  on array order-sensitivity today". `[S]` for the convergence claims; `[P]` for T-A/T-B/T-C.
- **§13 advanced-modeling lane** (ITrees). Verdict already recorded: **"v1 needs no
  coinduction"**, measured; the one transferring idea is guardedness, already an admission
  condition. Triggers are explicit — "ITree carrier in the store — **never on the current
  design**". `[R]` as a deferral with named triggers. **No wave-3 seat should touch this.**

---

## 2. Stability stratification

**Method.** The FROZEN tier below was not copied from prose. Each item was located in
`formal/entity-store/E2/*.lean`, its statement read, and its dependency on the objects
wave 2 attacked (`Reachable`, `canonS`/`canonV` equations, `refsS`, the shell boundary)
checked by reading the statement and proof. Then every open fault F-25…F-45 was checked
against it. Items are listed with their source location so the operator can re-verify
cheaply.

### Tier FROZEN — safe to develop against today

Criterion: proved, in the merged tree, at an allowlist-clean axiom report, and **named by
no open fault** except where the fault *confirms* it.

| Item | Where | Statement shape (verified) | Why no open fault touches it |
|---|---|---|---|
| **M4a** (both kinds) | `E2/Decode.lean:929` `M4a_value`, `:937` `M4a_schema` | `decodeValue (encValue v) = some v`; same for schemas — unconditional, fuel absent from the statement | Attacked with adversarial values and survived (triage, "What survived attack"). No F-number names it. |
| **encode injectivity F/S, F/V** | `E2/Faithful.lean:85` `encSchema_inj`, `:91` `encValue_inj` | `encSchema s₁ = encSchema s₂ → s₁ = s₂` (`E2/Obligations.lean:50,54`) | F-29 *uses* `encSchema_inj` as its own receipt — a confirmation, not a refutation |
| **M5 / Direction A** | `E2/Obligations.lean:35` `directionA` | `canonS s₁ = canonS s₂ → addressS H s₁ = addressS H s₂`; proof is `simp [addressS, preimageS, h]` | **A-6-robust**: canon appears only inside the hypothesis, so changing `canonS`'s equations (Q13/A-6) leaves statement and proof untouched. Verified by reading the proof. |
| **M7 kind separation (pre-image half)** | `E2/Obligations.lean:42` `kind_separation` | `preimageS s ≠ preimageE a v` | No fault. *Caveat carried from the spec:* only the pre-image half is proved; the lifted "at most one kind under `hInj`" half is not. |
| **M12 / M12E dedup** | `E2/Model.lean:344`, `:352` | `canonS s₁ = canonS s₂ → putSchema … = putSchema …`; entity analogue on `canonV` | Same hypothesis-shaped robustness as M5; survived wave-2 attack. F-28 attacks `canonV` *idempotence*, a different obligation. |
| **M13 frame / append-only** | `E2/Model.lean:359` | over `StoreMap`/`putPre` — **`Reachable` does not appear** | Structurally immune to every family-1/2 amendment |
| **M14 get-after-put (fresh half)** | `E2/Model.lean:372` | `σ.find (H b) = none → (putPre H σ b).find (H b) = some b` — no `Reachable` | Same |
| **M15 fresh half** | `E2/Faithful.lean:35`, statement `E2/Resolve.lean:83` | hypothesis-free; no `Reachable` | Same; family survived attack |
| **`tags_distinct`** | `E2/Correspondence.lean:52` | Shape B distinctness, zero axioms, 13 variants after A-4 | No fault |
| **M8 WF1** | `E2/Model.lean:335` | `Reachable H env σ → ∀ d b, σ.find d = some b → H b = d` | No fault asserts WF1 is false. **Two riders, both real** — see below |
| **M15 both faithful halves** | `E2/Faithful.lean:51`, `:67` | over `Reachable`; `H`-injectivity only ever a hypothesis; entity half returns `canonV v` | Attacked and survived (triage). Reachable rider below |
| **NEG-2** | `E2/Reject.lean:53` | `¬ Reachable H env [dangling singleton]`, for every `H` and env | Strengthening `Reachable` only shrinks it, so the negation is preserved. Reachable rider below |

**Rider A — the `Reachable` arity rider (applies to M8, M15's two faithful halves,
NEG-2).** `Reachable` is `E2/Model.lean:306-312` with constructors `empty`/`putS`/`putE`.
Both wave-2 repair families change its premises: family 1 (F-25) must change
`putE`'s `Conforms env s v` on the raw carrier, and family 2 (F-33/F-32) adds `WFS` and
acyclicity obligations at the boundary that the model may mirror. **These are
constructor-arity changes**, and M8's proof pattern-matches positionally
(`| putS _ _ _ ih`, `| putE _ _ _ _ ih`, `E2/Model.lean:340-341`). The *statements* stay
true (adding premises shrinks `Reachable`, and `Reachable` sits in hypothesis position in
all four); the *proofs* need a mechanical re-check. Precedent that this is cheap: A-3
strengthened `Reachable` and "every seat proof rebuilds green over the strengthened
`Reachable`" (STORE-MODEL §7). **Consequence: these four are safe to develop *against*,
but not safe to develop *concurrently with* a family-1 or family-2 seat** — see §4.

**Rider B — the shell bridge is broken, not the theorems.** F-33 establishes that the
shell's `check` does not establish `Reachable`. That does not falsify M8/M9/M15/NEG-2; it
falsifies STORE-SHELL §4/SH5's claim that opening a directory "ESTABLISHES reachability".
Anyone developing on the *disk* side must treat every `Reachable`-quantified theorem as
currently unbridged.

**Also frozen, and not a theorem: the ratified frame.** Safe to develop against because
no wave-2 fault touches them: L1–L7 (KICKOFF §3); the store-the-pre-image-verbatim rule
(L6); joint A's finite-map + inductive `Reachable` shape; joint B's carrier-side `refs`;
joint C's total-on-guarded `Conforms` with no fuel in statements (STORE-MODEL §7); the
mutual-monomorphic carrier shape (R-12); the committed-text generation pipeline P1 and
the Shape B gate P2 (KICKOFF §12); the four-rung claim ladder (STORE-SHELL §1); the
one-seat-one-new-module law and the additive-vs-arity rule (PROCEDURE §4, day-one §6.4).

### Tier AMENDING — touched by an open fault family; blocked on a named ruling

| Item | Fault family | Blocking ruling needed |
|---|---|---|
| **M17 / M17′ typed reachability** | family 1 — F-25 (false as specced), F-36 (Q12's price is real under `oneOf`) | *Does `Conforms` become the judgment on canonical forms only?* (triage §"Recommended order", 2) |
| **Bridge pins B1–B4** (`E2/Bridge.lean:59,64,69,75`) | family 1 — F-23, F-24 | the same ruling; the triage records that it "also retires bridge pin B4" |
| **S1 obligations** (`ObligationCanonIdempotent`, `ObligationCanonVIdempotent`, `E2/Obligations.lean:62,73`) | family 1 — F-12 (already conditional), F-26, F-28 | A-6 must ship **with** F-26's repair `dupFreeS (.lit v) := dupFreeV v`; and F-28 asks whether value-plane duplicate-freedom becomes a `Reachable` clause after all |
| **Amendment A-6** (Q13, `canonS` recurses into `lit`) | blocked by F-26 | ruled YES already; the *implementation* is blocked, not the ruling |
| **M9 WF2** (`E2/Closure.lean:233`, statement `E2/Resolve.lean:112`) | F-35 — `.lit (.vaddr a)` hides an address from `refsS` | *does the model gain a clause, or does MAPPING rule 1 stay load-bearing for a model invariant?* (F-35 calls it "the fourth model-accepts/boundary-rejects instance") |
| **M19 transport adequacy** | F-30 — refuted four ways while still prose | pin the repaired form (re-base onto candidate stores / `Admissible`) before anything is built on it |
| **M10 acyclicity** | F-31 — **survived** for arbitrary `H`, but is still owed | pin with address-node vocabulary + `ObligationM10_rank` |
| **M11 commutation** | F-15 / F-38 | pin up to `find`-extensionality **with** `reachable_keys_nodup` |
| **STORE-SHELL §4/§5, SH5** | family 2 — F-33, F-40, F-41, F-32 | one boundary amendment: `WFS` as a named check + decidable acyclicity, with §4/§5 narrowed to what `check` actually establishes |
| **STORE-SHELL §3 IO whitelist, §5 `check` verdict** | F-42 | whitelist amendment (a file-type primitive) **or** an explicit non-totality caveat in §7 |
| **STORE-SHELL §1 rung 1 / names plane** | family 3 — F-39 | *which plane is authoritative* for names |
| **MAPPING admission rules 1 and 2** | F-27, F-34, F-35 | the admission rulings; F-34 shows rule 2 names 2 of ≥10 families, one unbounded |
| **STORE-SHELL §9 delivery record** | F-45 | bookkeeping: "nine committed scripts" → ten |

### Tier OPEN — needs a ruling before any development

| # | Ruling | Why nothing can be built first | Receipt |
|---|---|---|---|
| **R-4 / G7** | the check-id allowlist **shape** | G7 defers it to a dedicated session; report B's relabelling hole means "neither bare ids nor (id, payload) pairs close it". Three faults route here: F-5, F-24 (checkSem must be `canonV`-invariant), F-29 (check payloads address-significant, uncanonicalized) | KICKOFF §18 G7; FINDINGS F-5/F-24/F-29 |
| **spelling families** | which spelling is admissible, for ≥10 families | F-27 + F-34; MAPPING rule 2 as written covers two cases. `.mu d X` for binder-free `X` is an **unbounded** family — one address per discriminator string | wave2-faults S3 |
| **names plane** | model/disk authority; case-folding | F-39 is a *silent wrong answer with exit 0 on both sides* — rank 3 of 21 | triage rank 3 |
| **deployment topology** | R-15a, R-15b, R-15d | §15 header: nothing ratified. R-15c is ratified but fenced by M19 (itself refuted) and ridered by F-37 | KICKOFF §15; §18 G8 |
| **R-1** | program name and context home | `E2` is a working label; STORE-MODEL §7 holds all vocabulary "as working labels until R-1 rules the context home"; a rename is a declared transformation touching every file | STORE-MODEL §7; `formal/entity-store/README.md` |
| **R-2** | v1 constructor freeze | rider: "R-2 now explicitly waits on A-4" — A-4 landed, so R-2 is unblocked *in principle*, but F-27/F-34 reopen exactly what a freeze would fix | KICKOFF §18 riders |
| **R-3** | mutual recursion in v1 | deferred; report C: SCC-as-unit is not expressible while `.ref` carries no component index | KICKOFF §18 riders |
| **R-7** | raw-bytes kind | still open from KICKOFF §7's ratification record | KICKOFF §7 |
| **R-16a / R-16b** | cost ground (DAG nodes vs tree paths); Mathlib stratification | both `[P]` "adopt"/"rule before the dynamics contract freezes", neither ruled | KICKOFF §16 |
| **extractor admission** | TOOLS.md rows for the extractor and `lean4-tree-sitter` | KICKOFF §12: admission entry required "before its output enters gated work"; extract README records the rows as DRAFTS | `experiments/entity-store-extract/README.md` |

---

## 3. What the engineering specification should BE

The corpus has already answered this, and the answer is **not** "write a new document".

**(a) The engineering specification is `STORE-SHELL.md`.** PROCEDURE §7's registry gives
it exactly that role and that authority — "the executable-store specification: claim
ladder, IO whitelist, layout, boundary, harness, SH-rulings, delivery records … the
shell's single authority", with the update rule "delivery records append to §9; rung or
whitelist changes only by ruling". There is no other candidate in the registry, and
PROCEDURE §7 states that "a document not in this registry (or the estate's own law) has
no standing in gated work" — so **minting a new spec document is itself a procedure
amendment** (PROCEDURE §9: propose in an audit §6, operator ratifies).

**(b) Its relation to STORE-MODEL is already fixed, and it is unusual — worth stating
precisely because it is the program's strongest engineering idea.** STORE-SHELL §1:
"This spec implements STORE-MODEL.md and never restates it", and rung 0 is
**refinement by construction of sharing**: "every state transition it performs IS a call
to the proved functions … The implementation cannot drift from the model in any pure
respect, because the pure respects are the same compiled code." That is explicitly *not*
a theorem — "an architectural invariant, checked by the import graph" — and the check was
subsequently mechanized as G-S4 (no core shadowing). The corollary the corpus draws
itself: the *only* things the engineering spec has to specify are the things the model
deliberately does not own — IO, layout, the PUT boundary, the harness, and the trust
posture for `Std`.

**(c) The claim ladder is the spec's grammar.** Rungs 0–3 (STORE-SHELL §1) are what keeps
"the engineering spec" from silently inheriting the model's gates. Rung 3's naming rule is
the sharpest instance: "Until a theorem exists, the word 'bisimulation' appears only
inside this rung's name."

**(d) What KICKOFF §12 implies about generated vs hand-written surfaces** (§1.3 above,
restated as spec consequences):

1. The spec's **data plane is MAPPING.md** — a committed table the generator transcribes.
   So a disposition change is a *spec* change with a mechanical downstream, not a code edit.
2. The spec's **carrier surface should be generated**, and the acceptance criterion for
   that is already written: `mise run gen` + `git diff --exit-code`, plus Shape B. Today
   it is not (verified §1.3), so the engineering spec currently has a hand-written surface
   where its own architecture calls for a generated one.
3. The spec's **trust statement is one line and already written**: the extractor alone.
   Everything else is checked by kernel, gate, or diff.
4. The spec's **status surface should be extracted, not written** — PROCEDURE §8's
   `LEDGER.md`, "REGENERATED only; hand edits are violations the diff catches". Until it
   lands, "the README tables in `formal/entity-store` and the spec §9 delivery records are
   the interim hand ledger, flagged as such" (PROCEDURE §8). F-45 is a live instance of
   exactly the drift that motivates it.

**(e) The one shape the corpus has *not* decided.** There is no document that owns the
*Effect-facing service surface* — KICKOFF §4.6 sense 1, "the store's API surface is an
Effect program … Engineering, never a model claim". STORE-SHELL §8 SH1 rules "Lean only,
v1 included; a TypeScript client speaks the protocol later, never the disk format", which
fixes the *boundary* but not the surface. If wave 3 wants an engineering spec for that
client, it has no home in the registry and needs one.

**(f) A recorded methodological input the corpus already paid for.**
`implementation-approach-notes.md` §E audited the previous artifact's roadmap against the
lean-skill pipeline and found three structural gaps that the entity-store program has
since closed, which is worth recording as *validated* rather than re-deriving:
`model-invariants` (the representation decision — closed here by R-12, measured);
`strategy` Pass B, a **signature freeze before proof work** (closed here by PROCEDURE §3
"Pin and brief" + statement pins); and assurance provisioning (closed by the gate set).
Its §C.5 finding is still load-bearing and still correct: **the axiom gate must be an
allowlist, not a denylist**, because from Lean v4.29 `bv_decide` mints a fresh per-goal
axiom and a denylist grepping `ofReduceBool`/`trustCompiler` "will silently pass
`bv_decide` proofs on any toolchain ≥ 4.29". The estate's gate is an allowlist
(`[propext, Classical.choice, Quot.sound]`), so this is satisfied — and it is the reason
`Std.Tactic.BVDecide` is marked **"Not admissible without a TOOLS.md-grade ruling"** in
the toolchain survey (`research/lean-toolchain-mechanization-notes.md` Tier 4).

**(g) Mechanization surface available to the spec, already surveyed, none adopted.** The
toolchain notes are explicit that "nothing here is adopted by appearing here". The
recommended sequence, `[P]`: ledger v2 as a Lean exe using `Lean.collectAxioms` +
`Lean.Data.Json` (retiring the text-parsing seam the v1 ledger brief is forced to police
with strict parsing); then `lake test` (harness) and `lake lint` (gates) as configured
drivers; then `--profile` proof-cost telemetry as a sidecar. One caution the notes state
and this report endorses repeating: `lake pack`/`cache` is **"Never for the dual-host
gate"** — shipping oleans would hollow out the independent-rebuild requirement.

---

## 4. Sequencing — what can run as concurrent seats, what serializes

The governing law is ratified and mechanical (day-one §6.4, PROCEDURE §4): **"additive
definitions are safe during dispatch; arity or name changes to anything a seat imports are
serialization points."** Applied to the open repair set:

### Serialization points (exclusive windows, one at a time, between waves)

1. **Family 1 — the typing plane** (F-25, F-26, F-28, F-36, + A-6). Changes
   `Reachable.putE`'s premise (**arity**), `canonS`'s equations (A-6), and `dupFreeS`'s
   `lit` clause. Everything that pattern-matches `Reachable` or unfolds `canonS` is in its
   blast radius: M8's induction (`E2/Model.lean:340-341`), M15's faithful halves, NEG-2,
   the four bridge pins. **This is the single largest serialization point outstanding**,
   and the triage already ranks it second only to the (completed) gate repair.
2. **Family 2 — the boundary amendment** (F-33, F-40, F-41, F-32). If the repair adds
   model-side clauses (a `WFS`-at-boundary mirror, or acyclicity), it touches `Reachable`
   too → **it collides with family 1 and must not run concurrently with it**. If the
   repair is confined to `experiments/entity-store-shell` (narrowing STORE-SHELL §4/§5 to
   what `check` establishes, plus adding the checks), it is file-disjoint from the model
   tree and can run as a seat. **The ruling determines which, so the ruling must precede
   the dispatch.** This is the sharpest sequencing question in the set.
3. **A-5 / float / any further carrier constructor** — constructor-arity by definition;
   G4's precedent is explicit ("A-4 schedules with A-3 as one serialization point after
   the in-flight seat wave merges"). None is currently ruled; none should be dispatched
   into a wave.
4. **R-1 (the rename)** — renames every `E2` name a seat imports. Maximal blast radius,
   zero proof content. Cheapest when the tree is quiet.

### Concurrent-safe seats (file-disjoint, additive only)

- **F-39 names plane** (family 3) — once ruled. Touches the shell's name handling and the
  harness; disjoint from the model tree. *Rider:* it needs a model answer first, per
  STORE-SHELL §6's own law ("every shell behavior question gets a model answer first").
- **F-42 verdict totality / whitelist amendment** — shell-local; needs a whitelist ruling
  but no model change.
- **Pin seats: M10 (F-31), M11-commutation (F-38), M19 restatement (F-30).** All three are
  *statement* work in the coordinator's hands plus additive `Prop`s in new modules —
  exactly the "additive definitions in shared modules are safe during flight" case
  (PROCEDURE §4). M10 and M11-comm have proposed forms already supplied by refuter 3.
  **Caution:** M19's repair re-bases onto a new `Admissible` structure — if that structure
  lands in a shared module as a new definition it is additive and safe; if it *changes*
  `Reachable`, it joins serialization point 1.
- **The ledger extractor (worktree 5)** — new directory, no model contact.
- **F-45 bookkeeping** — one-line doc fixes; PROCEDURE §7 allows a delivery-record append.
- **The generation lane** (carrier generation per §1.3) — new-directory work today, but
  the moment it becomes the *source* of `E2/Core.lean` it is a serialization point, since
  it replaces a file every seat imports.

### Recommended reading of the triage's own order, unchanged

The triage already gives the repair order (F-43 done → family 1 → family 2 → family 3 →
pins + S3 admission rulings). Nothing in this consolidation contradicts it. The one thing
this report adds is the *concurrency* overlay: **family 1 and family 2 must not overlap if
family 2's repair reaches the model**, and the grill-serialization rule (PROCEDURE §3.2,
"at most one open docket") means their two rulings cannot be taken in one docket either
unless deliberately composed.

---

## 5. Residual uncertainty — what this report did not establish

1. **I did not build anything.** The FROZEN tier's "proved" claims are read from
   `E2/*.lean` and the README/spec ledgers; I did not run `lake build`, the gate, or an
   axiom report. The constant counts (1,372 in STORE-MODEL §9; 1,427 in the README) differ
   and I did not reconcile them — a reconciliation belongs to the ledger extractor.
2. **The `Reachable`-rider re-proof cost is an argument, not a measurement.** I read the
   proofs and the A-3 precedent; I did not attempt a rebuild over an amended `Reachable`.
3. **Wave-2 evidence was read at second hand.** I read the fault register and the triage,
   not the probes in `.staging/scouts/2026-08-25-wave2/`. Where a fault is
   "kernel, reverified", I record the register's word for it.
4. **R-8 sequencing (A1/A2 next) is recorded, not assessed.** Whether it still holds after
   two days of entity-store work is an operator question.
5. **`state-of-play.md` contributed almost nothing to this lane.** It is a literature note
   on Unison's cycle-hashing defect and the verified-hashing landscape, not a program state
   assessment; its own §5.2/§8 flag substantial unswept areas. Its one durable input here
   is negative and already absorbed: no Lean 4 library for α-respecting hashing,
   hash-consing, or content-addressed identity exists to build on (§5.1(vii)), and mathlib
   has no cryptographic hash function — which is why `formal/fips202` is load-bearing.
6. **No corpus decision was found on absorb item A4** ("one extraction, many reports") and
   none on an Effect-facing service-surface spec (§3(e)). Both are recorded as gaps, not
   as recommendations.
