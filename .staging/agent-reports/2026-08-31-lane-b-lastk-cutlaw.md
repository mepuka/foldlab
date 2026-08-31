# Lane B (S2) — the Lean minis: `Word.View.lastK` + the cut law

Agent: Lane B implementer (Opus 5), 2026-08-31
Package: `library/cas`, toolchain `leanprover/lean4:v4.33.1`, zero dependencies
Plan of record: [../frontend-trunk/TRUNK-PLAN.md](../frontend-trunk/TRUNK-PLAN.md) §3 Lane B, §6
Brief correction absorbed: [2026-08-31-trunk-plan-review.md](2026-08-31-trunk-plan-review.md) TP-14
Claim stamp: **G1 Model** — kernel-checked theorems over Lean definitions,
pinned toolchain, declared imports, axiom report in §6. Nothing here is a
claim about a TypeScript build, a host, a transport, or a wire.

STATUS: complete — `mise run --force check:cas` exit 0.

---

## 1. What landed, in one paragraph

`View.lastK t k` is the trunk's carrier, column-indexed per TP-14 and built
over `Word.column t`, with the generic list lemma `lastK_append` as the
reusable mint. Its rung is stated and PROVED rather than asserted: R0, the
merge is neither commutative nor idempotent, so the consumer's seq-guard is
a premise the algebra will not supply. The `ofQuery` question is answered
in the negative and mechanized: `View.lastK` is the library's **first
landed view that is not a `View.ofQuery` instance**, and the obstruction is
not the one the brief anticipated — see §3. The cut law lands as
`Cas/Values/Cut.lean` in the `CasValues` floor stratum with one proved
fixed-size cutter. The optional item was cheap and landed too: the Edge
occurrence counterexample is now Lean data with a computed `wf`.

Six files edited, one created. No commits. No emitter touched. No file
under `experiments/workbench/` or `library/effects/` touched.

Built ON the uncommitted tree, as ordered. Note for whoever commits:
`Cas/IR/Query.lean` and `Cas/IR/Reach.lean` are themselves still UNTRACKED
(`??`) — the query-layer lane's work, exactly as QUERY-ENGINE.md adoption 6
records under QE-A9 — so two of my three edited `IR/` modules land as part
of that lane's first commit rather than as a diff against it.

| file | change |
|---|---|
| `library/cas/Cas/IR/View.lean` | `lastK` + 9 list lemmas + `View.lastK`; module docstring |
| `library/cas/Cas/IR/Query.lean` | `View.lastK_not_ofQuery` + section; module docstring |
| `library/cas/Cas/IR/Reach.lean` | the shadowing witness mechanized (12 declarations) |
| `library/cas/Cas/Values/Cut.lean` | NEW — the cut law + one proved cutter |
| `library/cas/Cas/Values.lean` | import + front-page paragraph |
| `library/cas/lakefile.toml` | `Cas.Values.Cut` in the `CasValues` globs; two stale counts |
| `library/cas/Cas.lean` | `Values/` and `IR/` front-page bullets |

---

## 2. Every declaration and statement

### 2a. The generic mint — `Cas/IR/View.lean`

Stated over a bare `List α`; nothing in them is about bindings. The
precedent for a generic lemma living in the namespace of its consumer is
`Query.foldr_perm`, which is generic over two type variables in
`Cas.Word.Query`.

```
def     Cas.Word.lastK             : {α : Type} → Nat → List α → List α
                                     lastK k l = l.drop (l.length - k)
theorem lastK_length               : (lastK k l).length = min k l.length
theorem lastK_of_length_le         : l.length ≤ k → lastK k l = l
theorem lastK_append_eq            : lastK k (x ++ y)
                                       = lastK (k - y.length) x ++ lastK k y
theorem lastK_lastK                : j ≤ k → lastK j (lastK k l) = lastK j l
theorem lastK_idem                 : lastK k (lastK k l) = lastK k l
theorem lastK_left                 : lastK k (lastK k x ++ y) = lastK k (x ++ y)
theorem lastK_right                : lastK k (x ++ lastK k y) = lastK k (x ++ y)
theorem lastK_append               : lastK k (x ++ y)
                                       = lastK k (lastK k x ++ lastK k y)
theorem lastK_assoc                : lastK k (lastK k (x ++ y) ++ z)
                                       = lastK k (x ++ lastK k (y ++ z))
theorem lastK_not_comm             : x ≠ y →
                                       lastK 1 ([x] ++ [y]) ≠ lastK 1 ([y] ++ [x])
theorem lastK_not_idem             : lastK 2 ([x] ++ [x]) ≠ [x]
```

**`lastK_append_eq` is the master statement and the ONLY case split in the
file.** The brief expected the four-line split inside `lastK_append`; it
factors one step earlier, and the earlier statement is the more useful
mint. Read it as: the last `k` of a concatenation is `y`'s window plus
however much of `k` the right side left unfilled, taken from `x`'s end. The
split is `by_cases k ≤ y.length`; above the bound both left contributions
are `[]` by `List.drop_eq_nil_of_le`, below it the two indices agree by
`omega`. Everything after it is rewriting — `lastK_append` and
`lastK_assoc` are one `rw` line each off `lastK_left`/`lastK_right`.

`lastK` is spelled as a `drop`, not as a reversed `take`: that is what a
host does to a growing array, and it makes index arithmetic the only
obligation. (`(l.reverse.take k).reverse` gives the master lemma faster via
`List.take_append_eq_append_take` but buys a reversal the consumer does not
perform.)

### 2b. The view — `Cas/IR/View.lean`

```
def Cas.Word.View.lastK : Grammar.Ty → Nat → View Word
  run     := fun w => Word.lastK k (Word.column t w)
  merge   := fun a b => Word.lastK k (a ++ b)
  empty   := []
  run_nil   := List.drop_nil
  run_append := column_append ▸ lastK_append
```

COLUMN-INDEXED, as TP-14 required — the whole point of the correction, since
`prod (height t) (global lastK)` pairs a column's count with the store's
global tail and is wrong by construction. `run_append` is exactly
`column_append` (classification localizes over append) then `lastK_append`
(the window does too), which is the shape the brief specified.

`run_nil` is `List.drop_nil` and not `rfl`: `Word.column t []` reduces to
`[]`, but `lastK k []` is `List.drop (0 - k) []` and `Nat.sub 0 k` is stuck
on a variable `k`, so the `drop` never reaches its base case definitionally.
Small, worth recording — the next inhabitant with a subtracted index will
hit it.

**The rung, stated in the docstring and proved:** R0. `lastK_not_comm` and
`lastK_not_idem` are the two halves. Consequences spelled out at the
declaration: `run_perm` is unavailable (two devices in different admission
orders see different windows), `run_replay`/`run_redelivered` are
unavailable (a re-delivered page pushes receipts through the window twice),
and therefore **the consumer's fold must guard by `seq`** — cited to
TRUNK-PLAN §3 S3a. The docstring says the guard is where replay safety comes
from *because it does not come from here*.

### 2c. The `ofQuery` verdict — `Cas/IR/Query.lean`

```
theorem Cas.Word.View.lastK_not_ofQuery (t : Grammar.Ty) (k : Nat) :
    ¬ ∃ (A : Aggregator Word) (f : Binding → Word),
        View.ofQuery A f = View.lastK t k
```

plus `private def witBinding : Binding` (zero address, empty node — the
spelling five other modules in the package already use for fixtures).

### 2d. The cut law — `Cas/Values/Cut.lean` (NEW)

```
def     IsCutting            : (String → List String) → Prop
                               IsCutting cut ⇔ ∀ s, String.join (cut s) = s
theorem toList_foldl_append  : (l.foldl (· ++ ·) init).toList
                                 = init.toList ++ (l.map String.toList).flatten
theorem toList_join          : (String.join l).toList
                                 = (l.map String.toList).flatten
def     chunkChars           : Nat → List Char → List (List Char)
theorem flatten_chunkChars   : (chunkChars n l).flatten = l
def     chunkAt              : Nat → String → List String
theorem chunkAt_isCutting    : ∀ n, IsCutting (chunkAt n)
```

`String.join` is core's own `foldl (· ++ ·) ""`, so the law is spelled in
the estate's existing vocabulary rather than in a second one. The size is
`n+1` rather than `n` so positivity is a type fact: a zero-size cutter emits
infinitely many empty pieces and is not a cutter, and refusing it in the
type is cheaper than a precondition every theorem then carries.
`chunkChars` is well-founded on the list's length; `flatten_chunkChars` uses
the generated `chunkChars.induct` and is `List.take_append_drop` at every
step.

### 2e. The Edge counterexample, mechanized — `Cas/IR/Reach.lean` (optional item)

It was cheap, so it landed. Twelve declarations under a new
`## The refutation, mechanized` section:

```
def     shadowedA, shadowedB          : Addr32     (replicate 32 0 / 1)
theorem shadowedA_ne_shadowedB        : shadowedA ≠ shadowedB          (by decide)
def     shadowedFirst, shadowedMid, shadowedLate : Node
def     shadowedWord                  : Word       (three bindings, two addresses)
theorem shadowedWord_wf               : wf shadowedWord = true         (by decide)
def     edgeOccurrence                : Word → Addr32 → Addr32 → Prop
theorem occurrence_two_cycle          : ∃ w a b, wf w = true ∧ a ≠ b ∧
                                          edgeOccurrence w a b ∧ edgeOccurrence w b a
theorem edge_shadowed_ba              : Edge shadowedWord shadowedB shadowedA
theorem not_edge_shadowed_ab          : ¬ Edge shadowedWord shadowedA shadowedB
```

The query-layer report flagged this as a separate slice on the grounds that
"building two distinct `Addr32` values costs two 32-byte `Bytes` with length
proofs". It does not: `⟨List.replicate 32 0, by simp⟩` is the spelling seven
modules in this package already use, distinctness is `by decide`, and `wf
shadowedWord = true` is `by decide` on a closed three-binding word. **The
obstruction the earlier report predicted did not materialize.** The module
docstring's paragraph now ends "The witness is data, not prose", and the
prose argument is kept — a reader who doubts the cut can re-run it, and an
edit that quietly restores the occurrence reading fails a build instead of a
review.

`edgeOccurrence` is defined only to be refuted and nothing else in the
library uses it; the docstring says so at the declaration.

---

## 3. The `ofQuery` verdict — the interesting one

**Verdict: `View.lastK` is NOT expressible via `View.ofQuery`, and this is
the library's first landed example of a lawful `View` that is not a `Query`
instance.** It is a theorem (`View.lastK_not_ofQuery`), not a docstring
claim.

### The obstruction is not the one the brief predicted

The brief anticipated the refusal on the grounds that "lastK's merge
inspects list lengths, not single bindings" — i.e. that it is not a
pointwise fold. That reasoning does not survive contact: `Query.run A f w =
(w.map f).foldr A.merge A.empty` is pointwise in the GENERATOR only, and the
merge is free to inspect whatever it likes. `wordAgg`'s merge is `++`, which
already reads both lists.

The real obstruction is **unitality**, and it is sharper:

- `Aggregator α` demands a MONOID on the carrier: `assoc`, `empty_left`,
  `empty_right`.
- `View` demands only `run_nil` and `run_append`.
- `lastK`'s merge IS associative on all of `Word` — `lastK_assoc` proves it,
  and that is worth having, because it says the missing structure is the
  identity and not the bracketing.
- It has **no two-sided unit** on `Word`: `merge empty w = lastK k w`, which
  is `w` only when `w.length ≤ k`.

`View.ofQuery A f` puts `A.merge` and `A.empty` into the view's own fields,
so by the `View.ext` precedent an equality forces `A.merge = lastK k (·++·)`
and `A.empty = []`. Then `A.empty_left` says `lastK k w = w` for EVERY word,
and `k+1` copies of one binding refute it by length. Hence no aggregator,
for any generator — the statement is `¬∃`, deliberately, because the content
is that *nothing* in the query layer produces this view, not that some
candidate fails.

### What this is NOT — the honest boundary

It is not a hole. The monoid `lastK` does have lives on the **bounded
carrier** `{w : Word // w.length ≤ k}`, where `lastK` is the identity by
`lastK_of_length_le`; there `empty_left`, `empty_right` and `assoc` all
hold. `View Word` is that same object read at the unbounded type — the
forgetful image of a genuine query. Closing the gap in general would mean a
`Query` whose target carrier is not the view's carrier, which is a mint and
a ruling, not a lemma. Flagged in §7.

### Why this matters to the layer

Three views in, `View.ofQuery` looked total and the two structures read as
one demand written twice. The trunk's own carrier is where they come apart.
Both module docstrings now say so: `View.lean` has a "What `View.lastK`
shows about this layer" section, and `Query.lean` has "The floor is a
premise, not a formality" — the honest boundary of the claim *a query is one
function on bindings* is that it is a claim about views whose target really
is a monoid on the carrier they answer in.

---

## 4. The cut law — placement judgment, and the UTF-8 finding

### Placement: `Cas/Values/Cut.lean`, in the `CasValues` floor stratum

The brief said "read where String utilities live and follow". String
machinery in this package lives in `Cas/Values/` — `Json`, `Digits`,
`JsonParse`, `Markdown` — and that directory's membership test is written in
the tree and is **mechanical, not a matter of taste**: *a module belongs here
only if it compiles with no `import Cas.*` outside `Cas.Values`*
(`Cas/Values.lean`, "What belongs here"). `Cut.lean` imports nothing at all,
so it passes.

Rejected alternatives, and why:

- **`Cas/IR/`** — that stratum is the store WORD. The cut law is about a
  string, not about bindings; filing it there would be a second
  directory-disagrees-with-stratum defect of exactly the kind the package
  has spent a migration removing.
- **`Cas/Schema/` beside `Exchange.lean`** — nearest the consumer, but it
  would drag a pure String law into the `Cas` stratum for proximity, and the
  strata block's rule is "a new module lands in a stratum or it is refused".
- **`Cas/Values/Cut.lean` NOT in the `CasValues` globs** — this is the trap.
  `tools/Strata.lean`'s `libOf` falls back to "the longest library root that
  prefixes the module", so an unclaimed `Cas.Values.Cut` is claimed by the
  `Cas` remainder: a store-free String module filed in `Cas/Values/` but
  ranked in the `Cas` stratum. Worse, `Cas/Values.lean` is itself a
  `CasValues` member, so importing `Cut` from it would be a floor-purity
  violation the gate refuses.

So the module is added to the `CasValues` globs. That list is explicit
precisely so a new module is decided at the boundary rather than admitted by
a subtree glob, and this is the first exercise of that mechanism since the
migration. Three consequential edits followed: `Cas/Values.lean` imports it
and names it on the front page, `lakefile.toml` carries it in the globs
(with the block's "five"/"six" counts corrected to "six"/"seven"), and
`strata.META.json` regenerated — still `9 strata, 138 modules (111 walked),
1 violation — 1 known`, i.e. the known-misfile accounting did not move.

### UTF-8 honesty — and a real toolchain finding

**On `leanprover/lean4:v4.33.1` the house `String` is no longer
`structure String where data : List Char`.** It is:

```
structure String where
  toByteArray : ByteArray
  isValidUTF8 : toByteArray.IsValidUTF8
```

Two things follow, and both are stated in the module docstring:

1. **A `String → List String` cutter cannot split a codepoint. The type
   refuses to hold the fragment.** Codepoint safety here is a TYPE fact, not
   a theorem, and `chunkAt` inherits it for free — it chunks by codepoint
   count via `String.toList`/`String.ofList`.
2. **The hazard therefore lives one level down, at a seam this model does
   not describe.** A host ingest buffer works in BYTES. A cutter slicing a
   byte buffer at a fixed byte offset can land mid-codepoint; the fragments
   still satisfy the byte-level join — the answer is recovered verbatim, so
   T2's promise survives — while no individual fragment is a well-formed
   string. Anything reading a piece ALONE (a streaming render, a per-piece
   annotation, a search over run nodes) sees a broken character.

**So the streaming lane's real cutter owes one guarantee beyond
`IsCutting`: every cut falls on a codepoint boundary.** That is a decency
property of the PIECE, not of the join, and nothing below implies it. It is
carried as a prose note rather than a theorem because the byte seam has no
carrier in this library; when it gets one, that is the statement it owes.
This is a boundary-decency note, as briefed — not a theorem, and not
claimed as one.

### The consumer and the pairing, stated in the docstring

Consumer: the streaming lane, QUERY-ENGINE.md adoption 7 / ruling ask QE-4.
Paired host rule: the ingest buffer runs `suspend`, never `dropping` or
`sliding`. The docstring says why the pairing is the design and not two
facts — `IsCutting` is a property of the CUTTER and is powerless against a
lossy transport, so a dropping buffer falsifies the exchange node's promise
without the cutter ever being wrong. Protected claim: `Cas/Schema/
Exchange.lean`'s "the bytes are kept as spoken and are never normalized
here". What stays host discipline is named as staying: WHICH cuts are taken
— size, stall timeout, boundary heuristics, cadence.

---

## 5. Pass B — what changed before any proof was written

Per the `lean` skill's staged route (`lean-model-invariants` →
`lean-algebraic-systems` → Pass B freeze → `lean-llm-proof-loop` →
`lean-assurance-review`):

1. **The master lemma was hoisted out of `lastK_append`.** The brief located
   the four-line case split in `lastK_append`; reading the statement before
   proving showed it factors through `lastK_append_eq`, which is the
   statement worth naming. `lastK_append` then costs one `rw`.
2. **`lastK_assoc` was added.** Without it, "not a monoid" reads as a deeper
   failure than it is. Stating associativity separately makes the missing
   field exactly the identity, which is what §3's boundary rests on.
3. **The rung was promoted from docstring prose to two theorems.** The brief
   asked for a docstring statement; C5 wants a soundness word to link a
   judgment, and pattern 7 in the lean-design-patterns seed prefers
   decide-theorems over invisible guards. `lastK_not_comm`/`lastK_not_idem`
   cost four lines and earn ledger rows, axiom entries and bindability.
4. **The `ofQuery` refutation was restated as `¬∃`** rather than as a `≠`
   between two named values — the content is that nothing in the layer
   produces this view.
5. **The optional Edge item was re-scoped from "refuse if it fights" to
   "landed"** once the witness cost was measured at three `by decide`s.

No statement changed during proof work; no proof edit changed a statement.

---

## 6. Axiom report, per new declaration

Ceiling asked: `propext` / `Quot.sound`, no `Classical.choice`. Gate's own
clean set (`Walk.cleanAxioms`): `propext`, `Classical.choice`, `Quot.sound`.
`lake exe axioms` did not refuse.

| declaration | axioms |
|---|---|
| `Cas.Word.lastK` | *(none)* |
| `Cas.Word.lastK_length` | propext, Quot.sound |
| `Cas.Word.lastK_of_length_le` | propext, Quot.sound |
| `Cas.Word.lastK_append_eq` | propext, Quot.sound |
| `Cas.Word.lastK_lastK` | propext, Quot.sound |
| `Cas.Word.lastK_idem` | propext, Quot.sound |
| `Cas.Word.lastK_left` | propext, Quot.sound |
| `Cas.Word.lastK_right` | propext, Quot.sound |
| `Cas.Word.lastK_append` | propext, Quot.sound |
| `Cas.Word.lastK_assoc` | propext, Quot.sound |
| `Cas.Word.lastK_not_comm` | *(none)* |
| `Cas.Word.lastK_not_idem` | propext |
| `Cas.Word.View.lastK` | propext, Quot.sound |
| `Cas.Word.View.lastK_not_ofQuery` | propext, Quot.sound |
| `Cas.Values.Cut.IsCutting` | propext |
| `Cas.Values.Cut.chunkChars` | propext, Quot.sound |
| `Cas.Values.Cut.flatten_chunkChars` | propext, Quot.sound |
| `Cas.Values.Cut.toList_foldl_append` | propext, **Classical.choice**, Quot.sound |
| `Cas.Values.Cut.toList_join` | propext, **Classical.choice**, Quot.sound |
| `Cas.Values.Cut.chunkAt` | propext, **Classical.choice**, Quot.sound |
| `Cas.Values.Cut.chunkAt_isCutting` | propext, **Classical.choice**, Quot.sound |
| `Cas.Word.shadowedA` / `shadowedB` | propext |
| `Cas.Word.shadowedA_ne_shadowedB` | propext |
| `Cas.Word.shadowedFirst` | *(none)* |
| `Cas.Word.shadowedMid` / `shadowedLate` / `shadowedWord` | propext |
| `Cas.Word.shadowedWord_wf` | propext |
| `Cas.Word.edgeOccurrence` | *(none)* |
| `Cas.Word.occurrence_two_cycle` | propext |
| `Cas.Word.edge_shadowed_ba` | propext |
| `Cas.Word.not_edge_shadowed_ab` | propext |

**The four `Classical.choice` rows are forced by core, not by a spelling.**
Measured, not guessed:

```
'String.toList'  depends on axioms: [propext, Classical.choice, Quot.sound]
'String.foldl'   depends on axioms: [propext, Classical.choice, Quot.sound]
'String.length'  depends on axioms: [propext, Classical.choice, Quot.sound]
'String.append'  depends on axioms: [propext]
'String.join'    depends on axioms: [propext]
'String.ofList'  does not depend on any axioms
```

Every character-level view of a `ByteArray`-backed `String` on v4.33.1 goes
through choice, so ANY cutter that inspects characters inherits it. Lean-
patterns row 14 (`decide (a = b)` over `==`) does not apply — no `BEq`
instance is involved and no `decide` appears in this module. The split is
worth naming: **the LAW is clean (`IsCutting` is `propext` alone) and only
the reference cutter's traversal is not.** Everything in the `lastK` lane
and the Reach witness sits at or under the brief's stricter ceiling.

Doc coverage on the touched modules, from `surface.META.json`:
`Cas.IR.View` 18/23, `Cas.IR.Query` 37/42, `Cas.IR.Reach` 44/44,
`Cas.Values.Cut` 7/8. Every undocumented row is Lean-generated —
`View`'s five field projections (unchanged, matching the existing
house pattern) and `chunkChars.induct`, the functional-induction principle
the equation compiler emits.

Debt markers: **zero added.** The obligation ledger reads 85 obligations,
which is the pre-existing count; four bare `obligation` keyword hits my first
draft introduced were reworded out, since none of them was a debt of this
library (they described what a CONSUMER owes). `debts.META.json` is
unchanged at 27 docstring debts / 28 unbound rulings.

---

## 7. Gate tails

### `mise run --force check:cas` — **exit 0**

```
ok ../../experiments/workbench/src/generated/WordLogSchema.ts (1672 bytes) — 2 mirrors, the workbench's copy
ok ../../experiments/workbench/src/generated/kindTags.ts (3716 bytes) — 15 kind tags, the workbench's copy
ok ../../experiments/workbench/src/generated/grammar/names.json (13461 bytes) — 15 columns, 19 blocks, 26 fields, 14 edges — every name the grammar derives, the workbench's copy
ok meta/out/environment.META.json (47415 bytes) — 52 tasks, 23 exes, 8 pins (2 distinct)
ok meta/out/strata.META.json (34614 bytes) — 9 strata, 138 modules (111 walked), 1 violation(s) — 1 known
ok meta/out/surface.META.json (1104974 bytes) — 2533 declarations
ok meta/out/obligations.META.json (27977 bytes) — 85 obligations
ok meta/out/laws.META.json (9963 bytes) — 9 of 37 rulings bound, 28 unbound
```

60 `ok` lines total, no refusals. **S0's three workbench mirrors are
byte-identical** — I touched no emitter, and the gate confirms it.

Ledgers were regenerated through their emitters, never hand-edited:
`gen:strata`, `gen:cas-surface`, `gen:cas-obligations`, `gen:cas-laws`,
`gen:debts`, `gen:axioms`, `gen:env-ledger`, `gen:meta` (all `--force`).
Surface moved 2499 → 2533 declarations (+34); axioms 1244 → 1274 rows.

LEAF gates only, per TRUNK-PLAN §4. `check` and `check:ci` were NOT run:
both chain `git diff --exit-code` and the uncommitted tree reds them for
every lane. That is a stated constraint, not a skipped gate.

### `library/effects` — typecheck **exit 0**, vitest **red, and not mine**

```
$ tsc --noEmit && tsc -p tsconfig.test.json --noEmit
TYPECHECK_EXIT=0

Test Files  4 failed | 52 passed (56)
     Tests  16 failed | 446 passed (462)
```

Attribution, checked rather than assumed:

- **12 of 16** are `test/DaemonHistoryRoute.test.ts` R-1…R-12, failing
  `expected 400 to be 200`. That file is UNTRACKED (`?? library/effects/
  test/DaemonHistoryRoute.test.ts`) — it is Lane A's breaker battery, and it
  is red BY DESIGN: the castle-vs-attack law has the breaker land the
  failing battery before the implementer builds the route.
- **4 of 16** are wall-clock assertions that failed under contention with my
  concurrent Lean builds: `SchemaGuardednessCost` (2616 ms against a 1000 ms
  budget), `DaemonHttp` heartbeat (1 beat in a 4500 ms sleep, wanted 2),
  `DaemonHttp` replica lag (`now - mtime` came out −1), `ConformanceVectors`
  (5000 ms test timeout). **Re-run alone with nothing else running: all
  three files pass, 29/29, exit 0.** Flakes, confirmed by measurement.

Nothing in this lane can reach that package: `check:cas` proved every
generated TS mirror byte-identical, so the effects suite is reading exactly
the bytes it read before.

One caveat on the number itself: Lane A is editing `library/effects` LIVE
(`bin/cli/history.ts`, `SERVING.md`, `PROFILE-CAS-HTTP-0.md` and the daemon
were all modified in the working tree while this run was in progress), so
`16 failed / 446 passed / 462 total` is a reading of a moving tree, not a
baseline anyone should pin.

### `mise run --force check:workbench` — **exit 1, and not mine**

Fails at `bun run lint`, before typecheck. All 13 lint errors and all 60
typecheck errors (run separately, since lint aborts the chain) are in
`experiments/workbench/src/trunk/**` — `model.test.ts`, `placement.test.ts`,
`place.test.ts`, `fold.test.ts`, `fixtures/*`. That whole directory is
UNTRACKED (`?? experiments/workbench/src/trunk/`): it is Lane C's in-flight
S3a work. `src/generated/` — S0's mirrors, the thing this gate was named to
protect — is clean and byte-identical per `check:cas` above.

I touched no file under `experiments/workbench/`. **The gate is red on
arrival, not by my hand**, and I am reporting rather than repairing it: it
is another lane's tree.

---

## 8. What is NOT claimed (assurance review)

- Elaboration proves the stated propositions and nothing more. No statement
  here is about a TypeScript build, a host, a transport, or a wire; nothing
  crossed G1.
- `View.lastK` is proved a lawful `View`. It is NOT proved to be the
  carrier the workbench actually folds — that correspondence is Lane C's
  fast-check property (incremental-equals-fresh), and the Lean theorem
  licenses it without establishing it.
- The R0 rung says the algebra supplies no replay safety. It does NOT say
  the seq-guard is correct; the guard is host code and unproved here.
- `IsCutting` is a property of a CUTTER. It says nothing about a lossy
  transport, and nothing about whether a piece is meaningful alone — see the
  boundary-decency note in §4, which is prose and not a theorem.
- The codepoint-safety claim for `chunkAt` rests on a TOOLCHAIN fact (v4.33.1
  `String` carries a UTF-8 validity proof). It is a fact about this pinned
  toolchain, not a portable theorem, and would need restating if `String`'s
  carrier changes.
- `occurrence_two_cycle` refutes the occurrence reading on one admitted
  word. It does not re-prove `reach_acyclic` or `wf_edge_index`; those stand
  as they were, and the witness is the reason they are stated over `Edge`.

---

## 9. Grill flags

1. **The `ofQuery` gap is a real design question, not a defect.** `lastK`
   IS a monoid on `{w : Word // w.length ≤ k}`. Admitting bounded-carrier
   queries would need `Query` over a target carrier that is not the view's
   carrier, plus a forgetful map — a mint and a ruling. Recommendation:
   record it as a deferred growth, not as a hole. If the coordinator wants
   the bounded aggregator built, it is a small slice of its own.
2. **The four-line case split moved.** It lives in `lastK_append_eq`, not
   `lastK_append`. If TP-14's wording is meant to pin the shape, this is a
   deviation, and I think the deviation is the improvement.
3. **`Word.lastK` is generic over `List α` but sits in `namespace
   Cas.Word`.** Precedent is `Query.foldr_perm`. If the estate wants generic
   list machinery in a home of its own, this is the second occupant and the
   moment to decide — but a one-lemma module is exactly what the lakefile's
   "zero imports is not a stratum" block argues against.
4. **The cut law widens `CasValues`'s story** from "the substrate every
   address is computed over" to "value machinery, of which addressing is one
   use". The mechanical membership test admits it cleanly; the front page's
   PROSE self-description is now slightly narrower than its contents. Worth
   an operator glance.
5. **`Classical.choice` in the cut lane.** Forced by core (§6), not
   avoidable by spelling. If the ceiling is hard rather than aspirational,
   the only route is to state the law at `List Char` and give up on a
   `String`-typed cutter — which also gives up the codepoint-safety type
   fact, so I judged the trade badly weighted. Flagged for the ruling.
6. **`edgeOccurrence` is a definition that exists only to be refuted.** It
   adds a surface row for a relation nothing uses. The alternative is
   inlining the existential in `occurrence_two_cycle`'s statement, which
   makes the theorem unreadable. I chose readability; say the word and it
   inlines.
7. **The query-layer report's stated obstruction was wrong.** It deferred
   the Edge mechanization on `Addr32` construction cost; the construction is
   three lines using a spelling seven modules already carry. Worth noting in
   whatever ledger tracks that report's owed items, since the deferral is
   now discharged.
8. **Pre-existing staleness spotted, NOT fixed** (out of lane): `Cas.lean`'s
   `Values/` bullet still says `Canonicalize` and `Refs` are "imported here
   by name" with "the directory disagreeing with the stratum … carried as a
   debt row … which waits for the meta-home migration". Per `lakefile.toml`
   and `Cas/Values.lean`, both files MOVED at that migration (to
   `Cas/Core/Canonicalize/Json.lean` and `Cas/Core/Refs.lean`) and their debt
   rows were struck. The paragraph describes a state that no longer holds. I
   left it alone rather than widening this lane's diff.
