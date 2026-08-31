# CORE-ABSTRACTIONS-PLAN — Opus 5 hard review

Status: REVIEW ARTIFACT, pre-grade. Decision 28's protocol ("one Fable
writes the plan, Opus 5 hard-reviews it — plans cited, proofs sketched
and decomposed, hard parts named. These are core abstractions, no
compromise").

Target: `.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md`
(1182 lines, uncommitted). Reviewed 2026-08-29 against the working
tree at main `43b59e01`, plus `merge/daemon-spine` `0aeeefd7` and
`merge/cas-word` `ad44b40b`. Every finding below was opened in the
cited source with the reviewer's own eyes; no claim is relayed.

---

## VERDICT — **COMMIT-WITH-AMENDMENTS**

The spine is right and stays. The lane decomposition matches the
docket, the proof-grill triage is real triage (three lanes correctly
refuse a Lean carrier and say why), and — the highest-stakes check —
**all four §1 discharge claims verify in the code. No ratified work is
un-landed by this plan's strikeouts.**

Twenty-two amendments follow, each mechanical. Two are blocking (A1,
A2): the floor §0 describes does not exist, and one ratified ruling is
overridden inside a slice without being surfaced. The rest are
citation repairs, one non-elaborating `#guard`, and the two mandate
sections the planner never received.

---

## AXIS 1 — CITATIONS

### 1.1 The four discharge claims: ALL VERIFIED

The strikeouts are safe. Detail, because a wrong strikeout would
un-land ratified work:

| Docket entry | Plan's evidence | Reviewer's finding |
|---|---|---|
| Proof-grill **F** (FRAME-1) | `runPFrom_frame_sound` :1944, `runP_frame_sound` :1965, `runPFrom_append_done` :1887, `PProg.answersFrom_prefix` :1868, `runP_absent_sound` :1839; `698b2f18` | **VERIFIED, all five, exact lines.** `Cas/Lang/Fragments.lean:52-53` now reads "`runP_frame_sound` (the frame condition closed for every run, refusing ones included — FRAME-1)" and the theorem exists. The docket's flagged over-claim site (`Fragments.lean:186-189`) no longer carries it — that region is now the interop-contract header. No `sorry`, no `axiom` anywhere in `Defun.lean`. |
| Proof-grill **E** (HD-1/HD-2) | `PLine.HashDetermined` :1480, `PLine.hashDetermined` :1496, counter-witness :2185-2199 | **VERIFIED.** The closing `example` of `Defun.lean` (docstring :2185, term :2190-2199) is one program over `AgentSig`, one word, one `H`, two oracles, two answer histories, closed `by decide`. Exactly as described. |
| Tier-1 **4**'s lowering half | `EmitProg.lean` :22-30 header, `lowerTree` :55, `treeProg` :85, `progStmts` :110, `treeProgram` :129-131; `659a909d` | **VERIFIED, every line exact.** `659a909d` is "land the Lift → PProg decoder (P1) and close the round trip (P3)". |
| Tier-1 **5** CANON-1 implementation | `System.lean:89-100`, `canonServices` :220, `isCanonServices` :226, :232, `tools/EmitLayers.lean:178-233`, S-o-M :38 | **VERIFIED IN SUBSTANCE**, two line errors — see 1.2 #1 and #2. The ruling text is at `System.lean:89-100` exactly; `canonServices` is at :220; `S-o-M.md:38` says "CANON-1 guard live". |

Also verified and worth recording, because the plan leans on them:
`vectors/shared-chunk.json` carries **5 bindings and 4 distinct
addresses** (counted); `merge/cas-word:Cas/Lang/Worded.lean` carries
exactly the **seven** named `since` laws (:105, :114, :123, :133,
:152, :161, :178); `AnnotationSubject` is the five-arm union at
`Annotation.lean:127-132` with `program` at :130, landed by
`e4b5d743`; the ten CLI verb line numbers (`commands.ts` :185, :324,
:379, :410, :602, :671, :713, :762, :1040, :1119) are **all ten
exact**; the Effect annotation-bag line list (`SchemaRepresentation.ts`
:147, :160, :178, :329, :364, :447, :460; `pruneAnnotations` :927;
`annotations: AnnotationsSchema` :953-986, :1031, :1048) is **exact,
every number**, and the plan's conclusion — the bag is a cross-cutting
optional key, not a decl field — is correct.

Roughly ninety file:line and ruling-ID citations were opened. The
great majority are exact, several unusually so (`Ast.lean:66-161`
bounds the constructor list to the line; `Fragments.lean:195-238`
bounds the L-A interop contract to the line; `POLICE ask 9` correctly
notes the struck line moved from `SM.md:574` to `:608`). What follows
is the complete miscite list.

### 1.2 Miscites — every one found

**Substantive (the citation does not support the claim):**

1. **`plan:90` — `tools/EmitLayers.lean:178-233` "guards every
   authored list at elaboration."** The `#guard` is at **:235-237**;
   :178-233 is the CANON-1 prose section and `authoredServices`. The
   cited range stops two lines short of the guard it names. Same
   error at `plan:399` (Lane E verified base, ":229-233") and
   `plan:816` (§3 E2 corollary, ":229-233"). Also: the plan says
   "`#guard`s" plural — there is exactly **one**.
2. **`plan:126` and `plan:973` — `SM.md:60-62` for "Effect's own
   codegen route for recursion is `Schema.suspend`."** The sentence is
   at **`SM.md:56-58`**, and it describes **`toCodeDocument`** (the
   Representation → TypeScript code generator). `plan:973` compounds
   it: HARD PART 2 attributes the same cite to **`fromRepresentation`
   handles `Schema.suspend` natively**. The source says nothing about
   `fromRepresentation`'s live handling of recursion. HARD PART 2's
   "v1's honest line" — that live validation of recursive schemas is
   the TS door's — currently rests on a citation that does not carry
   it. Either find the real evidence in the pinned source or downgrade
   the line to PENDING-VERIFICATION.
3. **`plan:132` — the Lane A slice-1 probe is aimed at the wrong
   region.** `Suspend`/`Reference`/`references` are not "the node
   interfaces around :329-460". In the pinned rc.111 source they are
   at `SchemaRepresentation.ts` **:158-170 (`Suspend`), :171-178
   (`Reference`), :482 and :493 (`Document.references` /
   `MultiDocument`), :984-985 (`SuspendSchema`), :1067 and :1074 (the
   persisted `Reference` tag), :1101 and :1108 (`references:
   ReferencesSchema`)**. :329-460 is where `Element` and `FilterGroup`
   carry `annotations?` — Lane B1's evidence, not Lane A's.
4. **`plan:1058` — the `ledgers.ts` quotation is not verbatim.** The
   plan quotes "a ledger says what it says, and this verb never
   re-derives, never invents" (:13-16). `bin/cli/ledgers.ts:11-14`
   reads: "Nothing here re-derives a count, re-judges a row, or
   restates a proof: a ledger says what it says, and this verb's job
   is to say it out loud." The second clause is invented. Under C7 a
   quoted estate line is quoted, not paraphrased inside quotation
   marks.
5. **`plan:306-309` — the KVS refusal's reason is misstated.** The
   plan would record "`KeyValueStore` carries no atomic
   compare-and-set" as the reason the KVS backend refuses the
   RootStore role. Two live sources give a *different* reason:
   `src/cas/KvsBackend.ts:10-13` — "`KeyValueStore` carries no key
   enumeration — no listing, no scan, no prefix walk — so
   `RootStore.list` cannot be written over it at all"; and
   `Cas/Architecture.lean:129-131` — "because a key-value store
   carries no key enumeration — publishing over it does not compile."
   `KvsBackend.ts:14-15` separately notes that compare-and-set
   publishing "is a compare-and-set question of its own and is not
   answered here." Recording the CAS reason as *the* reason
   contradicts both files. Record **both** reasons, in the order the
   code gives them.

**Line-offset errors (claim stands, number is wrong):**

6. `plan:90` — `isCanonServices` is at `EmitLayer.lean:225`, not :226
   (:226 is its body).
7. `plan:90` — ":232, the authoring composition normalizes" points at
   `private def residual`'s body (:231-232), which is the **residual
   fold**, not the authoring composition. The authoring
   canonicalization lives in `tools/EmitLayers.lean`.
8. `plan:336` — proof-grill **C** is at `docket:175-176`, not
   :176-177.
9. `plan:469` — proof-grill **D** is at `docket:177`. `docket:178` is
   grill **E**.
10. `plan:519` (Lane H rulings) — proof-grill **A** is at
    `docket:172-173`, not :171-172 (:171 is the batch preamble).
11. `plan:599`, `plan:97`, `plan:1020` — a systematic **one-line
    offset** through every `BUILD-SEMANTICS.md` §8 citation. Asks 1-3
    are at **:278-280** (cited :277-279); the quotation "I reasoned
    the third from mise's source, I did not test it" is ask 2 at
    **:279** (cited :278 twice).
12. `plan:607` — `BUILD-SEMANTICS` asks 6,7,8 are at **:283-285**
    (cited :282-284); the 77%-of-`check:cas` figure is at **:285**
    (cited :284).
13. `plan:475` — `Word.wf` is at `Cas/IR/Word.lean:150`, not :149.
    (`wfFrom_append` :152 is exact.)
14. `plan:353` — the tail corollary `envelope_decodeProg_encodeProg`
    is at `Defun.lean:2114`, not :2116.
15. `plan:405`/`plan:415` — docket item 7 is at `docket:84-90`, not
    :83-91; its "register as obligation" demand is at :89-90, not
    :90-91.
16. `plan:497` — the shared-chunk registry row is at
    `tools/EmitPrograms.lean:54-56`, not :56-58.
17. `plan:611` — `SM.md` ruling 3 (Integer semantics) starts at
    **:203**, not :204.
18. `plan:526` — `vocabularyWords` is `bin/cli/vocabulary.ts:23-39`
    (:40 is blank).

**Duplicate ruling-ID, unflagged:** `SCHEMA-MATERIALIZATION.md` has
**two item 15s** — the deriving-handler member spelling (:227-233) and
THE FLOAT CEILING (:391-401). The plan silently disambiguates by
calling the first "15a" (`plan:613`). That collision is exactly what
POLICE ask 3 (`LANGUAGE-POLICE.md:291`) commissions a prefix for. Lane
J row 12 rules the prefix; add the renumbering of this collision as
that row's first concrete instance.

---

## AXIS 2 — PROOF SKETCHES

Read against the declarations each statement cites. Overall: the
statements are well-formed and the decompositions are honest; three
defects.

### 2.1 The Nodup question — the plan's HARD PART 5 is CORRECT, and the review can close it

The plan flags "CANON-1's permutation theorem is false without Nodup
keys." **Confirmed by construction.** `EmitLayer.lean:202-206`:

```
private def dedup : List ServiceRef → List ServiceRef
  | [] => []
  | s :: rest => let tail := dedup rest; if hasKey tail s then tail else s :: tail
```

`dedup` keeps the **last** occurrence per key. So for
`xs = [⟨k,r₁⟩, ⟨k,r₂⟩]` and its permutation `ys = [⟨k,r₂⟩, ⟨k,r₁⟩]`,
`canonServices xs = [⟨k,r₂⟩] ≠ [⟨k,r₁⟩] = canonServices ys`. E2 is
false without the premise. The plan is right.

**The plan then leaves the implementation question open** (`plan:1013`:
"whether it should is a one-line ruling the hard review should flag to
the operator"). The review closes it, because the code already
answers: `isCanonServices xs := xs.map (·.key) == (canonServices
xs).map (·.key)` (`EmitLayer.lean:225-226`). A duplicate key makes
`canonServices` shorter than `xs`, so the key lists differ and the
authoring `#guard` (`tools/EmitLayers.lean:235-237`) goes **red**.

**AMENDMENT (mechanical):** Lane E states which, in one clause —
*require Nodup; the function already dedups and the authoring door
already enforces Nodup keys via `isCanonServices`, so E2's premise is
discharged at every site the estate has. No dedup is added at the
`SystemNode` constructor; the residual gap is arbitrary callers, which
`tools/EmitLayers.lean:214-217` already records as the guard's honest
scope and decision 2 leaves open.*

### 2.2 §3 B's `#guard` DOES NOT ELABORATE

`plan:705-706` states, as statement B's content:

```
#guard ∀ t, (TagClass.of t = .registered) = (Ty.ofTag t).isSome
```

"(decidable over 256 cases)". **This is false in this toolchain.**
Probed against `library/cas` at `leanprover/lean4:v4.33.1`, no
Mathlib:

```
example : Decidable (∀ t : UInt8, t = t) := by infer_instance
-- error: failed to synthesize instance of type class
--   Decidable (∀ (t : UInt8), t = t)
```

There is no `Fintype`/bounded-forall instance for `UInt8` in core, and
no precedent for one in the repo — the estate's idiom is `#guard
decide (…)` over an explicit list (`Manifest.lean:131`,
`Admission.lean:115`, `Sorts.lean`).

**AMENDMENT:** restate B's agreement guard over an explicit
enumeration, e.g.
`#guard ((List.range 256).map (UInt8.ofNat ·)).all fun t => decide (…)`,
or land the `Decidable` instance as a named sub-obligation of the
slice. As written the slice's only stated guard is unelaborable.

### 2.3 `tag_trichotomy`'s partition does not match the door it claims to govern

`plan:700-711` defines `TagClass.of` off the grammar manifest: ratified
row → `.registered`; held `.reserved` row → `.refused`; no row →
`.working`. It then claims the emitted class table is what
`src/internal/kindTags.ts:38`'s `ReservedKindTags` is **derived
from**, byte-gated.

Read the carriers:

- `src/cas/generated/grammar/kindTags.ts:111` —
  `GrammarKindTags = [1, 8, 9, 10, 11, 12, 13, 14, 15, 71, 83]`, and
  **zero rows carry `reserved: true`** (the generated header:
  "A RESERVED row is a code point the registry holds outside `Ty`;
  none is today").
- `src/internal/kindTags.ts:36-42` — `ReservedKindTags =
  GrammarKindTags ∪ {HistoryKindTag 0x48, WitnessKindTag 0x57}`, the
  two replay tags added **by hand**, explicitly because "the replay
  plane carries no registry row."

So today the `.refused` arm is **empty**, and `0x48`/`0x57` — which
`Cas.value` refuses (`src/cas/Value.ts:394`) — classify **`working`**
under `TagClass.of`. Lane F slice 4's working-tag register would
`#guard` them `working`, telling the estate two tags are free that the
value door throws on. That reproduces the BROKEN-SILENT class the
docket commissions this statement to close.

**AMENDMENT:** the classifier's domain is the **door**, not the
manifest alone. Give `TagClass.of` a third input — the library-owned
non-registry set (`HistoryKindTag`, `WitnessKindTag`) — and state the
agreement obligation against `ReservedKindTags` itself:
`ReservedKindTags = {t | TagClass.of t ≠ .working}`. That is the gate
that cannot drift; the manifest-only version cannot even be stated
against the hand half.

### 2.4 §3 C1's WF lemmas are OWED, not "present-or-cheap"

HARD PART 9 (`plan:1031`) hedges that `tableNode`'s WF lemma is
"assumed present-or-cheap … PENDING-VERIFICATION at slice time." The
review discharges it: **neither lemma exists.**

`Defun.lean:871` carries `encodeProg_wf : Word.wf (encodeProg H p) =
true` — that is `Word.wf`, the *store admission* predicate (references
resolve at declared kinds, acyclicity), a different judgment from
`Node.WF`, the byte-bound field predicate `encodeNode_injOn`
quantifies over (`Cas/Core/Node.lean:47`). Grep over the whole module
finds no `Node.WF` fact about `encodeLine l` or `tableNode H p`.

**AMENDMENT:** §3 C1's decomposition names **two owed lemmas**, not
one, marked OWED rather than PENDING:
`encodeLine_wf : l.WF → Node.WF (encodeLine l)` (should be near-trivial
— `PLine.WF` at `Defun.lean:189` says it was designed "matching
`Node.WF`'s" bounds) and `tableNode_wf : (∀ l ∈ p, l.WF) → p.length <
2^32 → Node.WF (tableNode H p)`. C2 needs the first as well. Otherwise
the batch's stated decomposition assumes a lemma that does not exist —
the exact defect §3's own house acceptance forbids.

### 2.5 What checks out

- **C1/C2/C3.** Statements well-formed over the cited carriers.
  `Function.Injective`, `List.Perm`, `List.Nodup`, `List.mergeSort`
  and the `mergeSort_of_pairwise` family are all core-available and
  already in repo use (`Cas/Values/Canonicalize.lean:92-126`,
  `Cas/Grammar/Tree.lean:325-463`). The C2 chain
  (`hInj` → `encodeNode_injOn` → `encodeLine` shape at :578 →
  `readLine_exact` :764 / `decodeLine_encodeLine` :635) closes.
  Falsifiers are real: a constant `H` genuinely collapses C1, and the
  estate already exhibits the style at `Defun.lean:1015-1053`.
- **Lane D slice 5 is byte-safe, as claimed.** `contAddressOf p`
  (`tools/EmitPrograms.lean:100-103`) is literally
  `hexS (sha256Addr (encodeNode (tableNode sha256Addr p))).val`, which
  is `hexS (progAddr sha256Addr p).val` definitionally. The rename
  moves no emitted byte.
- **D1/D2.** The `toStore` witness (`Word.lean:201`, `find` :56) and
  the `wf_take` decomposition (`wfFrom_append` :152) are both correct
  and three lines each, as stated.
- **§3 A's triage is honest, and its own weakness is admitted.** One
  reinforcement: `only_init_creates` as stated is a theorem **about
  the verb table**, not about the shipped TypeScript — with `step` a
  fold over rows that *declare* themselves roots-preserving, the
  statement carries no information about `put`'s implementation, which
  is where the phantom store lived. HARD PART 3 half-says this; make
  it explicit and require **one differential fixture per verb row**
  (not merely a totality `#guard`) tying each declared effect to the
  shipped verb. Also note that `bin/cli/store.ts:4-5` names **three**
  resolution sources (`--store`, `CAS_STORE`, walk-up) while
  `locateStore` has the two branches the plan models — the model is
  adequate only if it states that `CAS_STORE` folds into `explicit`
  through config. Say so in the statement's preamble.
- **§3 G's refusal row is correctly placed** (`S-o-M.md:92` is inside
  the "L0 — paper only" section, which begins at :89 — the plan's
  label is right).

---

## AXIS 3 — HARD PARTS THE PLAN DOES NOT NAME

### 3.1 BLOCKING — §0's floor does not exist. All three seats are MERGE-WITH-FIXES.

`plan:66` records only "the CLI naming seat … and rescue `dd54bc5f`"
as in-review. The estate's own session record,
`.staging/sessions/2026-08-29-the-full-push.md:33-35`, says otherwise
for **every** seat:

- **`merge/cas-word`** (`plan:47`, presented as a landable floor):
  "Both lenses MERGE-WITH-FIXES; consolidated fix pass RUNNING.
  Required: F1 torn-tail-newline lie, **F2 cross-process wedge**, F3
  swallowed diagnostics + F4-F9 + law L1-L5 … Lean touched →
  `check:cas` mandatory."
- **`merge/daemon-spine`** (`plan:39`, likewise): "Law lens DONE
  (MERGE-WITH-FIXES); CORRECTNESS LENS RUNNING at blackout. **FIX PASS
  NOT YET DISPATCHED.**"

Consequences the plan inherits and does not name:

(a) **Lane G's "Must not touch: the `since` laws (landed, reviewed)"**
(`plan:499`) is wrong on its face — the seat carrying them is under a
running fix pass with nine required fixes, and F2 is a **cross-process
wedge** in exactly the log this lane theorem-izes. `WordLog.ts:165-169`
argues the mark is safe because `append` is one
`INSERT … SELECT COALESCE(MAX(seq),-1)+1` statement "under the same
write lock"; that is a within-database argument, and the seat's own
review found a cross-process defect anyway. Lane G's theorems (`D1`,
`D2`) are unaffected — they are about the Lean `Word`, not the
persisted log — but the lane's **slice 1 reconciliation and its "must
not touch" line must both be re-scoped to post-fix-pass.**

(b) **The whole "post-merge" block of §6 starts later than drawn.**
Lanes D, G, H, I and Lane J row 17 gate on merges that gate on fix
passes that were still running at blackout.

**AMENDMENT:** rewrite §0 as three rows — seat, branch, *review state
and outstanding fix list* — and re-title §6's block "post-fix-pass,
post-merge". This is bookkeeping, not re-planning, but it is the one
place where a downstream agent could start a lane on a floor that does
not exist.

### 3.2 BLOCKING — Lane I overrides a ratified ruling inside a slice

`docket:102-104`, ratified whole by decision 28 ("every recommendation
… is ruled as written"), commissions: "**one Lean inductive**,
projected to TS CasError + cas-http status table, R11 byte gate on the
mirror."

`plan:563-565` rules the opposite: "**do NOT collapse the planes into
one inductive** … a single sum type would be a new abstraction serving
no consumer (decision 2)."

The *engineering* judgment is defensible — `Cas.Lang.Refusal`
(`Interp.lean:28`), `IngestRefusal` (`Ingest.lean:86`), TS `CasError`
(`Node.ts:59-114`, seven tagged errors) and `WireRefusal`
(`Protocol.ts:283-293`) genuinely answer four different doors, and the
"unified register" substitute is the better build. But C2 is explicit:
divergence from operator intent is **surfaced, never resolved
unilaterally**. Lane F does this correctly — it refuses the `theorem`
arm and then names the refusal in HARD PART 6 as "a divergence to
surface, not resolve (C2)". Lane I does not.

**AMENDMENT:** add HARD PART 10 — *"Docket item 9 says one inductive;
this plan builds a register instead. The reasons are decision 2 and
four distinct doors. This is a divergence from ratified text and the
operator rules on it before Lane I starts."* One paragraph, same shape
as HARD PART 6.

### 3.3 HIGH — Lane F slice 1 breaks the value door, and the plan only prices addresses

`plan:436-438` prices the annotation-tag mint as an address question:
"propose keeping `0x41` … so no stored test fixture moves." It does
not price **admission**.

The generated registry's own header says: "`Cas.value` refuses every
tag listed here … **Reserved or ratified, a row is refused
identically**." So putting `0x41` (or ratifying `0x58`) into
`manifestV0` — reserved or not — makes `ReservedKindTags` contain it,
and `src/cas/Value.ts:394` starts **throwing** on it. Two live call
sites die:

- `library/effects/test/SchemaAnnotation.test.ts:47-48` —
  `Cas.value({ kindTag: 0x41, … })`.
- `library/effects/src/cas/Exchanges.ts:30-39` — `KindTag = 0x58`,
  whose docstring says in so many words that it is "a WORKING tag,
  **deliberately absent** from `ReservedKindTags` … which is what lets
  `Cas.value` accept it."

Ratifying the tag is precisely the act that revokes that permission.

**AMENDMENT:** Lane F slice 1 states the projection-door consequence
alongside the address consequence, and names the migration: either the
annotation and exchange mirrors stop going through `Cas.value` and get
first-class library constructors, or the mint is deferred. This is the
"one degree more forced" that `SM.md:262-278` describes, and it is a
bigger slice than the plan's "one versioning event" framing implies.

### 3.4 HIGH — the word-registry "ghost" is not a ghost

`plan:476-479` and HARD PART 7 (`plan:1017-1019`): "c7's competing
artifact ('bindings/next over bindingSchema') **was not located in any
tracked file** — it appears to be advice-thread material… If the merge
surfaces no second spelling, the reconciliation is a no-op beyond the
theorems."

It is located, in three tracked files:

- `library/cas/tools/EmitWire.lean:34` — `bindingSchema` is a
  **registered, byte-gated** wire row.
- `library/effects/src/cas/generated/ConformanceVectorSchema.ts:28`
  and `:39` — the generated spelling, `{address, node}`, with
  `word: Schema.Array(bindingSchema)`.
- `.staging/paper-notes/11-api-contract.md:462` — the competitor, in
  words: "`bindings` reuses the **existing** `bindingSchema` —
  `{ address, node }`".

So the reconciliation is real and its content is sharp: a history row
carrying the **full binding** (`{address, node}`) versus a **receipt**
(`{address, at, seq, size, tag}`, `merge/cas-word:WordLogSchema.ts`).
The plan's own `D1` docstring clause is exactly the license for
choosing the receipt.

**AMENDMENT:** delete the "may be a ghost" hedge from HARD PART 7 and
from Lane G's verified base; replace with the located citation and one
line — *"the competitor is `bindingSchema` reuse
(`11-api-contract.md:462`); seat 3's receipt wins, and `D1` is why: a
receipt may carry less than a binding because the word carries more
than the store."* Lane G's scope grows by one slice (record the
superseded proposal), not by a lane.

### 3.5 HIGH — decisions 31, 32 and 33 landed on main and the plan predates all three

`plan:45` — "**main = `5e9d8ad3`** (decisions 28-30 landed)." Main is
`43b59e01`. Since `5e9d8ad3`: `4ff5fb82` (decision 31), `1f53b5f8`
(32-33), `666d2f2d` (33 correction), `3ffb5f56`, `43b59e01`.
`docs/SPECS.md` now runs to 460 lines.

Two consequences beyond Axis 4:

(a) **`plan:57`'s merge instruction is now too narrow.** "whoever
merges verifies `docs/SPECS.md:385-417` intact afterwards" — the range
is **:385-460** now, and `README.md` also moved.

(b) **Lane I's and Lane J row 17's floor moves under decision 32,
which the plan never mentions.** The daemon fix-pass brief
(`sessions/2026-08-29-the-full-push.md:38-48`) spells it out:
`/projections` is RELEASED and kept (`http.ts:190` `projectionsPath`,
:591 the server — it is already on the branch); **`docs/lab-core/
SERVING.md` is `git mv`'d to `library/effects/SERVING.md`** and
promoted to Category 1; and **PROFILE-CAS-HTTP-0 gains an additive §14
co-tenancy clause — a versioning event** enumerating `/mcp`,
`/metrics`, `/projections`. Lane I reads `Protocol.ts`'s status table;
Lane J row 17 points at `SERVING.md:148` at a path that will not
exist.

**AMENDMENT:** (i) §0 states main = `43b59e01` and lists decisions
31-33; (ii) `plan:57`'s verify range becomes `:385-460`; (iii) Lane J
row 17's pointer becomes `library/effects/SERVING.md` with a note that
the move is the daemon fix pass's slice 2; (iv) Lane I's Edges line
gains "and after PROFILE-CAS-HTTP-0 §14 lands — the co-tenancy clause
is a versioning event on the plane this lane mirrors."

### 3.6 MEDIUM — Lane H collides with the daemon fix pass on the vocabulary register

The daemon fix-pass brief, item (4): "**F2: VOCABULARY.md rows for the
daemon's everyday words (daemon, plane, heartbeat, stall, origin…)**
via the same-act precedent, and fix `:49` 'in flight' to per-plane
truth."

Lane H slice 3 builds `everyday_closure` as a differential gate
extending `test/Cli.test.ts` over `bin/cli/vocabulary.ts:23-39`. Both
efforts write the same two files (`VOCABULARY.md` and its gated hand
copy) and both change the word count the gate asserts. `plan:534`'s
"Must not touch: verb surfaces (no new verbs)" does not cover it.

**AMENDMENT:** Lane H's Edges gains the daemon fix pass as a
predecessor for the register-gate slice, and its acceptance criterion
becomes "the closure gate is written against the post-fix-pass
register, not today's fifteen rows."

### 3.7 MEDIUM — Lane F's working-tag enumeration is incomplete on its face

`plan:452-454` enumerates the register as "0x41 annotation suite, 0x58
exchange, replay tags per `src/internal/kindTags.ts:20-38`". The
estate uses at least one more: `bin/cli/commands.ts:455-456` says
"`0x54` and `0x58` are in live use with no row anywhere", and
`src/cas/Annotations.ts:97` is `SystemKindTag = 0x54`. The register is
meant to be *emitted from the classifier*, so it would catch this —
but the plan's own enumeration is short, and a short enumeration in a
plan is how a slice ships short.

**AMENDMENT:** add `0x54` (system) to the enumeration, and state the
acceptance criterion as "the register is emitted, never enumerated by
hand — the list here is illustrative and the gate is the authority."

### 3.8 LOW — two more unnamed edges

- **The `.reserved` machinery is *manifest* machinery.** Lane F slice
  1 calls the mint "NOT a grammar sort (decision 23)". Correct as to
  `Ty`. But the row still lands in `Cas.Grammar.manifestV0`, which
  moves `manifest.json`, `REGISTRY.md`, `kindTags.ts` and
  `ReservedKindTags` in one act — four byte gates, not the "emitgrammar
  /emitgate/schemas/addresses" pair the lane's Gates line implies. Say
  four.
- **Lane E's theorems have no stated home, and the home is forced.**
  `dedup` and `hasKey` are `private def` in
  `Cas/Backend/EmitLayer.lean` (:199, :202). E1 and E2 must unfold
  them, so they land **in that file** — or `dedup`/`hasKey` get
  de-privatized, which is a public-surface change and a `surface`
  ledger delta. Name the home; it is a one-line addition and it
  changes which byte gate the lane declares.

---

## AXIS 4 — MANDATE COMPLETENESS (decision 31(b), 31(d))

Both are **ABSENT**. The plan carries neither, and the record shows
why: decision 31 landed in `4ff5fb82`, after the planner's cited floor
`5e9d8ad3`. `docs/SPECS.md:418-431` is the text; the plan contains
zero occurrences of "expressiveness", "horizontal", "decision 31", or
"/projections".

### 4.1 Decision 31(b) — ALGEBRA EXPRESSIVENESS + HORIZONTAL EFFORTS

`SPECS.md:423-425`: "(b) algebra expressiveness joins the plan — how
the algebra grows MORE expressive, how the effects abstractions' power
is SHOWN, the horizontal efforts named."

§5 is not this section and cannot be edited into it: §5 answers
decision 30 explicitly "from what EXISTS" (`plan:1044`), the opposite
of *how the algebra grows more expressive*.

**AMENDMENT — add a new §5 (renumber the present §5 to §6, §6 to §7),
titled "ALGEBRA EXPRESSIVENESS AND THE HORIZONTAL EFFORTS (decision
31(b))", with exactly three subsections:**

1. **How the algebra grows more expressive — the two axes, each
   priced.**
   - *Vertical (rungs).* `L-A → L-S → L-P`. The carrier is designed
     and owed (`SProg`, `Fragments.lean:106-140`); the embeddings are
     named (`L-A ↪ L-S`, `L-S ↪ L-P`, :143-149); the first consumer is
     named (`agentStep`, :150-155, ruling P7); the price is stated
     (`RunParams` grows additively **plus a `manifestVersion` bump,
     bumped only by ruling**, :156-161). SPEC-2 rides this and only
     this (§3 G).
   - *Horizontal (signatures).* Growth by summing signatures, not by
     minting sorts: `CasSig`, `RootSig` (`Roots.lean:29-40`),
     `LlmSig`/`AgentSig` (`Ops.lean`), `WordSig` (`Worded.lean`, on
     the cas-word branch), composed by `⊕ₛ` (`Roots.lean:43`). The
     price is arm-additive and the sort registry never moves —
     decision 23's stillness is what makes this axis cheap and the
     vertical axis expensive. State that trade explicitly; it is the
     answer to "how the algebra grows."
2. **How the power is SHOWN — the exhibits, each with its falsifier.**
   Written as §5-of-today writes conquests, but about the *algebra*
   rather than the product: the pre-execution envelope
   (`PProg.envelope` + `runP_frame_sound`, `Defun.lean:1965`); the
   hash-determination boundary as a *matched pair* (`HD-1` at :1480,
   `HD-2`'s two-oracle witness at :2190) — the estate's sharpest
   demonstration that the algebra knows where its own laws stop;
   `ObsEq`'s three run corollaries; the cross-host run gate
   (`S-o-M.md:26`). Each exhibit names the claim it would refute.
3. **The horizontal efforts, NAMED.** The cross-lane efforts no single
   lane owns, each given an owner-lane or marked unowned:
   the **register plane** (Lanes F + I + H); the **receipts plane**
   (Lane G + the daemon's log stream, `SERVING.md:200`); the
   **projection/paperwork plane** (new Lane P, below); **OXC
   ingestion** (Lane B2 → decision 5's Great Hoovering); and decision
   31's own siblings — **(a) agent-streaming integrations**, **(c) the
   auth orientation audit**, **(e) WASM canvas** — each of which is
   currently **unowned by this plan** and must say so.

### 4.2 Decision 31(d) — PLAIN-LANGUAGE PROJECTIONS SEQUENCE FIRST

`SPECS.md:428-429`: "(d) PLAIN-LANGUAGE PROJECTIONS ARE PRIORITY, 'no
doubt' — **the lane sequences at the top of the plan**."

Today plain language appears only as **Lane J row 13**
(`plan:602`) — inside the lane the plan itself calls "deliberately
boring … bookkeeping with citations" — plus two incidental citations
(`plan:405`, `plan:443`) and Lane J row 20. In §6 it is nowhere: the
"now" block opens with Lane E.

**AMENDMENT — three mechanical edits:**

1. **Promote row 13 out of Lane J into a first-class `Lane P — plain-
   language projections`**, placed immediately after Lane A's heading
   block in §2 (or as the new first lane; position in §2 is
   cosmetic). Its content is row 13's ruling, decomposed into slices
   the way every other lane is:
   - slice 1: ratify the register plane (Ast / PProg / Envelope) and
     the attested-only-by-witness discipline (`PLAIN-LANGUAGE.md:167`,
     the `manifestV0` witness discipline extended);
   - slice 2: `emitregister` exe → `REGISTER.md`, byte-gated in
     `check:cas`, on the `emitgrammar`/`REGISTRY.md` precedent;
   - slice 3: PL-2's mode/order rows, riding the identity ruling;
   - slice 4: the E2/E5 prose registers (verdict notes, the
     literature) named as owed **with owners** — `S-o-M.md:103-105`
     already records them as the estate's answer to "plain language
     for all operations: … verdict notes and the literature NO".
   - Gates: `emitregister --check`; Must-not-touch: `Mcp.lean`, the
     `--json` shapes.
2. **§6's sequencing: `Lane P` goes at the head of the "now" block,
   above Lane E.** The `§1 strikeout commit` stays first (it is a
   bookkeeping precondition, not a lane). One line moves.
3. **Two existing dependencies re-point at Lane P**, which is the
   change that makes the promotion load-bearing rather than cosmetic:
   Lane F slice 2's refused `theorem` arm is blocked on "the
   literature emitter's kind … when E5/the literature slice defines
   it" (`plan:443`) — that slice is now Lane P slice 4, so HARD PART
   6's open refusal gains a dated owner; and Lane J row 20 (replay
   reactivation before Utterance) becomes Lane P's predecessor row
   rather than a propagation line.

Lane J row 13 becomes a one-line pointer to Lane P.

---

## THE AMENDMENT LIST — 22, all mechanical

**Blocking (do before the commit):**

- **A1** §0 rewritten: main = `43b59e01`; decisions 31-33 listed; all
  three seats shown with review state and outstanding fix lists
  (`sessions/2026-08-29-the-full-push.md:33-35`); §6's post-merge
  block re-titled "post-fix-pass, post-merge". [3.1, 3.5]
- **A2** HARD PART 10 added: Lane I's register-instead-of-inductive is
  a divergence from ratified `docket:102-104`, surfaced for the
  operator under C2, not resolved in-slice. [3.2]

**Mandate (decision 31, misrouted to the planner):**

- **A3** New §5 "Algebra expressiveness and the horizontal efforts",
  three subsections as specified in 4.1; present §5→§6, §6→§7.
- **A4** Lane P (plain-language projections) created from Lane J row
  13, four slices as specified in 4.2.
- **A5** §6 sequencing: Lane P at the head of the "now" block, above
  Lane E.
- **A6** Lane F HARD PART 6 and Lane J row 20 re-pointed at Lane P
  slice 4.

**Proof-sketch repairs:**

- **A7** Lane E states which: require Nodup; `canonServices` dedups
  and `isCanonServices` already enforces Nodup keys at the authoring
  door; no constructor-level dedup added. [2.1]
- **A8** §3 B's agreement guard restated over an explicit 256-tag
  enumeration — `Decidable (∀ t : UInt8, …)` does not synthesize in
  v4.33.1 without Mathlib (probed). [2.2]
- **A9** §3 B's classifier takes the library-owned non-registry set as
  a third input, and the stated obligation becomes
  `ReservedKindTags = {t | TagClass.of t ≠ .working}`. [2.3]
- **A10** §3 C1 names **two OWED lemmas** (`encodeLine_wf`,
  `tableNode_wf`); HARD PART 9's hedge is replaced by the finding that
  `encodeProg_wf` is `Word.wf`, a different judgment. [2.4]
- **A11** §3 A: state that `only_init_creates` is a theorem about the
  verb table, require one differential fixture per verb row, and note
  that `CAS_STORE` folds into `explicit` through config. [2.5]
- **A12** Lane E names its theorem home: inside
  `Cas/Backend/EmitLayer.lean` (`dedup`/`hasKey` are `private`), or
  declare the de-privatization as a `surface` ledger delta. [3.8]

**Hard-parts additions:**

- **A13** Lane F slice 1 prices the **projection door**: ratifying
  `0x41`/`0x58` makes `Cas.value` refuse them, breaking
  `test/SchemaAnnotation.test.ts:47-48` and `src/cas/Exchanges.ts:39`.
  Name the migration or defer the mint. [3.3]
- **A14** HARD PART 7 and Lane G's verified base: the competitor is
  located — `EmitWire.lean:34`, `ConformanceVectorSchema.ts:28,39`,
  `11-api-contract.md:462`. Delete the "ghost" hedge. [3.4]
- **A15** Lane G's "must not touch: the `since` laws (landed,
  reviewed)" re-scoped to post-fix-pass; F1/F2 named. [3.1a]
- **A16** Lane I Edges: also after PROFILE-CAS-HTTP-0 §14 (decision
  32(c), a versioning event on the plane Lane I mirrors). [3.5]
- **A17** Lane J row 17 points at `library/effects/SERVING.md` (the
  daemon fix pass's `git mv`), not `docs/lab-core/`. [3.5]
- **A18** Lane H Edges: the daemon fix pass's VOCABULARY.md rows
  precede the register-closure gate. [3.6]
- **A19** Lane F: add `0x54` to the working-tag enumeration; state
  that the register is emitted, never hand-enumerated. [3.7]
- **A20** Lane F Gates: four byte gates (manifest.json, REGISTRY.md,
  kindTags.ts, addresses), not two. [3.8]

**Citation repairs:**

- **A21** Fix the five substantive miscites (1.2 #1-#5): the
  `EmitLayers.lean` guard range (:235-237, one guard); `SM.md:56-58`
  for `toCodeDocument`'s suspend route, and drop or re-source HARD
  PART 2's `fromRepresentation` claim; Lane A slice 1's probe target
  (`:158-178, :482, :493, :984-985, :1067, :1074, :1101, :1108`); the
  `ledgers.ts` quotation, verbatim; the KVS reason (key enumeration
  first, compare-and-set second).
- **A22** Fix the thirteen line-offset errors (1.2 #6-#18), of which
  the `BUILD-SEMANTICS.md` §8 cluster is a single systematic +1; and
  add the `SM.md` duplicate-item-15 collision to Lane J row 12 as its
  first concrete instance.

---

## What this review does NOT ask changed

The ten-lane decomposition, the §1 strikeout-first slice, the three
Lean refusals in §3 (a modeled filesystem, a Lean model of the TS
renderers, the L-S carrier), the RESID-1 exclusion, HARD PART 4's
scout-only posture on Prop spelling, and §5's productization answer
all stand as written. The plan's method — statement triage first,
evidence as the license — is visibly practised, not merely cited: of
roughly ninety citations opened, the substantive errors number five,
and the four discharge claims that could have un-landed ratified work
are all true.
