# The operational structure — authenticated computation and the selective rung

**Status: PRE-GRADE. Written for operator grilling, 2026-08-29. No
implementation; repo untouched except this file. Research grade: the
estate claims below carry `file:line`; the paper claims carry
section and article-page.**

Provenance: read-only pass over `main` (`aaf27067`) covering
`library/cas/EFFECTS-BACKEND.md` (R1–R15), `library/cas/Cas/Lang/`
(Sig, Prog, Ops, Interp, Handler, Tower, Representation, Defun,
TreeProg, Roots), `Cas/Core/Address.lean`, `Cas/Schema/Basis.lean`,
`Cas/Backend/Mcp.lean` + `mcp/cas-tools.json`, `Cas/Backend/EmitProg.lean`,
`library/cas/SCHEMA-MATERIALIZATION.md` (S1–S5),
`.staging/schema-materialization/JIT-SUBSTRATE-SURVEY.md`. Papers
fetched and read in full: Miller–Hicks–Katz–Shi, *Authenticated Data
Structures, Generically*, POPL 2014 (hereafter **ADSG**);
Brun–Traytel, *Generic Authenticated Data Structures, Formally*,
ITP 2019 (hereafter **ADSF**); Mokhov–Lukyanov–Marlow–Dimino,
*Selective Applicative Functors*, ICFP 2019, PACMPL 3(ICFP) art. 90
(hereafter **SAF**). None of the three is G0-pinned in
`.reference/catalog/PAPERS.md` yet — see Blocker B0.

**The product framing this document serves, stated so it can be
grilled:** the estate sells *verified programming in four registers* —
program, data, agent, and language — over one substrate, with
provenance, history, and auditability falling out of the CAS rather
than being bolted on. The operational structure is the object that has
to carry all four at once: it is what a program IS, what a datum's
history IS, what an agent is handed and what an agent produces, and
what the language's own terms denote. This document asks whether that
object is correctly shaped today, and what two named prior arts say it
should become.

---

## 0. Blockers, first

**B0 — the three papers are not G0-pinned.** House citation law
requires a resolved pin before a lane doc may cite. This document cites
them provisionally; nothing here may be promoted out of pre-grade until
`.reference/catalog/PAPERS.md` carries all three with digests. Same
posture as the JIT survey's B22
(`.staging/schema-materialization/JIT-SUBSTRATE-SURVEY.md:51-53`).

**B1 — the estate has no verifier, and `replayHandler` is not one.**
`replayHandler` (`library/cas/Cas/Lang/Handler.lean:104-117`) answers a
`put` by comparing the *whole node* against the recorded binding
(`if b.node == n`). That is a trusted-content replay: it presupposes the
verifier already holds the content, so it can never be deceived and
never needs a digest. λ•'s verifier holds a *digest only* and is handed
content by an untrusted party. Nothing in `Cas/Lang/` does that. Every
claim in §1 about "the estate has the prover/verifier pair already" is
false as stated; what the estate has is a prover and a *replayer*.

**B2 — the operator's stream/word identification is half wrong, and
the wrong half matters.** The store word is produced at `put`
(`Cas/Lang/Interp.lean:70`, `Handler.lean:83`). λ•'s proof stream is
produced at `unauth` and consumed at `unauth` (ADSG Fig. 8, 90-page
p. 6 of the PDF; `unauth` is the *read*). `auth` — the write — appends
*nothing* to the stream, because the verifier can compute the digest
itself. So the estate's word and λ•'s proof stream are **different
objects recording different operations**: `word ≙ the auth trace`,
`proof stream ≙ the unauth trace`. They are both byte-decidable lists
of node-shaped things, which is why the identification feels right, and
they are not the same list. §1.3 gives the corrected mapping. This
forces a term-minting ruling (§5, *proof word*).

**B3 — Level 2 is empty by design, and the security theorem does not
need it.** `Cas/Core/Address.lean:22-25` and the closing `example` at
`:82-86` make collision resistance unavailable and forbidden as a
premise (CAS-003). A naive reading says λ•'s security theorem is
therefore out of reach. That reading is wrong, and the correction is
the main technical finding of this document: **ADSG Theorem 1's
Security half has no premise on `hash` at all** — it *produces* a
collision pair rather than assuming none exists (ADSG §4.3, p. 8;
collision-resistance is invoked only in §4.4 to convert the theorem
into the cryptographic ADS game). It is therefore a **Level-0**
statement in the estate's own lattice. The estate already has its
one-operation form: `addr_eq_or_collision`
(`Cas/Core/Address.lean:56-63`), whose docstring calls it "the surveyed
ideal-or-collision-witness disjunct". What is missing is the *lift from
one address to a whole run*. That lift is the first slice (§4).

**B4 — full `select` is not store-encodable, so the conjecture cannot
be adopted as stated.** SAF's `select :: f (Either a b) -> f (a -> b)
-> f b` (SAF §2, art. p. 3) has a **function-valued effect** in its
second argument. A store node cannot hold a function (grammar-grill
ruling 4: F3's code points carry no binder metatheory —
`EFFECTS-BACKEND.md:70-73`). The store-admissible fragment is the
first-order specialization (`ifS`-shaped: a decidable scrutinee and two
*closed* arms). §2.3 states this precisely; it is a real narrowing of
the conjecture, not a quibble.

**B5 — SAF does not prove the sandwich.** The paper gives `Over` and
`Under` (SAF §2.2, art. p. 8) and applies them as
`dependenciesOver`/`dependenciesUnder` (SAF §3.2, art. p. 13–14), and
asserts the ordering informally. There is no theorem in SAF bounding
the actual effects between them. `getNecessaryEffects` does not exist
in the paper. Any estate doc that cites SAF for a proved
over/under-approximation is citing something that is not there — and
the gap is precisely an estate-shaped contribution (§2.5).

**B6 — F3 is unlanded and the bridge is in flight.** Store-resident
programs beyond the straight-line table do not exist
(`EFFECTS-BACKEND.md:329-330`, JIT survey B19). The
`interpretRef ≡ run` agreement is a named obligation
(`Handler.lean:33-35`, `Tower.lean:26-29`, JIT survey B20); a
concurrent agent is proving it and this document assumes it lands, but
the first slice below is deliberately stated over `interpret` so that
it does **not** depend on it.

**B7 — three unproved encoding obligations sit under any new rung.**
`decodeLine_encodeLine` is rolled back for kernel-memory exhaustion
(`Cas/Lang/Defun.lean:396-400`); `readLine` exactness and the
table-level decoder `Word → Option PProg` are owed
(`Defun.lean:54-61`). A new wire tag for a selective node inherits all
three obligations. Do not schedule the selective rung's encoding ahead
of repairing these.

---

## 1. The λ• mapping, precisely

### 1.1 What λ• actually does

λ• adds one type constructor `•τ` with introduction `auth` and
elimination `unauth` (ADSG §3.1, p. 5). One source program is given
**three** semantics, selected by a mode `m ∈ {I, P, V}`, over a
judgement `⟨π, e⟩ →ₘ ⟨π′, e′⟩` where `π` is the proof stream — a list
of *shallow projections* (ADSG §3.3, p. 5–6).

The four rules that carry all the content (ADSG Fig. 8, p. 6):

| mode | `auth v` | `unauth …` |
|---|---|---|
| I | `→ v` | `→ v` |
| P | `→ ⟨hash ([v]), v⟩` | `⟨π, unauth ⟨h,v⟩⟩ → ⟨π @ [([v])], v⟩` |
| V | `→ hash v` | `hash s₀ = h ⊢ ⟨[s₀] @ π, unauth h⟩ → ⟨π, s₀⟩` |

Shallow projection `([·])` (ADSG Fig. 9, p. 6) is a fold over the term
that preserves structure everywhere except at `⟨h,v⟩`, where it drops
`v` and keeps `h`. **A shallow projection is one level of structure
with its children replaced by digests.** That is a CAS node.

Because λ• compiles one source term into two *terms* `e_P` and `e_V`, it
must then prove they correspond, via a three-way agreement relation
`Γ ⊢ e ⋉ e_P ⋉ e_V : τ` with fourteen rules (ADSG Fig. 10, p. 7). The
payload rule is the last one: `Γ ⊢ v ⋉ ⟨h,v_P⟩ ⋉ h : •τ` when
`hash ([v_P]) = h` and `v ⋉ v_P` agree. Lemma 2.1 (p. 7) says
`([e_P]) = e_V` — the verifier term IS the shallow projection of the
prover term.

Theorem 1 (ADSG §4.3, p. 8), both halves:

- **Correctness.** If `⟨[], e⟩ →ᴵⁱ ⟨[], e′⟩` then there exist `e′_P`,
  `e′_V`, `π` with `⟨[], e_P⟩ →ᴾⁱ ⟨π, e′_P⟩`, `⟨π, e_V⟩ →ⱽⁱ ⟨[], e′_V⟩`,
  and `⊢ e′ ⋉ e′_P ⋉ e′_V : τ`.
- **Security.** If `⟨π_A, e_V⟩ →ⱽⁱ ⟨π′, e′_V⟩` for an *adversarial*
  stream `π_A`, then **either** the ideal and prover runs exist with
  `π_A = π @ π′` and everything agrees, **or** there are `j ≤ i`, `s`,
  `s†` with `s ≠ s†` and `hash s = hash s†` — an exhibited collision.

No premise on `hash`. §4.4 (p. 8) then converts this into the standard
cryptographic ADS game by choosing `hash` from a collision-resistant
family after fixing the program.

**ADSF's corrections matter and must be inherited.** The Isabelle
mechanization found *major problems in ADSG's Lemmas 1 and 2.2*, and
corrected the security theorem's shape: ADSG claims the adversarial
stream is `π₀ @ [s†] @ π′` — evaluation stopping at the collision —
which is false for multi-step evaluation, because the verifier cannot
detect that a collision occurred and keeps consuming. The corrected
shape is `π_A = π₀ @ [s†] @ π₀′ @ π′` (ADSF §5, Theorem 24 and the
discussion following it, art. pp. 10:15–10:16, with an explicit
counterexample). ADSF also adds `closed s ∧ closed s†` to the witness,
weakens type soundness to a `weak` typing judgement because
preservation fails for the strong one (ADSF §3, Lemma 12–13,
art. p. 10:11), and drops ANF for call-by-value (ADSF §1, p. 10:2).
**Any estate statement of the security theorem must be written in
ADSF's corrected shape from line one.** Copying ADSG's published form
would import a known-false theorem.

### 1.2 The piece-by-piece map

| λ• | estate | citation |
|---|---|---|
| `•τ` (verifier representation: a digest) | `Addr32`; and *better*, `Ref = ⟨expectedTag, addr⟩` — a **typed** authenticated pointer | `Cas/Lang/Tower.lean:39`, `Cas/Lang/Ops.lean:21-33` |
| shallow projection `([v])` | `encodeNode n` — the canonical byte pre-image whose references are the children's addresses | `Cas/Core/Address.lean:36`, `Cas/Lang/Tower.lean:116-118` |
| `hash ([v])` | `H (encodeNode n)`; `addr` | `Cas/Core/Address.lean:36` |
| proof stream `π` | **not** the word — see §1.3 | `Cas/IR/Word.lean:29,35` |
| mode I (ideal) | the pure Lean fold that never touches the store: `Tree.address` against `Tree.prog` | `Cas/Lang/TreeProg.lean:13-20` |
| mode P (prover) | `referenceHandler` — the recording direction | `Cas/Lang/Handler.lean:77-91` |
| mode V (verifier) | **absent** (B1) | — |
| shallow-projection compilation | **absent, and correctly so** — see §1.4 | — |
| agreement relation (14 rules) | **not needed** — see §1.4 | — |
| collision resistance | hash-hypothesis lattice, Level 2, empty by design | `Cas/Core/Address.lean:22-25,75-86` |
| one-address ideal-or-collision disjunct | `addr_eq_or_collision` — Level 0, proved | `Cas/Core/Address.lean:56-63` |

### 1.3 The stream/word correction (B2, discharged)

The correspondence is at the *operation*, not at the list:

- **`put n` ≙ `auth v`.** Both compute a digest of a canonical
  encoding, reveal nothing to a stream, and answer the digest. In V
  mode λ• writes `⟨π, auth v⟩ → ⟨π, hash v⟩` — the verifier computes
  the hash itself, because it constructed the value. An estate verifier
  can do exactly the same: it holds `n`, so it computes
  `H (encodeNode n)`. **Exact match, no stream traffic.**
- **`load a` ≙ `unauth h`.** Both take a digest, must be *handed*
  content by someone, and check that the content digests to the demanded
  address. **Exact match, and this is the only stream-consuming rule.**

Therefore: **the proof stream is the estate's `load` trace, not its
`put` trace.** The store word is the `put` trace. The two are distinct.

The pleasant consequence is that the *carrier* can be reused without
change. A proof stream is a `Word` — a `List Binding` — in which the
`address` field is **untrusted decoration** and the load-side check is
`H (encodeNode b.node) == a`, not `b.address == a`. So the new object is
a new *role* for an existing type, not a new type. That is the additive
answer, and it is why the term needs minting rather than the carrier
needing growth (§5).

### 1.4 Where the estate already exceeds λ•

Stated per item, not as a general claim. The estate does not have λ•'s
theorem at all (B1, B3); the items below are method and substrate.

1. **One program, two handlers — so the agreement relation evaporates.**
   λ• compiles one term into two terms and then needs Fig. 10's fourteen
   agreement rules plus Lemma 2 to relate them; ADSF's repair of
   Lemma 2.2 is a direct consequence of that machinery being delicate.
   The estate keeps **one** `Prog` and varies only the `Handler`
   (`Cas/Lang/Handler.lean:41-48`, R10 at `EFFECTS-BACKEND.md:150-155`).
   There is no second term, so `([e_P]) = e_V` is not a lemma — it is
   the absence of a construction. **This is the single largest
   structural advantage and it should be the headline of any writeup.**
   Concretely: λ• needs one agreement rule per language construct;
   the estate needs one handler pair, full stop, and inherits it by
   every fragment's existing embedding theorem (§3.4).
2. **Kernel-checked from the start.** `interpret_bind`
   (`Handler.lean:52-59`), `interpret_through` (`Tower.lean:71-85`),
   `eq_of_forall_interpret` (`Representation.lean:80-84`),
   `runP_embed_agree` and `encodeProg_wf` (`Defun.lean:39-43,440-467`),
   `putTree_correct` (`TreeProg.lean:13-20`). ADSG was on paper and
   ADSF found real defects in it five years later.
3. **The hash is not an assumption at the bottom.** ADSG explicitly
   does not formalize `hash` (p. 6, "we do not formalize the semantics
   of hash explicitly"). The estate has `sha3_512_bridge`
   (`formal/fips202/Sha3/Bridge.lean:814`) linking an executable
   SHA3-512 to FIPS 202, with `#print axioms` at `:964`. Collision
   resistance remains an assumption in both; the *implementation*
   refinement is the estate's and not λ•'s.
4. **Two hosts and a differential gate.** λ• has one implementation
   (OCaml, ADSG §5). The estate's cross-host word-equality run gate is
   landed and green (`EFFECTS-BACKEND.md:318-327`, slice 2).
5. **Admission is a judgement.** λ•'s `auth` always succeeds. The
   estate's `put` calls a proved-sound-and-complete admission judgement
   (`Cas/Core/Admission.lean:176`, `put_fresh_spec` at `:201`), so
   well-formedness, reference presence, and kind agreement are gates on
   the authenticated write. λ• has no analogue.
6. **Sharing is observable and inert.** `put`'s `duplicate` outcome
   (`Handler.lean:84`) makes a DAG's shared subterms deduplicate, with
   the sublist statement proved (`TreeProg.lean:85-89`). λ• has no
   deduplication notion.
7. **Typed pointers.** `Ref` carries `expectedTag`; λ•'s digests are
   untyped and the kind lives only in the source term's type.

### 1.5 What λ• has that the estate lacks

1. **The security theorem** — the whole point of λ•. B3.
2. **Recursion.** λ• has `µα.τ` and `rec` (ADSG §3.1, p. 5) and its
   theorem covers them. The estate has finite `Prog` (R1) and
   straight-line `PProg`; recursion is absent from the schema plane
   entirely (JIT survey B3).
3. **The outsourcing asymmetry, i.e. succinctness.** λ•'s verifier
   keeps O(1) state and consumes an O(log n) stream; that asymmetry is
   the product. The estate has no cost model and no succinctness claim
   anywhere. If the verifier ends up consuming a whole word, the
   λ• analogy has been taken without its payoff.
4. **A measured implementation** (ADSG §6, benchmarks against
   hand-optimized ADSs).

### 1.6 The missing theorem, stated

Is the security theorem *the* missing piece for the
LLM-as-untrusted-producer story? **Yes for the half of that story where
the model supplies content or a history; no for the half where the
model authors a program.** Scope it explicitly:

- **Covered by W-SEC below:** a model (or a mirror, or a remote host)
  hands the estate a *claimed answer plus a claimed stream* for a
  program over content the estate holds only by digest.
- **Not covered:** a model *authoring* a program. That is admission of
  syntax and belongs to the selective rung's effect budget (§2.4, §3).
- **Not covered at all:** `LlmSig.infer` answers
  (`Cas/Lang/Ops.lean:36-43`). Those enter as recorded content and are
  unverifiable by construction. Nothing here changes that, and no doc
  should imply otherwise.

The two handlers to add (proposals — names in §5):

```
-- the prover: holds the store, reveals content at every load
proveHandler  : Handler CasSig (StateT (Word × Word) (Except Refusal))
  -- state: (the store word, the emitted proof word)
  -- .put n  => answer H (encodeNode n) as today, emit nothing
  -- .load a => find n at a; emit ⟨a, n⟩ onto the proof word; answer n

-- the verifier: holds NO store, only the stream
verifyHandler : Handler CasSig (StateT Word (Except Refusal))
  -- state: the claimed proof word, consumed head-first
  -- .put n  => answer H (encodeNode n); consume nothing
  -- .load a => pop b; REQUIRE H (encodeNode b.node) == a; answer b.node
  -- .fail r => refuse
```

Note what these are not: they are not new signatures (R2's consumer
gate does not bite), not new sorts, and not new carriers. They are two
values of `Handler CasSig M` — precisely R10's claim that every
semantics is a handler, exercised on a semantics the estate has never
written.

**W-SEC (proposed, in ADSF's corrected shape).** For every
`p : Prog CasSig A`, every `H : Bytes → Addr32` with **no premise**,
every honest word `w`, and every adversarial proof word `π_A`:

> if `interpret (verifyHandler H) p π_A = .ok (a, π′)`
> then **either**
> (1) `interpretRef H p w = .ok (a, w′)` and `π_A = π @ π₀′ @ π′` where
> `π` is the stream `proveHandler` emits from `w` — the verifier's
> answer is the true answer; **or**
> (2) there exist `bs bs' : Bytes` with `bs ≠ bs'` and `H bs = H bs'`
> — an exhibited collision.

The `π₀′` in branch (1) is not decoration: it is ADSF's correction, and
it is where a naive transcription of ADSG would be wrong. The inductive
step is entirely the `load` case, and it is `addr_eq_or_collision`
(`Cas/Core/Address.lean:56-63`) applied at each load: the verifier
accepted `b.node` with `H (encodeNode b.node) = a`; the honest store
holds `n` at `a` with `H (encodeNode n) = a`; either `b.node = n` and
agreement continues, or their encodings differ and their digests agree —
the witness.

This sits at **Level 0**. CAS-003 is untouched. The cryptographic
corollary (ADSG §4.4) is a separate, clearly-labelled admission and
belongs in a trust statement, not in a theorem.

### 1.7 λ•'s compilation vs the estate's materialization registers

λ•'s compiler is a syntactic pass: one source program, two emitted
OCaml programs, justified by the agreement relation (ADSG §5, p. 9–10).
The estate's materialization registers are the same *move*: one
described denotation, two emissions — Effect-native
(`fromRepresentation` / `toCodeDocument`) and estate-native
(`EmitAst`/`Ts` printer) — each the other's check
(`SCHEMA-MATERIALIZATION.md:178-186`, P6 at `:118-124`). The
difference is what justifies the pair: λ• **proves** its two emissions
agree; the estate **decides** it, by byte-identity gate. Under R5/R10
that is the right trade at a cross-language seam — a realization is
never a bearer of meaning — but it has a consequence worth stating
plainly: **the estate cannot state λ•'s Lemma 2.1 across the language
boundary; it can only gate it.** Inside Lean the analogous statement is
free, because there is only one program. The gate is where the
inside-Lean advantage stops.

---

## 2. The selective conjecture, honestly

### 2.1 What the straight-line document actually is

The two carriers: `PProg = List PLine` with
`PLine = put version tag payload (refs : List (UInt8 × PIn))
| load (src : PIn)` and `PIn = lit Addr32 | ans Nat`
(`Cas/Lang/Defun.lean:77-97`); and the wire form
`RunParams = { instructions : List RunInstruction }` where a
`RunRef` is `⟨expectedTag, source⟩` with `source` an index
(`Cas/Backend/Mcp.lean:31-46`, manifest `cas_run`).

Is it free-*applicative*-shaped? **Not for the reason the conjecture
gives.** A free applicative's defining discipline is that no later
effect may depend on an earlier *result*; that is what makes the effect
list static. `PLine`'s `ans i` **is** a dependence on an earlier result.
The document is nonetheless statically analysable, for a different and
more interesting reason:

> **The answer to a `put` is a function of the operation's own
> argument.** `addr` is defined on the canonical bytes alone
> (`Cas/Core/Address.lean:36`), with no premise on `H` (Level 0). A
> `load` answers its source address into the history by construction
> (`Defun.lean:137`). Therefore, *given `H`*, the whole answer
> environment of a table is a pure recursion on the table, and
> *without* `H`, the sequence of operations and their shapes is
> determined outright.

Call this **hash-determined dataflow**. It is the estate's own R4/Level-0
discipline doing the work that the applicative restriction does in the
usual free-applicative story. The conjecture's conclusion is right —
effects are readable without running — and its stated reason is wrong.
This distinction is load-bearing for §3, because hash-determined
dataflow does **not** survive a branch on loaded content, and that is
exactly where selective earns its keep.

### 2.2 What selective adds, and why it is the right rung

SAF's `select :: f (Either a b) -> f (a -> b) -> f b` (SAF §2, art. p. 3),
with `branch`, `ifS`, `whenS`, `fromMaybeS` derived (SAF §2.1, Fig. 3).
Table 1 (SAF §2, art. p. 5) is the positioning: `<*>` gives static
visibility and parallelism; `select` adds conditional and speculative
execution *while keeping* static visibility; `>>=` gives arbitrary
dynamic effects and loses it.

The decisive argument for the estate is not that positioning. It is a
statement about carriers, and it is short:

> **`Prog`'s continuation demands an answer; `Over` has none to give.**
> `Prog.vis` holds `S.Ans op → Prog S A` (`Cas/Lang/Prog.lean:27`), so
> any fold over `Prog` must supply an answer to proceed. `Over m a` is
> `Const`-shaped — it carries an `m` and no `a` (SAF §2.2, art. p. 8).
> Hence there is **no** static effect analysis of `Prog`, at any
> effort. It is not missing; it is impossible for that carrier.
> `interpret` says the same thing in the estate's own spelling: it
> demands `Monad M` (`Handler.lean:46`), and `Const` is not a monad.

A selective carrier's arms are **closed programs**, not functions of an
answer, so a `Const`-shaped target can traverse them. `runSelect`'s
type is `Selective g => (forall x. f x -> g x) -> Select f a -> g a`
(SAF §5.1, Fig. 7, art. p. 18) — that natural transformation **is** the
estate's `Handler S M` (`Handler.lean:41-42`: `(op : S.Op) → M (S.Ans op)`),
and `getEffects = getOver . runSelect (Over . pure . void)` (same
figure) is literally *static analysis as a handler*. R10 and SAF §5.1
are the same sentence written in two notations. That agreement is
strong evidence the conjecture is pointed at the right object.

Second decisive fact, and the one that makes the store encoding
possible at all: **rigid selective functors have a normal form, and it
is a left-associated linear sequence** (SAF §5.1, art. pp. 17–18) —
`pure x <*? fa <*? fb <*? … <*? fy`, "any rigid selective computation
can be rewritten as a left-associated sequence of select operators".
A linear sequence is a **table**. `PProg` is already a table
(`Defun.lean:97`). The free rigid selective functor's normal form is
therefore the same shape as the estate's existing store-resident
citizen, extended by branch arms. Under R4 — identity hashes
presentations, canonical spelling makes structural equality coincide
with byte equality (`Representation.lean:11-16`) — having a normal
form is not a nicety, it is the precondition for content addressing.
SAF notes there is no right-associated normal form, from `select`'s
asymmetry; that costs the estate nothing, since one canonical spelling
is all R4 wants.

### 2.3 Where the conjecture is partial (B4, expanded)

Three narrowings, each with its reason:

1. **Not full `select`; the first-order fragment.** `select`'s second
   argument is `f (a -> b)` — an effect answering a *function*. There
   is no store node for a function (grammar-grill ruling 4,
   `EFFECTS-BACKEND.md:70-73`; `Prog.lean:12-15` says the same about
   host continuations). The store-admissible shape is `ifS`-like: a
   scrutinee program answering a **decidable observation on first-order
   data**, plus two closed arms. So: *the estate wants the `ifS`
   fragment of a free rigid selective functor over `CasSig`*, not
   `Select CasE`. Anything answering a function stays outside the store
   and lives at `Prog` (R7's boundary, `EFFECTS-BACKEND.md:111-118`).
2. **Do not give `Prog` a `Selective` instance.** Every monad is
   selective via `selectM`, and SAF's final law forces
   `select = selectM` when both exist (SAF §2.3, Fig. 4, art. pp. 10–11).
   The analysis you get is then exact and useless — `Over` still cannot
   run, per §2.2. The value lives entirely in a **separate, smaller
   carrier that embeds into `Prog`**, exactly as `PProg` does today via
   `embed` (`Defun.lean:141`) with `runP_embed_agree` as the tie
   (`Defun.lean:39-43`). Stated as a rule: *fragments are carriers, not
   instances.*
3. **Rigidity must be checked, not assumed.** SAF's free construction
   in Fig. 7 is free for **rigid** selective functors only, using
   `(<*>) = apS` (SAF §5.1, art. p. 18). `Over` is rigid; `Under` is
   not (SAF §2.2, art. p. 8 — "Over is a rigid selective functor …
   but Under is [not]"). If the estate wants both approximations off
   one carrier, it is using a rigid free construction interpreted into
   a non-rigid target, which is fine, but the rigidity side-condition
   belongs in the theorem statements rather than in a footnote.

### 2.4 R14a, R7, and the word — compatibility, checked

- **R14a-P1** ("effect-free work stays outside `Prog`",
  `Representation.lean:89-96`). A branch on a *pure* condition needs no
  language feature: it is Lean's `if`, outside the program. So the
  selective rung earns nothing where the condition is pure, and P1 is
  not weakened. It earns exactly where the condition is an **answer** —
  branch on what a `load` returned. Naming that as the sole
  justification keeps P1 intact and keeps the fragment small. *Rule:
  a branch is admissible only when its scrutinee is an operation's
  answer; a pure branch is a Lean `if` and never enters the store.*
- **R7** ("programs are content; hosts are code",
  `EFFECTS-BACKEND.md:111-118`). The selective rung is *additive*: one
  new wire tag whose node carries the scrutinee's decidable test plus
  **references** to the two arms' table nodes. Because arms are
  referenced, identical arms across programs deduplicate through
  `put`'s duplicate outcome for free. The existing layout discipline —
  children-first, table node last, `encodeProg_wf` at Level 0
  (`Defun.lean:416,440`) — extends unchanged. B7's three unproved
  encoding obligations are inherited and must be repaired first.
- **The word observation (R5/R10).** Over-approximation and word
  equality live at **different strata** and never meet: `getEffects` is
  a property of the *syntax* (stratum 1, `DecidableEq`, hashable —
  `Representation.lean:11-16`), computed without running; the word is a
  property of a *run* (stratum 3, decided per-run —
  `Representation.lean:22-24`). No over-approximation ever enters a
  conformance gate. So the answer to "is over-approximation compatible
  with byte-decidable conformance?" is **yes, trivially, because they
  are not comparable observations** — and the interesting question is
  the one underneath, in §2.5.
- **`putTree`/`RunParams` today.** `Tree.progK` (`TreeProg.lean:40-68`)
  is an unconditional leaf-up fold with no branching at all; `RunParams`
  carries no conditional (`Mcp.lean:43-46`). Both sit strictly below the
  selective rung and both stay valid: a table is a branch-free
  selective program.

### 2.5 The theorem SAF does not have, and the estate can

B5: SAF asserts `under ⊆ actual ⊆ over` and never proves it. The estate
is unusually well placed to prove it, because it has a canonical,
byte-decidable notion of *actual*: the word. Proposed:

> **The sandwich.** For a selective-rung program `q` and every word `w`,
> `necessaryOps q ⊆ opsOf (run q w) ⊆ possibleOps q`
> as multisets, where `possibleOps` is `interpret` into `Over`,
> `necessaryOps` is `interpret` into `Under`, and `opsOf` reads the
> operations off the executed path.
>
> **Corollary (the byte-observable half).** The put-projection of
> `possibleOps q` bounds the run's word: no run of `q` from any word
> admits a node outside `q`'s declared put set.

The corollary is the audit statement in its cash form, and it is
decidable per-program. Note the estate can state it and SAF cannot,
for a reason the estate should be pleased about: SAF has no canonical
observation of a run, and the estate's whole architecture is one.

### 2.6 Verdict

The conjecture is **right in the important half and wrong in its stated
reason, with one real narrowing.** Right: the selective rung is the
correct power step between today's table and `Prog`, and the reason is
carrier-level and forced, not aesthetic — `Over` cannot feed a
continuation, so `Prog` admits no static analysis at all, while
selective's closed arms admit one; and rigid selective's normal form is
a left-associated linear sequence, i.e. exactly the table shape the
store already holds. Wrong: today's straight-line document is not free-
applicative because it forbids result dependence — it *has* result
dependence (`ans i`) and is statically analysable because addressing is
functional at Level 0. Narrowed: full `select` is not store-encodable
(function-valued effects), so the citizen is the `ifS` fragment with
first-order decidable scrutinees and closed arms, kept as a separate
carrier that embeds into `Prog` rather than as a `Selective` instance
on `Prog`.

---

## 3. The layered proposal

### 3.1 The tower, named

| Rung | Carrier | Status | Static analysis | Store encoding | Handler set |
|---|---|---|---|---|---|
| **L-A** — the table | `PProg = List PLine` (`Defun.lean:97`) | landed | exact: `over = under = actual` | tags 14/15, `encodeProg_wf` Level 0 (`Defun.lean:440`) | all of R10, via `embed` |
| **L-S** — the guarded table (**proposed**) | `SProg`: L-A plus one branch line, scrutinee a decidable test on a loaded node, arms closed `SProg`s | **proposed** | `over ⊋ under`; the sandwich (§2.5) | forms on the step/cont sorts (14/15), never a third tag; arms by reference so they dedupe | all of R10, via `sEmbed` |
| **L-P** — the free monad | `Prog CasSig` (`Prog.lean:25`) | landed | **none, and impossible** (§2.2) | not content — R7's boundary; continuations are host functions (`Prog.lean:12-15`) | all of R10 |
| **L-T** — the tower | `Handler.through` (`Tower.lean:65`) | landed | — | — | `interpret_through` (`Tower.lean:71`) |

The inclusion `L-A ⊂ L-S ⊂ L-P` is a claim to be *proved*, not
assumed. L-A ⊂ L-P is proved today: `embed` (`Defun.lean:141`) with
`runP_embed_agree` (`Defun.lean:39-43`). The two new obligations are
`L-A ↪ L-S` (a table is a branch-free guarded table — trivial, but
stated so the fragment inclusion is law) and `L-S ↪ L-P` with its
agreement theorem, in `runP_embed_agree`'s exact style, including the
exact-fuel accounting.

### 3.2 What each rung buys, in the four product registers

| | data | programming | LLM | reasoning |
|---|---|---|---|---|
| **L-A** | a program's reachable address set is computable; GC, pinning, mirror sync are static queries | the emitters' target; the cross-host word gate | the `cas_run` tool an agent already drives | short inductions; exact-fuel run agreement |
| **L-S** | conditional provenance: "this datum's history branched here, and here is the branch not taken, by address" | read set and write set known before scheduling | **an effect envelope becomes a grantable budget** — a proposed program is refused when its `possibleOps` exceeds the grant, decided at stratum 1 without executing | the envelope is the frame condition: "this program touches only these addresses" is what makes local reasoning possible |
| **L-P** | — | full expressive host programs | — | `LawfulMonad`, initiality (`Representation.lean:54-84`) |

The LLM row of L-S is the one worth arguing over. It makes **admission
of a program decidable the way admission of a node already is**. That
is the same move the estate made for data, applied to code, and it is
the natural completion of R15's acquisition loop: today the loop gates
model-produced *code* by byte/typecheck/parse-back/run
(`EFFECTS-BACKEND.md:298-305`); with L-S it can also gate model-produced
*programs* by envelope, before running anything.

### 3.3 Which rung do the shipped surfaces speak?

- **The `cas_run` tool speaks L-A.** `RunParams` is a list of
  instructions with index-named references and no conditional
  (`Cas/Backend/Mcp.lean:19-22,43-46`; manifest `cas_run` in
  `library/cas/mcp/cas-tools.json`). Growing it to L-S is an additive
  params change plus a `manifestVersion` bump, which
  `Mcp.lean:96` says is "bumped only by ruling".
- **`deriving` — distinguish two things.** `deriving Described` /
  `cas_struct` emit **schema codes**, which are stratum-1 data, not
  programs at any rung (`Mcp.lean:31-45` is itself generated this way).
  `lake exe emitprograms` emits **L-A**: `Tree.progK` unfolds to a
  straight line, one `store.put` per node, children first, later
  references naming earlier answers (`Cas/Backend/EmitProg.lean:8-14`).
  So every emitted program in the estate today is L-A, and nothing
  regresses when L-S is added.

### 3.4 Where authenticated computation sits — the payoff

**One handler pair, defined once at L-P, inherited by every rung
through the embedding theorems that already exist.**

`proveHandler` and `verifyHandler` (§1.6) are values of
`Handler CasSig M`. They apply to `embed p` for any `p : PProg` and to
`sEmbed q` for any `q : SProg`, and the agreement theorems
(`runP_embed_agree` today, its L-S analogue tomorrow) carry W-SEC down
to each fragment without restating it. Compare λ•, which needs one
agreement rule per language construct (Fig. 10's fourteen rules) and
would need more for every extension.

So the answer to "a handler pair plus an agreement-up-to-digest theorem
**per layer**?" is: **a handler pair once, and the per-layer theorem is
the embedding agreement you were going to prove anyway.** If a later
rung ever needs its own authenticated theorem, that is a signal the
rung is not embedding cleanly — a useful tripwire, not a cost.

One caveat to keep honest: this holds for `CasSig`. A rung that
introduces a *new signature* (not merely a new carrier) needs its own
handler pair, and R2's consumer gate applies. Nothing proposed here
does that.

---

## 4. Sequencing

Smallest first. Each slice states its gates and its dependencies.

**Slice 0 — paperwork.** G0-pin ADSG, ADSF, SAF into
`.reference/catalog/PAPERS.md` with digests. *Gate:* the pin entries.
*Depends on:* nothing. *Clears:* B0. Nothing else may promote first.

**Slice 1 — THE FIRST SLICE: the verifier handler and the one-step
disjunct.** Add `proveHandler` and `verifyHandler` to a new
`Cas/Lang/Auth.lean`, and prove the single-operation lemma — ADSG's
Lemma 6, estate form:

> `verify_load_or_collision`: if `verifyHandler H` accepts a proof-word
> head for `load a` against an honest word binding `n` at `a`, then
> either the head's node is `n`, or `∃ bs ≠ bs', H bs = H bs'`.

*Why first:* it is a direct application of `addr_eq_or_collision`
(`Cas/Core/Address.lean:56-63`), needs no new sorts, no new signature,
no wire tag, and no F3. It is a day of work and it decides whether the
entire λ• mapping is real. If it does not go through cleanly, §1 is
wrong and the rest of this document is void. *Gates:* `lake build`,
`#print axioms` clean, no `sorry`. *Depends on:* nothing — in
particular **not** on the in-flight `interpretRef ≡ run` bridge,
because it is stated over `interpret`. *Clears:* B1.

**Slice 2 — W-SEC, the multi-step lift.** Prove the statement in §1.6,
in ADSF's corrected shape (`π_A = π @ π₀′ @ π′`, tail unconstrained on
the collision branch), by induction on `p` through `interpret`. State
the Correctness half too — it is the easier direction and it is what
makes the pair meaningful. *Gates:* as slice 1, plus a Level-0 audit:
no `hInj` anywhere in the statement or proof. *Depends on:* slice 1.
*Clears:* B3.

**Slice 3 — the untrusted-producer surface.** A `cas_verify` MCP tool:
params `(program, claimed answer, claimed proof word)`, reply
accept/refuse, generated from the signature per R9, with a conformance
vector on both hosts. This is where W-SEC becomes product. *Gates:*
byte-identity gate on the manifest; cross-host agreement on the
accept/refuse verdict per R5. *Depends on:* slice 2, plus an operator
ruling on `manifestVersion` (`Mcp.lean:96`).

**Slice 4 — repair the L-A encoding obligations.** `decodeLine_encodeLine`
(rolled back, `Defun.lean:396-400`), `readLine` exactness, and the
table decoder `Word → Option PProg` (`Defun.lean:54-61`). No new rung
should be encoded on top of three owed round-trip laws. *Gates:* the
existing kernel-memory constraint is the hazard; route through the
llm-proof-loop lane as the rollback note directs. *Clears:* B7.

**Slice 5 — L-S, the guarded table.** Carrier, one reserved wire tag,
`sEmbed` with its agreement theorem in `runP_embed_agree`'s style,
`possibleOps`/`necessaryOps` as interpretations into `Const`-shaped
targets, and the sandwich (§2.5). *Gates:* `encodeProg_wf`'s analogue
at Level 0; a conformance vector; the sandwich proved, not asserted.
*Depends on:* slice 4, B6's F3 wave, and an operator ruling on the
carrier's name and on the consumer that justifies it (R2's discipline
applied by analogy even though no new signature is added).

**Slice 6 — the effect budget.** Admission of a *program* against a
declared envelope, as the agent-facing gate. *Depends on:* slice 5.

Sequencing note: slices 1–3 and slices 4–6 are independent. The
authenticated lane needs no F3; the selective lane needs no verifier.
They can run as two lanes and should, since slice 1 is cheap and
decisive while slice 4 is a known-hard proof repair.

---

## 5. Terms proposed for minting (operator rulings)

Named as proposals for a `CONTEXT.md` pass, in the house's glossary
shape. None is used as settled vocabulary above except where marked
"proposed".

1. **Proof word** — kind: model (carrier role). The `load` trace: a
   `Word` in its verifier-facing role, in which the `address` field is
   untrusted decoration and the check is `H (encodeNode b.node) == a`.
   *Avoid:* never call it "the word" unqualified; the word is the `put`
   trace, and conflating them is B2.
2. **Prover handler / verifier handler** — kind: model (semantics).
   With the explicit ruling that **`replayHandler` is neither**: it is
   trusted-content replay (compares nodes, `Handler.lean:111`), while a
   verifier holds only digests. Three handlers over one carrier, three
   trust postures.
3. **Ideal-or-collision disjunct at run level is Level 0** — kind:
   rule. A ruling that W-SEC's shape does not touch CAS-003's Level 2,
   because it exhibits a collision rather than excluding one. Without
   this ruling the lane will be refused on sight by the lattice
   discipline.
4. **Guarded table** (working name for `SProg`) — kind: model
   (carrier). Alternatives to weigh from the five seats (S5,
   `SCHEMA-MATERIALIZATION.md:23-31`): *guarded table*, *conditional
   table*, *selective table*. The last imports a word from SAF that
   does not carry its meaning at the using or prompting seats.
5. **Effect envelope** — kind: model (derived datum). The image of
   `possibleOps`; the object a grant is written against. Paired with
   **necessary set** for the under-approximation.
6. **The sandwich** — kind: rule (obligation). `necessary ⊆ actual ⊆
   possible`, with the word as `actual`'s byte-observable projection.
   Minted as an obligation name so it can be tracked while unproved.
7. **R16 (proposed ruling for EFFECTS-BACKEND)** — "Authenticated
   computation is a handler pair, and every fragment inherits it
   through its embedding." The generalization of §3.4; the thing that
   makes λ•'s per-construct agreement relation unnecessary here.
8. **~~Wire tag 16~~ — WITHDRAWN (P6, 2026-08-29).** The guarded table
   is FORMS on the `step`/`cont` sorts (tags 14/15, ratified by G3),
   never a third tag; no registry reservation is owed.
9. **`manifestVersion` bump** — required by `Mcp.lean:96` for slices 3
   and 5; a ruling, not a code change.

---

## 6. Multiplicity, counted

Deliberate duplicates in the present design, named rather than
condemned, per house custom:

- **Three replay-shaped handlers** (replay, prove, verify) over one
  `Word` carrier. Justified: three distinct trust postures. Collapse
  would lose the distinction B1 identifies.
- **Two program carriers below `Prog`** (L-A, and L-S if adopted).
  Justified: L-A's analysis is exact and its encoding is landed;
  collapsing it into L-S would make every existing program pay for a
  branch it does not have.
- **Two effect approximations** (`possible`, `necessary`). Justified
  by SAF §3.2's own use case split — over for provisioning, under for
  parallelism — and by the sandwich, which is only meaningful with
  both.
- **Two materialization registers** (Effect-native, estate-native).
  Pre-existing and already justified at
  `SCHEMA-MATERIALIZATION.md:178-186`; §1.7 adds the observation that
  this is λ•'s compilation move with a gate where λ• has a proof.

---

## 7. Sources

**Estate.** `library/cas/EFFECTS-BACKEND.md` (R1–R15);
`library/cas/Cas/Lang/{Sig,Prog,Ops,Interp,Handler,Tower,Representation,Defun,TreeProg,Roots}.lean`;
`library/cas/Cas/Core/{Address,Admission}.lean`;
`library/cas/Cas/Schema/Basis.lean`;
`library/cas/Cas/Backend/{Mcp,EmitProg}.lean`;
`library/cas/mcp/cas-tools.json`;
`library/cas/SCHEMA-MATERIALIZATION.md` (S1–S5);
`.staging/schema-materialization/JIT-SUBSTRATE-SURVEY.md`;
`formal/fips202/Sha3/Bridge.lean`.

**Papers** (not yet G0-pinned — B0).

- **ADSG** — A. Miller, M. Hicks, J. Katz, E. Shi, *Authenticated Data
  Structures, Generically*, POPL 2014, doi:10.1145/2535838.2535851.
  Cited: §3.1 syntax (p. 5); §3.3 operational semantics and Fig. 8
  authenticated rules, Fig. 9 shallow projection (pp. 5–6); §4.2
  agreement, Fig. 10, Lemma 2 (pp. 6–7); §4.3 Theorem 1, Lemmas 5–6
  (p. 8); §4.4 cryptographic security (p. 8); §5 implementation
  (pp. 9–10). Page numbers are of the author PDF at
  `https://www.cs.umd.edu/~mwh/papers/gpads.pdf` (14 pp.).
- **ADSF** — M. Brun, D. Traytel, *Generic Authenticated Data
  Structures, Formally*, ITP 2019, LIPIcs 141, art. 10,
  doi:10.4230/LIPIcs.ITP.2019.10. Cited: §1 (10:2, ANF → call-by-value);
  §3 Lemmas 12–13 (10:11, type soundness repaired, weak judgement);
  §5 Theorems 23–25 and the following discussion (10:15–10:16, the
  security-theorem correction and its counterexample); §6 (10:17,
  summary of defects found).
- **SAF** — A. Mokhov, G. Lukyanov, S. Marlow, J. Dimino, *Selective
  Applicative Functors*, ICFP 2019, PACMPL 3(ICFP) art. 90,
  doi:10.1145/3341694. Cited: §2 class definition (90:3–4) and Table 1
  (90:5); §2.2 `Over`/`Under`, rigidity (90:8); §2.3 laws, Fig. 4,
  Interchange (90:10–12); §3.1–3.2 Dune, `dependenciesOver`/`Under`
  (90:13–14); §4 Haxl and speculative execution; §5.1 normal form and
  free construction, Fig. 7 (90:17–18); §8 conclusions (90:25).
