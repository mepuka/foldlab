# Algebraic review — words and the store (`word-store`)

Status: PRE-GRADE review artifact, 2026-08-30. One reviewer's lane of the
operator-ordered algebraic model review. Read-only pass: nothing outside
this file was modified.

**Scope.** `library/cas/Cas/IR/Word.lean` (the word carrier, `wf`/`wfFrom`,
the closed-store bridge, `Admitted`), `library/cas/Cas/Lang/Roots.lean`
(the publication extension), and the store semantics as the effects
library realizes it (`library/effects/src/cas/Store.ts`), reviewed against
the ratified law [EFFECTS-BACKEND.md](../../library/cas/EFFECTS-BACKEND.md)
R4 (identity hashes presentations), R5 (word equality is the conformance
gate), R7 (programs are content). Supporting carriers cited where the
word's algebra actually lives: `Cas/Core/Store.lean`, `Cas/Core/Node.lean`,
`Cas/Core/Admission.lean`, `Cas/Core/Address.lean`, `Cas/Grammar/Tree.lean`,
`Cas/Lang/Interp.lean`, `Cas/Lang/Handler.lean`, `Cas/Lang/Defun.lean`,
`Cas/Lang/Representation.lean`, `Cas/Vectors/Vectors.lean`.

**Out of scope, pending merge** (`merge/cas-word = ad44b40b`):
`Cas/Lang/Worded.lean` and `Cas/Lang/WordWire.lean`. Not reviewed; the
seam they fill is recorded in §5.

**Method.** Two dirty working files were read at `HEAD`
(`git show HEAD:library/effects/src/cas/Programs.ts`,
`git show HEAD:library/effects/test/Programs.test.ts`); every line
citation to those two is a HEAD citation. Six falsifiers below are
kernel-checked against the built `library/cas` (`lake env lean`, scratch
file, output empty — see §6 for the reproduction). One falsifier is
executed against the TypeScript host.

**Register note (C5).** Words like *sound* and *complete* below always
name their judgment. Where a claim is carried by a test rather than a
theorem it is marked GATED, and where it is carried by nothing it is
marked ASSERTED or FOLKLORE.

---

## 1. Implementer view — the algebra that exists

### 1.1 The signature

**Sorts** (all pre-existing; nothing minted here):

| Sort | Carrier | Site |
|---|---|---|
| `Bytes` | `List UInt8` | `Cas/Codec/Bytes.lean` |
| `Addr32` | `{ b : Bytes // b.length = 32 }` | `Cas/Core/Node.lean:27` |
| `Ref` | `(expectedTag : UInt8, addr : Addr32)` | `Cas/Core/Node.lean:31-34` |
| `Node` | `(version, tag : UInt8, payload : Bytes, refs : List Ref)` | `Cas/Core/Node.lean:38-43` |
| `Node.WF` | `payload.length < 2^32 ∧ refs.length < 2^32` | `Cas/Core/Node.lean:47-48` |
| `AdmittedNode` | `{ n : Node // n.WF }` | `Cas/Core/Node.lean:56` |
| `Binding` | `(address : Addr32, node : Node)` | `Cas/IR/Word.lean:29-32` |
| `Word` | `List Binding` | `Cas/IR/Word.lean:35` |
| `NonemptyWord` | `{ word : Word // word ≠ [] }` | `Cas/IR/Word.lean:39-41` |
| `Word.Admitted` | `NonemptyWord` + `wf` proof | `Cas/IR/Word.lean:223-225` |
| `Store` | `Addr32 → Option Node` | `Cas/Core/Store.lean:21` |
| `Refusal` | six clauses | `Cas/Lang/Interp.lean:28-34` |
| `RootedState` | `Word × List Addr32` | `Cas/Lang/Roots.lean:61` |

The TypeScript mirror carries only part of this: `ContentId`
(`Schema.String` matching `/^[0-9a-f]{64}$/`, branded —
`src/cas/Node.ts:23-25`), `CasNodeInput` (`src/cas/Node.ts:44-48`), and
**no word sort at all**. What TypeScript calls a word is
`ReadonlyArray<ContentId>` (`src/cas/Programs.ts:465-466` at HEAD) — an
address sequence, node halves discarded. See §3.1.

**Operations, with types.**

Word-level (all total, all decidable):

```
find        : Word → Addr32 → Option Node          Word.lean:56-58
resolvesIn  : Word → Ref → Bool                    Word.lean:113-116
wfFrom      : Word → Word → Bool                   Word.lean:141-145
wf          : Word → Bool          = wfFrom []     Word.lean:150
toStore     : Word → Store         = find          Word.lean:201
root        : NonemptyWord → Binding = getLast     Word.lean:46-47
length      : NonemptyWord → Nat                   Word.lean:49
(++)        : Word → Word → Word    (List.append, inherited)
```

Store-level:

```
empty       : Store                                Store.lean:26
set         : Store → Addr32 → Node → Store        Store.lean:29-30
Closed      : Store → Prop                         Store.lean:42-44
checkRefs   : Store → List Ref → Except AdmissionError Unit   Admission.lean:49-56
put         : (Bytes → Addr32) → Store → AdmittedNode
              → Except AdmissionError PutOutcome   Admission.lean:176-186
addr        : (Bytes → Addr32) → AdmittedNode → Addr32        Address.lean:36
```

Word-transforming semantics (three of them, and that is a finding — §3.2):

```
step          : Prog CasSig A → Word → Status × Word           Interp.lean:70-85
run           : Nat → Prog CasSig A → Word → Status × Word     Interp.lean:146-153
referenceHandler : Handler CasSig (StateT Word (Except Refusal))  Handler.lean:78-92
interpretRef  : Prog CasSig A → Word → Except Refusal (A × Word)  Handler.lean:96-98
replayHandler : Handler CasSig (StateT Word (Except Refusal))  Handler.lean:279-292
runPFrom/runP : PProg → Word → Status × Word                   Defun.lean:271-294
Tree.flatten  : Tree t → Word                                  Tree.lean:199-215
stepRooted    : Prog StoreSig A → RootedState → Status × RootedState  Roots.lean:69-81
runRooted     : Nat → Prog StoreSig A → RootedState → …        Roots.lean:122-130
```

Root operations (`RootSig`, `Roots.lean:29-39`):

```
publish   : Addr32 → Prog StoreSig Unit             Roots.lean:48-49
listRoots : Prog StoreSig (List Addr32)             Roots.lean:52-53
```

### 1.2 The laws that hold, with status and evidence

**PROVED** means a kernel-checked Lean theorem, named. **GATED** means an
executable test carries it. **ASSERTED** means it is written in prose or a
comment and carried by nothing executable. **FOLKLORE** means it is relied
on and written nowhere.

#### Resolution (`find`)

| Law | Status | Evidence |
|---|---|---|
| `find [] a = none` | PROVED | `Word.find_nil`, Word.lean:60 |
| `find w a = some n → find (w ++ v) a = some n` | PROVED | `find_append_of_some`, Word.lean:62-71 |
| `find w a = none → find (w ++ v) a = find v a` | PROVED | `find_append_of_none`, Word.lean:73-82 |
| `find w a = some n → ⟨a,n⟩ ∈ w` | PROVED | `find_mem`, Word.lean:85-96 |
| `⟨a,n⟩ ∈ w → (find w a).isSome` | PROVED | `find_isSome_of_mem`, Word.lean:99-109 |
| First-binding wins (resolution order) | PROVED (definitional) | Word.lean:56-58 |
| `toStore = find`, definitionally | PROVED (`rfl`) | Word.lean:201 |

The append pair is exactly the overlay law for `toStore`, stated in two
halves; the packaged form is missing (§4, state-new L-W1).

#### Reference typing (`resolvesIn`)

| Law | Status | Evidence |
|---|---|---|
| `resolvesIn w r ↔ ∃ m, find w r.addr = some m ∧ m.tag = r.expectedTag` | PROVED | `resolvesIn_iff`, Word.lean:118-131 |
| Monotone under append: `resolvesIn w r → resolvesIn (w ++ v) r` | PROVED | `resolvesIn_mono`, Word.lean:135-138 |

`resolvesIn_mono` is the one theorem the estate leans on for the
lock-freedom argument in TypeScript (`src/cas/Store.ts:10-11`,
`src/cas/Backend.ts:23-25`). What it covers and does not cover is §3.5.

#### Admission over a word (`wf`)

| Law | Status | Evidence |
|---|---|---|
| `wfFrom prior (x ++ y) = wfFrom prior x && wfFrom (prior ++ x) y` | PROVED | `wfFrom_append`, Word.lean:152-160 |
| Prefix interior stays resolved | PROVED | `wfFrom_resolves`, Word.lean:164-198 |
| **The bridge**: `wf w → Store.Closed (toStore w)` | PROVED | `wf_toStore_closed`, Word.lean:207-218 |
| `wf w ∧ (∀ r ∈ n.refs, resolvesIn w r) → wf (w ++ [⟨a,n⟩])` | PROVED | `wf_snoc`, Word.lean:238-246 |
| `Admitted.closed` | PROVED | Word.lean:231-232 |
| Converse of the bridge (`Closed (toStore w) → wf w`) | **FALSE** | Exhibit E, §3.4 |

#### The store↔word square

| Law | Status | Evidence |
|---|---|---|
| Fresh append is `Store.set`: `find w a = none → toStore (w ++ [⟨a,n⟩]) = (toStore w).set a n` | PROVED | `toStore_snoc`, Word.lean:283-295 |
| Occupied append is invisible: `(find w a).isSome → toStore (w ++ [⟨a,m⟩]) = toStore w` | PROVED | `toStore_append_shadowed`, Word.lean:252-265 |
| Store-equal prefixes stay store-equal under a common suffix | PROVED | `toStore_append_congr`, Word.lean:270-280 |
| `set_same` / `set_other` | PROVED | Store.lean:32-38 |
| `Closed.not_referenced` (fresh address is unreferenced) | PROVED | Store.lean:53-59 |
| `empty_closed` | PROVED | Store.lean:46-49 |

#### Admission judgment (the store side)

| Law | Status | Evidence |
|---|---|---|
| `checkRefs σ rs = .ok () ↔ RefsOk σ rs` | PROVED | `checkRefs_ok_iff`, Admission.lean:60-85 |
| A returned error's clause holds of the input | PROVED | `checkRefs_error_condemns`, Admission.lean:107-133 |
| A condemned list is rejected | PROVED | `checkRefs_complete`, Admission.lean:137-145 |
| `put` rejects exactly when `checkRefs` rejects | PROVED | `put_error_iff`, Admission.lean:188-197 |
| fresh / duplicate / conflict each characterized | PROVED | `put_fresh_spec` 201-216, `put_duplicate_spec` 220-236, `put_conflict_spec` 242-261 |
| Fresh put preserves `Closed` | PROVED | `put_fresh_closed`, Admission.lean:275-294 |

#### Identity (R4 — hash presentations, never denotations)

| Law | Status | Evidence |
|---|---|---|
| `addr` is a function of the canonical pre-image (Level 0) | PROVED | `addr_congr` 42-44, `addr_eq_of_encode_eq` 48-50, Address.lean |
| Equal addresses ⇒ equal nodes **or** an exhibited collision (Level 0) | PROVED | `addr_eq_or_collision`, Address.lean:56-63 |
| Address equality reflects node equality **under `hInj`** (Level 1) | PROVED | `addr_inj`, Address.lean:69-71 |
| Level 2 (collision resistance) is empty, and that is exhibited | PROVED | Address.lean:82-86 |
| **A `Word` binding's address is `H (encodeNode node)`** | **NOT AN INVARIANT** | `Honest` is a separate predicate in the grammar layer, Tree.lean:250-251 — see §3.3 |
| `flatten` emits only honest words | PROVED | `Tree.flatten_honest`, Tree.lean:264 |
| `flatten` admits — **under `Function.Injective H`** | PROVED (Level 1) | `Tree.flatten_wf`, Tree.lean:463-465 |
| The concrete SHA-256 vectors carry no injectivity proof | ASSERTED, correctly | Vectors.lean:18-20 |

#### Programs over the word (R7 surface)

| Law | Status | Evidence |
|---|---|---|
| `step` load case answers exactly the projected store | PROVED | `step_load_agrees`, Interp.lean:88-93 |
| `step` put case = the admission judgment, commuting square | PROVED | `step_put_fresh` 98-108, `step_put_error` 112-116 |
| `step` / `run` preserve `wf` | PROVED | `step_preserves_wf` 119-142, `run_preserves_wf` 163-177 |
| `step` IS the reference handler's clause | PROVED | `step_handle`, Handler.lean:131-145 |
| Big-step ↔ small-step agreement (fuel produced, not assumed) | PROVED | `run_interpretRef_agree`, Handler.lean:255-272 |
| The word a run leaves extends the starting word by a **sublist** of the table's declared puts | PROVED | `runPFrom_puts_sound` Defun.lean:1618-1621, `runP_puts_sound` 1671-1675 |
| A duplicate put appends **nothing** | PROVED, and exhibited | Defun.lean:1614-1617 (note), 2149-2156 (worked `example`) |
| `interpret_bind` (monad-morphism law) | PROVED | Handler.lean:53-60 |
| `ObsEq` = same outcome and word from **every** starting word | PROVED (definition) | Representation.lean:134-135 |
| `ObsEq.of_run` (run gate ⇒ `ObsEq`) | PROVED | Representation.lean:162-165 |

#### Roots

| Law | Status | Evidence |
|---|---|---|
| Cas ops delegate: word evolves as `step`, roots unchanged | PROVED | `stepRooted_cas_agrees`, Roots.lean:85-90 |
| `stepRooted` preserves `wf` | PROVED | `stepRooted_preserves_wf`, Roots.lean:94-107 |
| A successful publish's address has a binding in the word | PROVED | `publish_mem`, Roots.lean:111-119 |
| `runRooted` preserves `wf` | **NOTHING** | `runRooted` defined Roots.lean:122-130, carries no theorem |
| `publish` is idempotent | **FALSE in Lean** | Exhibit C, §3.6 |
| `listRoots` order is unspecified | **FALSE in Lean** (it is publication order) | Exhibit C′, §3.6 |

#### The R5 conformance gate, as it actually runs

| Law | Status | Evidence |
|---|---|---|
| Every registered program's answered addresses equal the Lean word's addresses, positionally | GATED | `test/VectorPrograms.test.ts:33-39` |
| Every vector binding's node re-encodes to its declared address on this host | GATED | `test/ConformanceVectors.test.ts:32-35` |
| The index's `root` is the last binding's address | GATED | `test/ConformanceVectors.test.ts:84` |
| The daemon's `cas_run_ref` word equals the Lean word (one program) | GATED | `test/BrainStem.test.ts:367` (program `fileReadme`) |
| A program's word has one entry per put line | GATED — **and contradicts the Lean law** | `test/Programs.test.ts:166-167` at HEAD; see §3.2 |
| Word equality in the `List Binding` sense, cross-host | **NOTHING COMPARES IT** | §3.1 |

#### The TypeScript store law

| Law | Status | Evidence |
|---|---|---|
| Read re-verification: canonical decode + byte-identical re-encode + known kind + recomputed address | GATED (battery) | `verifyNodeBytes`, Store.ts:135-157 |
| Admission check order is law: canonical, kind, refs in order (absence before mismatch), then residency | ASSERTED in prose, GATED in part | `internal/admission.ts:59-63`, judge 64-99 |
| `AlreadyResident` answers the same id (put is idempotent at the store door) | GATED | Store.ts:258-259; exercised by `ConformanceVectors.test.ts` on `shared-chunk` |
| `Collision` (same id, different bytes) surfaces typed | GATED | Store.ts:254-257 |
| The byte plane is grow-only / join-semilattice | ASSERTED, and **not uniform across backends** | Backend.ts:20-25 vs KvsBackend.ts:20-27 — §3.7 |
| Check-then-insert needs no lock | ASSERTED, judgment not named | Store.ts:10-11 — §3.5 |

---

## 2. What the R5 gate certifies, precisely

This is the "technically…" question the operator asked to be closed, so
it gets its own section.

**What "word equality" means in Lean.** A `Word` is a `List Binding`, and
a `Binding` is `(Addr32, Node)` with `DecidableEq` derived
(`Word.lean:29-35`). Word equality is therefore list equality on pairs:
same length, same order, same address **and same node** at every
position.

**What the gate decides.** Two suites, two different comparisons, neither
of them word equality:

1. `test/VectorPrograms.test.ts:33-39` compares
   `answered[position]` — a `ContentId` returned by `store.put` — against
   `binding.address`, the address half of the Lean binding. The `node`
   half of `vector.word[position]` is never read by this suite. The list
   compared on the host side is the **answer history restricted to put
   lines** (`test/generated/VectorPrograms.ts` returns `[a0, …, an]`),
   not a word.
2. `test/ConformanceVectors.test.ts:32-35` supplies each Lean binding's
   `node` to `store.put` and asserts the answered id equals the declared
   address. This does cover the node half — through the digest — but it
   is a *replay of the fixture*, not a comparison of two independently
   computed words.

So the R5 gate as executed certifies:

- **YES** — the address sequence a host's puts answer, positionally, equals
  the address sequence of the Lean-emitted word.
- **YES** (second suite) — each Lean-emitted binding is honest on this host:
  re-encoding its node under this host's digest yields its declared
  address.
- **NO** — it does not compare `List Binding` to `List Binding` anywhere.
- **NO** — it does not compare a *store state*. Nothing asserts that after
  the run, `store.load(a)` agrees with `toStore(word) a` for every `a` in
  the word.
- **NO** — it does not discharge `ObsEq`. `ObsEq.of_run`
  (`Representation.lean:162-165`) quantifies `∀ w : Word` over starting
  words and relates **two `Prog` values under one semantics**. The gate
  runs one program from one starting state (a fresh memory store, i.e.
  the empty word) and compares against a JSON fixture. The prose at
  `Representation.lean:130-133` — "the equality the cross-host run gate
  decides per-program" — is ASSERTED; no gate discharges that
  hypothesis. This is the largest claim-scope gap in the lane.
- **NO** — it says nothing about refusals. `ObsEq` transfers a `done`
  outcome with its word but a `refused` outcome with only its refusal
  (`Handler.lean:102-113`, `Representation.lean:140-157`) — stated
  honestly in Lean, and untested on the host in either direction.
- **NO** — it says nothing about published roots. Publication does not
  enter the word at all (`Roots.lean:69-81`: the roots component is a
  second state slot), so two runs differing only in publications are word-
  equal. `BrainStem.test.ts:346` checks roots separately, by test, for one
  address.

**One-line summary for the register.** *The R5 gate certifies that a
host's puts answer the Lean addresses in the Lean order, and that each
Lean binding is honest on the host. It does not certify word equality,
store-state agreement, program equivalence, refusal behaviour, or root
agreement.*

---

## 3. Breaker view — the holes, each with its falsifier

Falsifier convention: an **EXHIBIT** is a concrete witness; where it is
marked KERNEL-CHECKED the Lean source in §6 compiles clean against the
built `library/cas`.

### 3.1 HOLE — `Word` has no host carrier; the host's "word" is a projection

`Cas.Word = List Binding`. `Programs.ts:465-466` (HEAD) declares
`RunOutcome.word : ReadonlyArray<ContentId>`, documented at
`Programs.ts:459-462` as "the word — the addresses admitted, in admission
order". Two different sorts share one name across the seam. Every host
statement about "the word" is therefore a statement about
`w.map Binding.address`, and the node half of the word is unobservable on
the host side.

**Consequence, adversarial.** A host that answered the right addresses
while storing the wrong nodes passes every word comparison in the lane.
`ConformanceVectors.test.ts` closes this for the *committed fixtures*,
because the fixture supplies the nodes and the digest re-derives the
address. It does not close it for a run: `runProgram` never re-reads what
it put.

**FALSIFIER (executable, currently unwritten).** Exhibit a store whose
`put` answers `address.digest(canonicalBytes)` correctly but writes
different bytes; every gate in §1.2's R5 block stays green. The check
that would kill it — `verifyNodeBytes` on read-back of every word entry
after a run — exists (`Store.ts:135-157`) and is not called by
`runProgram`.

**Class:** conformance, abstraction.

### 3.2 INCONSISTENCY (live, green, contradicting a Lean theorem) — two counting rules for one word

This is the headline finding.

- **Lean.** `step`'s put case appends `[Binding.mk a n]` **only** in the
  `.fresh` arm (`Interp.lean:76-79`); the `.duplicate` arm returns the
  word unchanged (`Interp.lean:78`), matching
  `referenceHandler` (`Handler.lean:84-85`). `runPFrom_puts_sound`
  concludes a **`Sublist`** and not a prefix precisely because of this,
  and the reason is written into the docstring: "a put that answers
  `duplicate` appends nothing (F2's deduplication)"
  (`Defun.lean:1614-1617`). A worked `example` exhibits it
  (`Defun.lean:2149-2156`: two identical put lines, word length 1, puts
  length 2).
- **TypeScript.** `runProgram` executes `word.push(answered)`
  unconditionally in the put branch (`Programs.ts:524` at HEAD), so one
  entry per put **line**, duplicates included.
- **The registered fixture that exercises it.** `shared-chunk` exists for
  exactly this case: `Registry.lean:41-44` — "`flatten` carries the
  chunk's binding twice, so the word itself exhibits deduplication — the
  replay must treat the second occurrence as a duplicate, not a
  conflict." Its lift has 5 instructions
  (`test/generated/VectorProgramLifts.json`), its vector word has 5
  bindings with 4 distinct addresses (`vectors/shared-chunk.json`).
- **The green test that asserts the divergence as law.**
  `test/Programs.test.ts:166-167` at HEAD asserts
  `byAddress.word.length === lift.instructions.length` — for
  `sharedChunk`, 5. Lean's `runP` on the same table leaves 4.

**EXHIBIT B (KERNEL-CHECKED).**

```lean
example :
    ∃ (H : Bytes → Addr32) (p : PProg),
      (runP H p []).2.length = 1 ∧ (PProg.puts p).length = 2 := by
  refine ⟨fun _ => a0, [.put 0 0 [] [], .put 0 0 [] []], ?_, rfl⟩
  rfl
```

**EXHIBIT B′ (EXECUTED against the host).** The `shared-chunk` table run
through `Programs.runProgram` under `layerMemoryLive`:

```
put lines           : 5
RunOutcome.word len : 5
distinct addresses  : 4
word: a3eb814a7951 58bd5b00a2d8 a3eb814a7951 c752c6fe1e0c aa3af12c4892
```

(reproduction in §6). The Lean interpreter's word for the same table has
four bindings.

**Why the R5 gate does not catch it.** The gate compares the *answer
history* (`test/generated/VectorPrograms.ts` returns one address per put
line) against *`flatten`'s* binding addresses (`Tree.flatten` emits one
binding per grammar node, duplicates included — `Tree.lean:199-215`,
`length_flatten` `Tree.lean:231-233`). Both sides count lines, so they
agree. `runProgram`'s `RunOutcome.word` is compared only against itself
(`Programs.test.ts:164-165`).

**Statement of the defect.** `Programs.ts:480` at HEAD says "RUN A
PROGRAM: `Cas.Lang.runP` against a real store" and `:484` says a put
"extends both the word and the history". On a table with a duplicate put
that is false: `runP` extends the history and not the word. The host
implements `flatten`'s counting rule under `runP`'s name, and a test
asserts it.

**Class:** conformance, claim-scope, adequacy (the R5 gate's `Q` is weak
enough that this wrong implementation passes).

**Ruling question (Decision 2 binds — no new sorts).** Two consolidations
are available and they are not equivalent; the estate must pick one:

- **(i) The word is the admitted history.** Make the host drop the push
  on `AlreadyResident` — which requires `put` to report which arm fired,
  a change to `CasStoreShape`'s result type (currently
  `Effect<ContentId, CasError>`, `Store.ts:84`). This is a surface change,
  not a new sort.
- **(ii) The word is the emission history.** Keep the host, and change
  Lean's `step`/`referenceHandler` to append on duplicate — which
  contradicts `toStore_append_shadowed` (Word.lean:252-265) being the
  "word face of `put`'s duplicate being a no-op", and would make
  `runPFrom_puts_sound`'s sublist a prefix.

Reviewer's reading: (i) preserves every existing theorem and changes one
host signature; (ii) preserves the host and invalidates the stated reason
for two theorems. But `flatten` — the thing every vector *is* — follows
(ii). The third possibility, and the one this reviewer thinks is actually
true, is that these are **two different objects** that have been sharing a
name: the *emission word* (`flatten`, the vector, the transfer order) and
the *admission word* (`run`, the history, the thing `wf` is about). They
coincide exactly when the emission has no duplicates. That is a naming
ruling, not a new carrier, and it is the cheapest fix — but it is a
ruling, so it is flagged, not taken.

### 3.3 HOLE — `Word` carries no identity invariant; R4 lives one layer up

R4 says identity hashes presentations. In the carrier, nothing enforces
it: `Binding` is any `(Addr32, Node)` pair (`Word.lean:29-32`), and
`wf` never mentions an address function (`Word.lean:141-150`). The
honesty predicate exists — `Honest w := ∀ p ∈ w, p.address = H (encodeNode p.node) ∧ p.node.WF`
(`Tree.lean:250-251`) — but it lives in the **grammar** namespace, is a
hypothesis of `flatten_wfFrom` (`Tree.lean:363-364`), and is not a field
of `Word`, `NonemptyWord`, `Word.Admitted`, or `ConformanceVector`.

**Consequence.** `Word.Admitted` (`Word.lean:223-225`) is documented as
"a proof-bearing admitted word for formal paths", but the proof it bears
is `wf` alone. The word "admitted" in `Cas.put`'s sense includes
`σ (addr H n)` — the address being the node's — and `Word.Admitted` does
not carry that. Likewise `ConformanceVector.check`
(`Vectors.lean:141-146`) runs `Word.wf` and nothing else.

**EXHIBIT D (KERNEL-CHECKED).** A conformance vector binding one address
to two different nodes passes `ConformanceVector.check`:

```lean
example :
    (Cas.Vectors.ConformanceVector.check
      { name := ⟨"shadow", by decide⟩
        description := "two nodes, one address"
        word := ⟨[Binding.mk a0 n1, Binding.mk a0 n2], by decide⟩ }).isOk
      = true := by decide
```

where `n1 = ⟨0,0,[],[]⟩`, `n2 = ⟨1,0,[],[]⟩`.

**Mitigation, named.** The TypeScript replay
(`ConformanceVectors.test.ts:32-35`) *does* catch it: it re-derives the
address from the node and compares. So honesty is **GATED on the host**,
never **INVARIANT in the carrier**. That is a defensible position — it is
exactly R4's "hash presentations" discipline pushed to the boundary — but
it should be written down, because the current docstring at
`Word.lean:220-222` reads as if `Admitted` were the strong object.

**Class:** invariant, claim-scope.

### 3.4 CLAIM-SCOPE — `wf_toStore_closed` has no converse, and `wf` is not a store property

`wf_toStore_closed` (`Word.lean:207-218`) is one-directional. The
docstring around it (`Word.lean:20-22`) says "a word that passes `wf`
projects to a `Closed` store … nothing dangles, nothing mis-kinds,
through the word as through the store" — which reads as an equivalence.
It is not: `wf` is strictly finer than `Closed ∘ toStore`, and it is not
even invariant under `toStore`-equality.

**EXHIBIT E (KERNEL-CHECKED).**

```lean
def nd : Node := ⟨0, 0, [], [⟨0, b0⟩]⟩   -- one dangling reference

example :
    Word.wf [Binding.mk a0 n1, Binding.mk a0 nd] = false
      ∧ Store.Closed (Word.toStore [Binding.mk a0 n1, Binding.mk a0 nd]) := ...
```

The word fails `wf` because the shadowed second binding's reference
dangles; the store it projects to is `Closed` because first-binding
resolution makes that binding invisible. So `wf` is a property of the
**history**, not of the **state**, and the two are genuinely different
predicates. Everything downstream that reads `wf` as "the store is
closed" is over-reading by exactly this margin.

**Class:** claim-scope.

### 3.5 CLAIM-SCOPE — the lock-freedom argument names no judgment

`Store.ts:10-11`: "Check-then-insert is sound without a lock because the
byte plane only grows." `Backend.ts:23-25`: "Grow-only monotonicity is
what makes lock-free backends lawful: a passed reference check cannot be
invalidated by a concurrent admission."

The Lean theorem in the neighbourhood is `resolvesIn_mono`
(`Word.lean:135-138`): `resolvesIn w r = true → resolvesIn (w ++ v) r = true`.
What it covers: appending to a word never invalidates a passed reference
check. What it does **not** cover:

1. It is about `++` on a word, not about a concurrently mutated byte map.
   The interleaving of two fibers is not modelled anywhere in the estate.
2. It says nothing about the **collision arm**. `judgeAdmission` reads
   `facts.resident` (`admission.ts:93-97`) and `Store.ts:268` writes
   afterwards. Between the two, another fiber could write different bytes
   at the same id. That window is reachable only under an `H`-collision —
   i.e. the Level-2 hypothesis the estate declares empty by construction
   (`Address.lean:75-86`). So the informal claim rests, unstated, on the
   one hypothesis the model refuses to assume.
3. It says nothing about `RootStore`, which is a second grow-only plane
   with its own (divergent — §3.6) semantics.

C5 asks that "sound" name its judgment. Here it names none. The honest
statement is: *`resolvesIn_mono` proves reference checks are stable under
word growth; the concurrent byte plane has no model, and the collision
arm's read-then-write window is closed by the collision-resistance
assumption the estate does not otherwise make.*

**Class:** claim-scope, frame.

### 3.6 INCONSISTENCY — three answers for `listRoots`, and `publish` is idempotent on one host only

| Carrier | `publish a; publish a; listRoots` | order |
|---|---|---|
| Lean `stepRooted` (`Roots.lean:77-79`, `roots ++ [a]` unconditional) | `[a, a]` | publication order |
| TS `RootStore` (`Backend.ts:86`, `roots.add`, a `Set`) | `[a]` | insertion order |
| MCP `cas_list_roots` (`handlers.ts:294-296`, `toSorted()`) | `[a]` | sorted |

`Backend.ts:86` documents `publish` as "Idempotent" and `:90` documents
`list` as "Order is unspecified". Neither is true of the Lean semantics,
and R10 makes the Lean handler the meaning ("Meaning lives in exactly one
place: the reference handler", EFFECTS-BACKEND.md:158-162).

**EXHIBIT C (KERNEL-CHECKED).**

```lean
example (H : Bytes → Addr32) :
    (runRooted H 4
        ((publish a0).bind fun _ => (publish a0).bind fun _ => listRoots)
        ([Binding.mk a0 n1], [])).2.2
      = [a0, a0] := by rfl
```

**EXHIBIT C′ (KERNEL-CHECKED).** Publication order, not sorted:

```lean
example (H : Bytes → Addr32) :
    (runRooted H 4
        ((publish a1).bind fun _ => (publish a0).bind fun _ => listRoots)
        ([Binding.mk a0 n1, Binding.mk a1 n2], [])).2.2
      = [a1, a0] := by rfl
```

Nothing gates this: `BrainStem.test.ts:346` asserts
`roots).toEqual([contAddress])` after **one** publish, the only case
where all three carriers agree.

Two secondary notes on `Roots.lean`:

- `runRooted` (`Roots.lean:122-130`) carries **no theorem at all** — no
  `wf` preservation, no agreement with `run`, no relation to
  `runP`. `stepRooted_preserves_wf` covers one step only
  (`Roots.lean:94-107`).
- The TS `cas_publish_root` is **stronger** than Lean's `publish`: it
  requires `loader.load(address)` to succeed (`handlers.ts:279`), i.e.
  full re-verification, where Lean requires only `Word.find w a ≠ none`
  (`Roots.lean:77-79`). `publish_mem` (`Roots.lean:111-119`) states only
  the weak side. Not a defect — a realization may refuse more — but it
  means the refusal sets differ and nothing says so.

**Class:** conformance, abstraction (α-commutation: `publish`'s abstract
effect on the root multiset disagrees with the representation's).

### 3.7 INCONSISTENCY — the byte plane's stated algebra admits two incompatible realizations

`Backend.ts:20-22` states the seam's algebra: "`putBytes` is join with a
singleton (content addressing makes re-insertion of identical bytes the
identity)". That law is silent about **differing** bytes at one id, and
the three realizations pick differently:

- memory (`Backend.ts:135-148`): refuses with `BackendFailure` on
  differing bytes;
- file (`FileBackend.ts:199-209`): compares the resident and refuses;
- key-value (`KvsBackend.ts:95-101`): "an unconditional `set`" — a silent
  overwrite, documented as such at `KvsBackend.ts:20-27`.

**FALSIFIER (adversarial implementation, per CONTRACT.md's adequacy
class).** The stated seam law admits a backend whose `putBytes`
overwrites. Under such a backend the byte plane is no longer grow-only,
so §3.5's monotonicity argument loses its premise, and resolution order
inverts: `Word.find` is **first**-binding (`Word.lean:56-58`) while an
overwriting map is **last**-write-wins. Two admitted words that project
to the same `Store` in Lean can be served differently by the Kvs
realization.

Reachability through the store door is closed today: `judgeAdmission`
reads residency before writing (`admission.ts:93-97`) and returns
`Collision`, which `Store.ts:254-257` turns into a `StoreFailure`. So the
defect is in the **stated law**, not (currently) in behaviour: the law is
too weak to exclude a realization the estate would reject. That is
precisely the adequacy shape (`CONTRACT.md:115-119`).

`KvsBackend.ts:23` uses "Soundness rests where it already rested" with no
judgment named — C5 again.

**Class:** adequacy, conformance.

### 3.8 CLAIM-SCOPE — three docstring claims in `Word.lean` that nothing carries

`Word.lean:14-20` makes three claims in one paragraph. Taking them one at
a time:

1. *"the transfer order of the push composite"* — FOLKLORE in this lane;
   no citation, no gate found. (May be carried in the sync/exchange lane;
   flagged for the synthesizer to cross-check, not asserted here.)
2. *"the upload order the TypeScript `Graph.closure` emits"* — **false as
   literally stated.** `Graph.closure` is "children-first **and
   deduplicated** — root last" (`Graph.ts:101-103`) and answers
   `ReadonlyArray<ContentId>`. For `shared-chunk`, `flatten` emits 5
   bindings and `closure` yields 4 ids. The two agree only after
   deduplication and address projection. ASSERTED.
3. *"A serialized word is a replayable admission history"* — GATED for
   the committed vectors by `ConformanceVectors.test.ts:32-35`; ASSERTED
   in general. `replayHandler` (`Handler.lean:279-292`) is the Lean
   statement of it and **carries no theorem** — no agreement with
   `referenceHandler`, no round-trip, nothing. R10 names replay as "the
   oracle-from-content direction" (EFFECTS-BACKEND.md:180-183) and that
   direction is unproved. Note the two handlers genuinely disagree on the
   very case §3.2 is about: on a duplicate put, `replayHandler` pops the
   recorded binding and answers (`Handler.lean:282-287`), while
   `referenceHandler` returns `.duplicate` and consumes nothing. So the
   missing theorem is not a formality — it is false without a hypothesis
   nobody has stated.

**Class:** claim-scope, lemmas-proofs (bodyless claim).

### 3.9 UNDERSPECIFICATION — `wf` admits words no interpreter can produce

**EXHIBIT A (KERNEL-CHECKED).**

```lean
example :
    n1 ≠ n2
      ∧ Word.wf [Binding.mk a0 n1, Binding.mk a0 n2] = true
      ∧ Word.toStore [Binding.mk a0 n1, Binding.mk a0 n2] a0 = some n1 := ...

example : Store.Closed (Word.toStore [Binding.mk a0 n1, Binding.mk a0 n2]) :=
  Word.wf_toStore_closed (by decide)
```

`wf` never checks that a binding's address is fresh in the prior word
(`Word.lean:141-145` scans references only). So it admits a word binding
one address to two distinct nodes, and the bridge certifies the result as
`Closed`.

**Why it matters.** No run can produce such a word: `step` appends only in
the `.fresh` arm, which `put_fresh_spec` (`Admission.lean:201-204`)
requires `σ a = none` for — contradicting `find_isSome_of_mem`
(`Word.lean:99-109`) once the first binding is present. So the reachable
words are a proper subset of `{w | wf w}`, and the gap is exactly the
shadowed-binding words. Under `Honest H w ∧ Function.Injective H` the gap
closes (`Honest.no_alias`, `Tree.lean:337-344`) — Level 1 — but `wf` is
the Level-0 predicate the vectors are checked with
(`Vectors.lean:18-20`, `141-146`).

**Owed law (§4).** `wf w → run-reachability` is currently unstated in
either direction. The cheap consolidation is a *fresh-address* conjunct
in `wf`, or a stated `Reachable` predicate proved equivalent to
`wf ∧ Honest ∧ hInj`. Either is a strengthening of an existing predicate,
not a new sort.

**Class:** adequacy, invariant.

### 3.10 MISSING LAW — the store-state postcondition of a run

Every client of `runProgram` assumes that after a successful run, each
address in the word loads to the node the table put there. Nothing states
it in either carrier. The Lean-side statement would be
`(run H f p w).1.isDone → ∀ ⟨a,n⟩ ∈ (run H f p w).2, toStore ((run H f p w).2) a = some n`
— which, note, is **false** for a shadowed word (the second binding does
not load back), and true for reachable words. The host-side statement is
a read-back after the run. Neither exists.

**Class:** contract, conformance.

### 3.11 MISSING LAW — `flatten`'s root

`NonemptyWord.root` is `getLast` (`Word.lean:46-47`), the vector index
publishes it (`Vectors.lean:293`), and `ConformanceVectors.test.ts:84`
gates it against the fixture. But no theorem says
`(tr.flatten H).getLast? = some ⟨tr.address H, tr.node H⟩`. Only
membership is proved (`self_mem_flatten`, `Tree.lean:236-238`). The law
is true and one `cases` away.

**Class:** contract.

---

## 4. The clean algebra — how the law list should read

Decision 2 binds: **no new sorts, no new carriers.** Every entry below is
keep / strengthen an existing definition / state a derivable law / prove
an owed one. Two items that would need a carrier are moved to §7 as
ruling questions rather than proposed.

### 4.1 Signature (unchanged)

Sorts exactly as §1.1. One naming ruling is owed and it is a *word*, not a
carrier: `flatten`'s output and `run`'s output are both called "the word"
and are different lists (§3.2). Proposed vocabulary, no new type:

- **emission word** — `Tree.flatten`'s output; one binding per grammar
  node; what a conformance vector *is*; what a transfer replays.
- **admission word** — the second component of `run`/`runP`/`interpretRef`;
  one binding per *admitted* put; what `wf` is a predicate on and what
  `runPFrom_puts_sound` bounds.

They coincide exactly when the emission has no repeated address.

### 4.2 The law list

**KEEP** (proved, correct, load-bearing) — the whole of §1.2's PROVED
rows. In particular: `find_append_of_some`/`_none`, `resolvesIn_iff`,
`resolvesIn_mono`, `wfFrom_append`, `wf_toStore_closed`, `wf_snoc`,
`toStore_snoc`, `toStore_append_shadowed`, `toStore_append_congr`, the
`checkRefs`/`put` characterizations, `step_handle`,
`run_interpretRef_agree`, `runP_puts_sound`, the Address-lean
hash-hypothesis lattice.

**STRENGTHEN**

| # | Law | What changes |
|---|---|---|
| S1 | `wf` | Add the fresh-address conjunct — `find prior a = none` — in `wfFrom`'s cons case, OR state `WfReachable w := wf w ∧ ∀ prefixes, addresses distinct` and prove `wf_toStore_closed` for it. Closes §3.9. Cost: `Tree.flatten_wf` becomes conditional on the emission having no repeats, which is exactly the `shared-chunk` case — so this strengthening **forces** the §3.2 ruling. Flagged. |
| S2 | `Word.Admitted` | Either add the `Honest H` field (making it the object its docstring claims) or rename the docstring to say `wf` only. Closes §3.3. No new sort: `Honest` already exists at `Tree.lean:250`; consolidating it into `Cas/IR/Word.lean` is a move, not a mint. |
| S3 | `Word.lean:14-20` docstring | Delete the `Graph.closure` clause or qualify it ("after deduplication, the address projection agrees"). Closes §3.8.2. |
| S4 | `Store.ts:10-11`, `Backend.ts:23-25`, `KvsBackend.ts:23` | Replace "sound"/"lawful" with the named judgment: `resolvesIn_mono` for reference stability; state explicitly that the collision arm's window is closed by collision resistance, which the model does not assume. Closes §3.5 and the C5 half of §3.7. |
| S5 | `ByteWriterShape.putBytes` docstring (`Backend.ts:67-76`) | State the differing-bytes arm as law: refuse, or overwrite — pick one, and make `KvsBackend` conform. Closes §3.7's adequacy gap. |
| S6 | `Representation.lean:130-133` | Qualify "the equality the cross-host run gate decides per-program": the gate decides positional address agreement from one starting word against a fixture; `ObsEq.of_run`'s `∀ w` hypothesis is discharged by nothing. Closes §2's largest gap. |

**STATE-NEW** (derivable from existing theorems; no new machinery)

| # | Law | Derivation |
|---|---|---|
| L-W1 | Overlay: `find (w ++ v) a = (find w a).orElse (find v a)`, hence `toStore (w ++ v) = overlay (toStore w) (toStore v)` | packages `find_append_of_some` + `find_append_of_none` (Word.lean:62-82) |
| L-W2 | `wf (w ++ v) = true → wf w = true` | `wfFrom_append` (Word.lean:152-160) + `Bool.and` |
| L-W3 | `(tr.flatten H).getLast? = some ⟨tr.address H, tr.node H⟩` | one `cases` on `Tree`; closes §3.11 |
| L-W4 | `(tr.flatten H).length = tr.size` already exists (`Tree.lean:231-233`); add `Word.length (vector.word) = bindingCount` as the vector-index law it gates | mechanical |
| L-R1 | `runRooted` preserves `wf` | induction on fuel over `stepRooted_preserves_wf` (Roots.lean:94-107), mirroring `run_preserves_wf` (Interp.lean:163-177); closes half of §3.6 |
| L-R2 | `runRooted` on a `Prog.inl` program agrees with `run` on the word component and leaves roots fixed | packages `stepRooted_cas_agrees` (Roots.lean:85-90) up to the fuelled run |

**PROVE-OWED** (real proof obligations, named)

| # | Obligation | Why it is owed |
|---|---|---|
| P1 | **Reachability**: `w` is the word of some halted run from `[]` **iff** `wf w ∧ Honest H w ∧ addresses distinct`. The `←` direction under `hInj`. | Closes §3.9; makes "a serialized word is a replayable admission history" (`Word.lean:19-20`) a theorem instead of prose |
| P2 | **Replay agreement**: for a reachable word `w` and the program that produced it, `interpret replayHandler` agrees with `interpretRef` on answers. | `replayHandler` (Handler.lean:279-292) carries nothing today; R10's "replay is a handler too" (EFFECTS-BACKEND.md:180-183) is unproved, and the two handlers demonstrably disagree on duplicate puts (§3.8.3) |
| P3 | **Emission↔admission**: `runP H (treeProg tr) [] `'s word is `flatten`'s word with repeated addresses dropped (first occurrence kept). | The missing link between `Cas/Backend/EmitProg.lean:85` (`treeProg`, which carries **no theorem**) and `Tree.flatten`; this is the theorem that would have caught §3.2 |
| P4 | **Run postcondition**: a halted run's word loads back through its own store. | §3.10 |
| P5 | **Host conformance, stated**: the TypeScript run gate's assertion, as a Lean statement about the emission word's address projection, so the gate is an instance of a named claim rather than a bespoke comparison. | §2 |

---

## 5. The pending-merge seam (`merge/cas-word`, not reviewed)

Per CORE-ABSTRACTIONS-PLAN.md §0, the branch adds `Cas/Lang/Worded.lean`
(`WordSig`/`since`, seven laws including `since_suffix`, `since_zero`,
`since_cas_agrees`, `stepWorded_preserves_wf`, `since_next`,
`since_compose`, `runWorded_preserves_wf`) and `Cas/Lang/WordWire.lean`
(a `LogEntry` receipt of seq/at/address/tag/size, and a `History`
document), plus `src/cas/WordLog.ts` and `bin/cli/history.ts`.

What that seam fills, from this lane's ledger:

- `runWorded_preserves_wf` supplies for `WordSig` exactly what
  `runRooted` lacks for `RootSig` (L-R1). The asymmetry should be closed
  in the same pass, not left as a per-signature accident.
- `since_suffix` gives the word an *observation* operation with a stated
  algebra, which is the first machinery in the estate that could carry
  P4's run postcondition.
- `WordWire.LogEntry` gives the word a wire spelling — the first
  candidate host carrier for `List Binding` (§3.1). Whether it is one
  depends on whether `LogEntry` carries the node or only
  address/tag/size; from the plan's field list (seq/at/address/tag/size)
  it is a *summary*, not a binding, so §3.1 likely survives the merge.

Nothing in the branch's described law list addresses §3.2's counting
divergence. Flagged for the merge reviewer.

---

## 6. Reproduction of the exhibits

**Lean (six exhibits, all kernel-checked).** The exhibits ship beside
this report as [`word-store-exhibits.lean`](word-store-exhibits.lean).
Against the built `library/cas`, from `library/cas/`:

```
lake env lean ../../.staging/algebraic-review/word-store-exhibits.lean
```

Output was empty — no errors, no warnings — on 2026-08-30. The file
carries exhibits A, A′, B, C, C′, D, E with the section cross-references
written into each docstring.

**TypeScript (exhibit B′).** The Mac host cannot run the effects vitest
suite (`@effect/platform-bun` resolution failure), so the witness was run
as a standalone script under `bun`, importing `effect` by absolute path
into `library/effects/node_modules/effect/dist/index.js` so the RC
version matches. The script builds the `shared-chunk` table verbatim from
`test/generated/VectorPrograms.ts:130-138`, runs
`Programs.runProgram(store, table)` under
`Cas.Store.layerMemoryLive`, and prints `out.word.length` and the distinct
count. Result quoted in §3.2.

---

## 7. Ruling questions (Decision 2 — flagged, not proposed)

1. **Emission word vs admission word** (§3.2). Which counting rule is the
   word? Reviewer's reading is that they are two objects sharing a name
   and the fix is vocabulary plus one host signature change, but this is
   a ruling: it decides whether `Programs.test.ts:166-167` is a law or a
   defect, and whether S1's strengthening of `wf` is admissible.
2. **Does `Word.Admitted` carry honesty?** (§3.3, S2.) Moving `Honest`
   from `Cas.Grammar` into `Cas/IR/Word.lean` is consolidation, but
   adding it as a field of `Admitted` changes what every existing
   consumer must supply. Ruling, not a refactor.
3. **The byte seam's differing-bytes arm** (§3.7, S5). Refuse (memory,
   file) or overwrite (kvs)? One law, three realizations today.
4. **`publish`/`listRoots` semantics** (§3.6). Idempotent set with
   unspecified order (the host), or grow-only list in publication order
   (the reference handler)? R10 says the reference handler is the
   meaning; the host is the one that is deployed.

---

## Appendix — obligation classes touched

Per `.claude/skills/implement/CONTRACT.md:109-139`: **adequacy** (§3.2,
§3.7, §3.9), **invariant** (§3.3, §3.9), **abstraction** (§3.1, §3.6),
**conformance** (§3.1, §3.2, §3.6, §3.10), **claim-scope** (§2, §3.4,
§3.5, §3.8), **contract** (§3.10, §3.11), **frame** (§3.5).

Not touched in this lane: domain, termination.
