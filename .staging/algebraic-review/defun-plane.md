# defun-plane — the algebra of the straight-line table

Area: `Cas/Lang/Defun.lean`, `Cas/Lang/TreeProg.lean`,
`Cas/Backend/EmitProg.lean`, and every carrier that claims to mirror
them (`Cas/Backend/ProgProse.lean`, `Cas/Backend/Mcp.lean`,
`Cas/Lift/Decode.lean`, `library/effects/src/cas/Programs.ts`,
`library/effects/bin/mcp/handlers.ts`).

Status: REVIEW ARTIFACT, pre-grade. Written 2026-08-30 for the
operator-ordered algebraic model review. Every claim below carries a
`file:line`. Reviewed against the ratified law in
[EFFECTS-BACKEND.md](../../library/cas/EFFECTS-BACKEND.md) (R1–R15) and
the obligation classes in
[`.claude/skills/implement/CONTRACT.md`](../../.claude/skills/implement/CONTRACT.md).

**Reading protocol.** Two dirty files were read at `HEAD`
(`git show HEAD:library/effects/src/cas/Programs.ts`,
`…:library/effects/test/Programs.test.ts`); the working-tree diff on
`Programs.ts` closes a different member of finding **H-6**'s class
(host `number` fields wider than Lean's `UInt8`) and touches nothing
below. Files on the two pending merge branches
(`Cas/Lang/Worded.lean`, `Cas/Lang/WordWire.lean`, the daemon plane)
were NOT read and are noted as pending where they would bear.

No soundness word appears below without its judgment named (AGENTS.md
C5). "PROVED" means a kernel-checked Lean theorem at the cited line.
"GATED" means a decidable host check that would go red. "ASSERTED"
means prose with no theorem and no gate behind it. "FOLKLORE" means a
fact the code relies on that is written nowhere.

---

## 0. The one-paragraph verdict

The defun plane is the estate's most heavily proved surface and its
proofs are real: the codec round trip and its exactness, the
interpreter agreement at exact fuel, the Level-0 answer determination,
the envelope sandwich, and FRAME-1 are all kernel-checked with their
over-approximations exhibited by witnesses rather than asserted. What
is NOT settled is the boundary: **`runP` is never executed by anything
— no gate, no tool, no fixture** (§B-5), and the three host objects
that claim to be its mirror each observe a *different* thing than
`runP`'s word does. The result is a plane whose interior is a theorem
and whose exterior is a set of resemblances. Six of the fourteen
findings below are cross-carrier; one of them is exhibited by a
REGISTERED conformance vector (`shared-chunk`) that is green today.

---

## 1. IMPLEMENTER VIEW — the algebra that exists

### 1.1 The signature

**Sorts introduced on this plane** (all first-order, stratum 1 in R14's
sense, `DecidableEq`):

| Sort | Definition | Site |
|---|---|---|
| `PIn` | `lit (a : Addr32) \| ans (i : Nat)` | Defun.lean:167-170 |
| `PLine` | `put (version tag : UInt8) (payload : Bytes) (refs : List (UInt8 × PIn)) \| load (src : PIn)` | Defun.lean:180-184 |
| `PProg` | `abbrev PProg := List PLine` | Defun.lean:187 |
| `PKind` | `put \| load` | Defun.lean:1134-1137 |
| `PutShape` | `⟨version, tag, payload, refKinds : List UInt8⟩` | Defun.lean:1155-1160 |
| `Envelope` | `⟨reads : List Addr32, puts : List PutShape, dataflow : List (Nat × Nat)⟩` | Defun.lean:1198-1202 |

**Sorts borrowed** (defined elsewhere, used as carriers here):
`Addr32`, `Bytes`, `Node` (Core/Node.lean:38-43), `Ref`
(Core/Node.lean:31-34), `Word = List Binding` (IR/Word.lean:35),
`Refusal`, `Status CasSig Addr32`, `Prog CasSig Addr32`, and the
address function `H : Bytes → Addr32` as a plain parameter.

**Mirror sorts in other carriers** (each claims to denote a sort
above; none is tied to it by a theorem unless noted):
`Operand`/`OperandRef`/`Line`/`Program` (Programs.ts, HEAD:100-127),
`RunOperand`/`RunRef`/`RunInstruction`/`RunParams` (Mcp.lean:93-136,
tied by `toPProg_ofPProg`, Mcp.lean:446), `Lifted` (Lift/Decode.lean:156-161,
tied by `decodeLift_encodeLift`, Decode.lean:513).

**Operations, by group.**

*Analysis — `PProg → stratum-1 data`. No `H`, no word, no fuel.*

```
PLine.kind        : PLine → PKind                          (:1140)
PLine.operands    : PLine → List PIn                       (:1147)
PLine.touches     : List Addr32 → PLine → List Addr32      (:1347)
PProg.reads       : PProg → List Addr32                    (:1170)
PProg.puts        : PProg → List PutShape                  (:1176)
PProg.dataflowFrom: Nat → PProg → List (Nat × Nat)         (:1184)
PProg.dataflow    : PProg → List (Nat × Nat)               (:1193)
PProg.envelope    : PProg → Envelope                       (:1205)
Envelope.putCount : Envelope → Nat                         (:1210)
Envelope.dataflowClosed : Envelope → Bool                  (:1221)
PProg.dataflowClosedFrom : Nat → PProg → Bool              (:1213)
PutShape.ofNode   : Node → PutShape                        (:1164)
```

*Determination — parameterised by `H`, still no word.*

```
PIn.resolve       : List Addr32 → PIn → Option Addr32      (:199)
resolveRefs       : List Addr32 → List (UInt8 × PIn) → Option (List Ref)  (:204)
PLine.answer      : H → List Addr32 → PLine → Option Addr32 (:1375)
PProg.answersFrom : H → List Addr32 → PProg → List Addr32   (:1385)
lineAddr          : H → PLine → Addr32                      (:836)
tableNode         : H → PProg → Node                        (:841)
encodeProg        : H → PProg → Word                        (:847)
```

*Codec — no `H`.*

```
encodePIn/readPIn         : PIn ↔ Bytes            (:433, :438)
encodePRef/readPRef       : (UInt8 × PIn) ↔ Bytes  (:496, :499)
encodeLineBody/readLine   : PLine ↔ Bytes          (:544, :552)
encodeLine/decodeLine     : PLine ↔ Node           (:578, :582)
decodeProg                : Word → Option PProg    (:939)
```

*Semantics.*

```
embedFrom : List Addr32 → PProg → Prog CasSig Addr32                 (:215)
embed     : PProg → Prog CasSig Addr32                               (:231)
putWord   : H → Node → Word → Except Refusal (Addr32 × Word)         (:244)
runPFrom  : H → List Addr32 → PProg → Word → Status CasSig Addr32 × Word (:271)
runP      : H → PProg → Word → Status CasSig Addr32 × Word           (:293)
Refusal.absentAddr : Refusal → Option Addr32                         (:1720)
PLine.HashDetermined : H → PLine → Prop                              (:1480)
```

*Lowering — `Tree → straight line`. THREE walks, no theorem between any pair.*

```
Tree.progK / Tree.prog : Tree t → Prog CasSig Addr32   TreeProg.lean:40, :71
lowerTree / treeProg   : Tree t → PProg                EmitProg.lean:55, :85
lowerTable / Tree.table: Tree t → PProg                ProgProse.lean:238, :268
progStmts/progProgram/treeProgram : PProg → Option ProgDecl  EmitProg.lean:110,119,129
treeLifted             : Tree t → Cas.Lift.Lifted      EmitProg.lean:138
```

### 1.2 The law table

Every law that holds, with status and evidence. `H` is universally
quantified unless a premise says otherwise.

#### A. Line codec

| # | Law | Status | Evidence |
|---|---|---|---|
| A1 | `x.WF → readPIn (encodePIn x ++ rest) = some (x, rest)` | PROVED | `readPIn_encodePIn`, Defun.lean:482 |
| A2 | `r.2.WF → readPRef (encodePRef r ++ rest) = some (r, rest)` | PROVED | `readPRef_encodePRef`, :508 |
| A3 | `l.WF → decodeLine (encodeLine l) = some l` | PROVED | `decodeLine_encodeLine`, :635 |
| A4 | `readPIn b = some (x,rest) → b = encodePIn x ++ rest ∧ x.WF` | PROVED | `readPIn_exact`, :708 |
| A5 | same for `readPRef` | PROVED | `readPRef_exact`, :742 |
| A6 | `readLine b = some l → b = encodeLineBody l ∧ l.WF` | PROVED | `readLine_exact`, :764 |
| A7 | `decodeLine n = some l → n.tag = stepWireTag ∧ n.payload = encodeLineBody l ∧ l.WF` | PROVED | `decodeLine_exact`, :826 |
| A8 | counted-sequence round trip and its dual, membership-relative | PROVED | `readN_encode_of` :526, `readN_exact_of` :672 |
| A9 | "one byte representation per code point" for the step sort | ASSERTED | prose at :661-662; refuted by **H-7** |
| A10 | boolean twin of `PLine.WF` decides it | PROVED | `PLine.wf_iff`, Lift/Decode.lean:128 |

#### B. Table as content

| # | Law | Status | Evidence |
|---|---|---|---|
| B1 | `Word.wf (encodeProg H p) = true`, for EVERY `H` | PROVED | `encodeProg_wf`, :871 (via `wfFrom_of_refs_nil`, :853) |
| B2 | "the encoded table ADMITS as a word" | ASSERTED beyond B1 | header :63-64, docstring :866; `Word.wf` (IR/Word.lean:141-150) checks reference closure and kind only, never `Node.WF` — see **H-6** |
| B3 | `(∀ l ∈ p, l.WF) → hsep → decodeProg (encodeProg H p) = some p` | PROVED | `decodeProg_encodeProg`, :998, where `hsep : ∀ l ∈ p, ∀ l' ∈ p, lineAddr H l = lineAddr H l' → l = l'` |
| B4 | `hsep` is NECESSARY | PROVED (witness) | `example`, :1023-1038, `by decide` |
| B5 | recovery preserves the run | PROVED | `runP_decodeProg_encodeProg`, :1051 |
| B6 | recovery preserves `ObsEq` | PROVED | `ObsEq_decodeProg_encodeProg`, :1062 |
| B7 | recovery preserves the envelope | PROVED | `envelope_decodeProg_encodeProg`, :2114 |
| B8 | `find` inside the encoded word answers the line's own node | PROVED | `find_lineAddr` :949, `find_encodeProg` :974 |
| B9 | `decodeProg` accepts nothing outside `encodeProg`'s image | **MISSING** | no `decodeProg_exact`; see **H-4** |
| B10 | recovery of a program from a store holding OTHER content | **MISSING** | `decodeProg` reads `w.getLast?` (:941); the shipped door is address-keyed — see **H-4** |

#### C. Interpretation

| # | Law | Status | Evidence |
|---|---|---|---|
| C1 | `putWord` IS the reference handler's put clause | PROVED | `step_put_putWord`, :251, a corollary of `step_handle` (Handler.lean:131) |
| C2 | `run H (p.length+1) (embedFrom env p) w = runPFrom H env p w` | PROVED | `runPFrom_embedFrom`, :301 |
| C3 | `run H (p.length+1) (embed p) w = runP H p w` — AGREEMENT | PROVED | `runP_embed_agree`, :362 |
| C4 | `runP` preserves `Word.wf` (L7) | PROVED | `runP_preserves_wf`, :368 |
| C5 | `runPFrom`/`runP` always halt | PROVED | :375, :403 |
| C6 | tables whose `runP` agrees at every word are `ObsEq` | PROVED | `ObsEq_embed_of_runP`, :419 |
| C7 | a halted run stays halted at more fuel | **MISSING** | no monotonicity lemma in Interp.lean (`run` :146); C3 is stated at EXACTLY `p.length+1` |

#### D. Hash determination

| # | Law | Status | Evidence |
|---|---|---|---|
| D1 | an accepting put answers `H (encodeNode n)` — fresh AND duplicate, no premise on `H` | PROVED | `putWord_answer`, :1401 |
| D2 | a put leaves the word unchanged or appends exactly its own binding | PROVED | `putWord_word`, :1428 |
| D3 | every `CasSig` line is hash-determined | PROVED | `PLine.hashDetermined`, :1496 |
| D4 | on a `done` run the threaded history IS `answersFrom`, and its length is `p.length` | PROVED | `runPFrom_done_answers`, :1537 |
| D5 | `answersFrom` cons law | PROVED | `answersFrom_cons_of`, :1602 |
| D6 | `answersFrom H env p` is a PREFIX of `answersFrom H env (p ++ q)` | PROVED | `answersFrom_prefix`, :1868 |
| D7 | "a total function … that **no handler may contradict**" | ASSERTED, and FALSE as written | docstring :1454-1455; `replayHandler` (Handler.lean:279-287) contradicts it — see **H-2** |
| D8 | the `answersFrom` SPLIT law (not just prefix) | **MISSING** | see §3 L-D8 |

#### E. The envelope sandwich and the frame

| # | Law | Status | Evidence |
|---|---|---|---|
| E1 | every consulted address is an enveloped literal or a history entry | PROVED | `PProg.resolve_sound` :1332, `PProg.touches_sound` :1355 |
| E2 | resolution changes only ADDRESSES; kinds come from the table | PROVED | `resolveRefs_kinds`, :1248 |
| E3 | the word only GROWS, by a `Sublist` of the declared put shapes, IN ORDER | PROVED | `runPFrom_puts_sound` :1618, `runP_puts_sound` :1672 |
| E4 | a refusal naming an absent address names an enveloped one | PROVED | `runPFrom_absent_sound` :1766, `runP_absent_sound` :1839 |
| E5 | a run that completes a prefix continues at the DETERMINED history | PROVED | `runPFrom_append_done`, :1887 |
| E6 | FRAME-1, per line, at the determined history | PROVED | `runPFrom_frame_sound`, :1944 |
| E7 | FRAME-1 at the table | PROVED but VACUOUS at `pre = []` | `runP_frame_sound`, :1965 — see **H-8** |
| E8 | a load's outcome is a function of the word AT its resolved address | PROVED | `runPFrom_load_absent` :1992, `runPFrom_load_present` :2002 |
| E9 | the lower bound is inhabited with no reachability premise | PROVED | `runP_head_load_necessary`, :2011 |
| E10 | a closed dataflow cannot dangle, at any word | PROVED | `runPFrom_no_dangling` :2050, `runP_no_dangling` :2101 |
| E11 | the envelope's two over-approximations, exhibited | PROVED (witnesses) | GAP 1 :2135, GAP 2 :2149 |
| E12 | a refusing prefix ABSORBS its suffix | **MISSING** | see §3 L-E12 |
| E13 | `reads`/`puts`/`dataflow` are monoid homomorphisms on `++` | **MISSING** | see §3 L-E13 |
| E14 | the `puts` index and the `dataflow` index are DIFFERENT numberings | ASSERTED, in the wrong file | ProgProse.lean:28-31; nothing at the definition site (:1176, :1184) — see **H-10** |

#### F. The boundary (HD-1/HD-2)

| # | Law | Status | Evidence |
|---|---|---|---|
| F1 | the property `PLine.HashDetermined` | PROVED for `CasSig` | :1480, :1496 |
| F2 | an operation OUTSIDE the boundary exists | PROVED (witness) | closing `example`, :2190-2198: one `AgentSig` program, two oracles, two answer histories, `by decide` |

#### G. Lowering and hosts

| # | Law | Status | Evidence |
|---|---|---|---|
| G1 | `Tree.prog` runs to the term's fold address; the word grows by a Sublist of `flatten`; the projected store is `flatten`'s | PROVED under `Function.Injective H` and `Honest H w` | `putTree_correct`, TreeProg.lean:467; empty-word corollary :484 |
| G2 | `treeProg tr` computes the term | **GATED, not proved** | VectorPrograms.test.ts:21-41 over 7 registered terms; named OWED as Lane D in CORE-ABSTRACTIONS-PLAN.md §1 |
| G3 | `Tree.table = treeProg` (the two `PProg` walks agree) | **FOLKLORE** | one `#guard` on one two-node witness, ProgProse.lean:298-299, comparing put SHAPES only; ProgProse.lean:225 says outright "The two walks agreeing is prose, not a theorem" |
| G4 | `Programs.ts` mirrors `encodeProg` byte for byte | GATED | Programs.test.ts:103-132 against `VectorProgramAddresses.json` |
| G5 | `RunParams` is a lossless spelling of `PProg` | PROVED | `toPProg_ofPProg` Mcp.lean:446, `ofPProg_isSome` :436, `run_ofPProg` :458 |
| G6 | the lift document round trip | PROVED | `decodeLift_encodeLift` Decode.lean:513, `encodeLift_decodeLift` :619, `decodeLift_inj` :633 |
| G7 | `Programs.runProgram` is `runP` | ASSERTED, and FALSE on the word | Programs.ts HEAD docstring "RUN A PROGRAM: `Cas.Lang.runP` against a real store" — see **H-1** |
| G8 | anything at all executes `runP` | **NOTHING DOES** | `runP` appears in Mcp.lean, Defun.lean, Fragments.lean, Representation.lean, and one Programs.ts comment — in statements and prose only; no `lake exe`, no fixture, no test — see **H-5** |

### 1.3 What `runP` satisfies algebraically, and is not said to

`runP` is presented as "the direct interpreter" and nothing more. Three
algebraic facts hold of it and are nowhere stated as such:

1. **`runPFrom` is a partial monoid action of `(PProg, ++, [])` on the
   state `(env, w)` — everywhere except at the unit.** `[]` is not an
   identity: `runPFrom H env [] w` HALTS, reporting `env.getLast?`
   (:273-276). The action law exists only in its `done` half
   (`runPFrom_append_done`, :1887). Its refusing half (L-E12) is
   missing, and with it the plane has no unconditional composition law
   — which is exactly what a scheduler splitting a table, or an
   incremental executor resuming one, needs.
2. **`answersFrom` is the `H`-indexed FOLD that `runPFrom` threads.**
   `runPFrom_done_answers` (:1537) proves the equality on `done` runs;
   `answersFrom_prefix` (:1868) gives the prefix order. The fold's own
   split law (L-D8) is not stated, so `answersFrom` cannot be computed
   compositionally even though it is a pure recursion on first-order
   data.
3. **`reads`, `puts` and `dataflowFrom` are monoid homomorphisms** from
   `(PProg, ++)` into `(List _, ++)` — `reads` is a `flatMap` (:1170),
   `puts` a `filterMap` (:1176), `dataflowFrom` an explicit append
   (:1184-1189). None of the three homomorphism equations is stated
   (L-E13), so no modular envelope analysis is licensed even though the
   definitions are literally homomorphic.

The consolidation these three want is in §3. None of them needs a new
sort.

---

## 2. BREAKER VIEW — the attacks

Fourteen findings, ranked. Each carries an exhibit; where a witness is
already in the estate, it is named rather than invented.

---

### H-1 — CROSS-CARRIER, exhibited by a green registered vector: "the word" is two different objects

**Class:** conformance (γ), claim-scope.

Lean's reference handler answers a DUPLICATE put by leaving the word
unchanged (`referenceHandler`, Handler.lean:84-85: `.fresh a _ =>
.ok (a, w ++ [Binding.mk a n])`, `.duplicate a => .ok (a, w)`), and
`putWord_word` (:1428) proves the word either grows by exactly the
binding or does not grow. The host pushes unconditionally:

```
// Programs.ts (HEAD), runProgram, put branch
answered = yield* store.put({ … })
word.push(answered)
```

So the host's `RunOutcome.word` is *the addresses answered by puts*,
while Lean's `Word` is *the bindings admitted*. They coincide on tables
with no duplicate put and diverge on every other one.

**EXHIBIT (already in the estate, and green).** The registered
conformance vector `shared-chunk` — described in
tools/Vectors.lean:60-62 as "the word carries a duplicate binding that
replays as a dedup" — lowers to a five-line table whose lines 0 and 2
are IDENTICAL (`VectorProgramLifts.json`, verified: instructions 0 and
2 agree field for field; `VectorProgramAddresses.json` shows the same
step address twice). Its vector word carries 5 bindings with one
address repeated (`library/cas/vectors/shared-chunk.json`).

```
LAW        the cross-host observation is the word (R5,
           EFFECTS-BACKEND.md:88-95)
FALSIFIER  exhibit a table p and a word w with
           (runP H p w).2 ≠ w ++ (the host's RunOutcome.word)
WITNESS    p = treeProg blobSharedChunk (5 lines, lines 0 and 2 equal),
           w = []
           Lean:  (runP sha256Addr p []).2 has 4 bindings
                  (line 2's put answers `duplicate`; putWord_word :1428)
           Host:  runProgram(store, p).word has 5 entries
BATTERY    none exists. Programs.test.ts:166-167 asserts
           `byAddress.word.length === lift.instructions.length`,
           which BAKES THE DIVERGENCE IN as a gate.
```

The same divergence is served: `cas_run`'s reply is
`outcome.word.map(address => ({address}))` (handlers.ts:239), while
Mcp.lean:152-154 declares "The run tool's reply: the word, in admission
order" and Mcp.lean:30 declares the tool's meaning is "`Cas.Lang.runP`
and nothing else". On `shared-chunk` the served reply has one more
entry than the declared meaning.

**Note what is NOT wrong.** The host is arguably computing the more
useful object, and `Tree.flatten` (the vector fixture) is the same
object. The defect is that one word — "the word" — names two things,
and R5's conformance claim is attached to whichever one is convenient.

---

### H-2 — CLAIM-SCOPE: "no handler may contradict" is false; `replayHandler` contradicts it

**Class:** claim-scope.

`PLine.HashDetermined`'s docstring states the boundary ruling that
Fragments.lean:64-69 cites as law:

> "An operation is *hash-determined* when a total function from its
> arguments to its answer exists that **no handler may contradict**."
> (Defun.lean:1453-1455)

The DEFINITION quantifies over words and over `runPFrom` only
(:1480-1482) — that is, over the reference handler alone. It does not
quantify over handlers.

```
LAW        no handler of CasSig may answer a put anything other than
           PLine.answer H env l
FALSIFIER  exhibit a handler h of CasSig and a state where
           h.handle (.put n) w answers b ≠ H (encodeNode n)
WITNESS    h = replayHandler (Handler.lean:279-287)
           w = [Binding.mk a n] with a ≠ H (encodeNode n)
           replayHandler.handle (.put n) w = .ok (a, [])
           PLine.answer H [] (.put …) = some (H (encodeNode n)) ≠ some a
           (Word.wf does not constrain addressing — that is `Honest`,
            Tree.lean:250, which replay does not require)
```

The honest statement is the one `putWord_answer` (:1401) proves: the
REFERENCE handler cannot contradict it, at any word, with no premise on
`H`. Every other handler is claimed against the reference by
observational agreement (R10), not by this property. Since HD-1's
docstring is what the estate's build/agent boundary ruling cites, the
overclaim is load-bearing.

---

### H-3 — CLAIM-SCOPE on a RATIFIED, byte-gated surface: `decodeProg_encodeProg` cited without its premises

**Class:** claim-scope.

The theorem carries two premises (`hwf`, `hsep`; Defun.lean:998-1000)
and the module triages both honestly at :907-935, including the
necessity witness at :1023. `Cas/Lang/Fragments.lean:88-92` restates
both correctly. Three other surfaces do not:

- **REGISTRY.md:35** — the ratified `cont` sort row, GENERATED from
  `Cas/Grammar/Manifest.lean:633-640` and byte-gated:
  "`Cas.Lang.decodeProg_encodeProg` is the landing that earned the row:
  a table stored as content and recovered from that content is the same
  table". No premise.
- **library/cas/Cas.lean:122-128** — the library's own orientation
  docstring: "`encodeProg`/`decodeProg` lay that table down as store
  content and read it back (`decodeProg_encodeProg`, …)". No premise.
- **Programs.ts (HEAD), closing docstring paragraph** — names `hsep`
  and then discharges it: "Under SHA-256 the premise is the collision
  resistance this host already assumes everywhere else, so it is
  inherited rather than restated."

The third is the C5 problem in miniature: `hsep` is *injectivity of `H`
on this table's line encodings*, a mathematical premise; "collision
resistance" is a computational assumption about SHA-256 with no
judgment named at that site and no trust statement cited
(docs/lab-core/TOOLS.md is not referenced). The estate has a hash
lattice vocabulary for exactly this distinction (`encodeProg_wf` is
called "Level 0, no injectivity anywhere", :867-870; `putTree_correct`
takes `Function.Injective H` outright, TreeProg.lean:468) and this
sentence steps outside it.

```
FALSIFIER  exhibit a reader of REGISTRY.md:35 who concludes recovery is
           unconditional, then exhibit the table that defeats them
WITNESS    the estate's own: Defun.lean:1023-1038 — H constant,
           p = [.load (.ans 0), .load (.ans 1)], every line WF, the word
           still admits (encodeProg_wf), and decodeProg returns a
           one-line table where p had two.
```

---

### H-4 — CROSS-CARRIER: `decodeProg` and `loadProgram` have different domains, in two independent ways

**Class:** conformance (γ), adequacy.

`Programs.ts` (HEAD) says `loadProgram` is "`Cas.Lang.decodeProg`
against a real store instead of against a word". They are not the same
function.

**(a) Positional vs address-keyed.** `decodeProg` reads `w.getLast?`
(:941) — it recovers a program only from a word that IS exactly that
program's encoding. `loadProgram` takes an ADDRESS and loads the cont
node there. The shipped door (`cas_run_ref`, handlers.ts:248-253;
`runProgramAt`, Programs.ts HEAD) is the address-keyed one, and it has
NO model-level counterpart at all.

```
FALSIFIER  exhibit a word in which a program is recoverable by address
           but decodeProg answers none
WITNESS    w = encodeProg H p ++ [b] for any binding b whose node is not
           a cont node (e.g. any value node put afterwards).
           decodeProg w = none (w.getLast? is b, tag ≠ contWireTag)
           loadProgram(store, contAddress) still recovers p.
           Every real store is of this shape after its second program.
```

**(b) The declared line count.** Lean's `decodeProg` never reads the
cont node's payload (:939-945) — it maps over `b.node.refs` and
ignores `b.node.payload` entirely. The host refuses on disagreement
(`contRefusal`, Programs.ts HEAD: "the program at … declares N lines
and names M"). The manifest declares the field with a MEANING
(`Cas/Grammar/Manifest.lean:618-620`: `lineCount`, "how many code
points the table holds") that the Lean decoder does not enforce.

```
FALSIFIER  exhibit a word both decoders read differently
WITNESS    w = [Binding (lineAddr H l) (encodeLine l),
                Binding a ⟨0, contWireTag, nat32 7, [⟨stepWireTag, lineAddr H l⟩]⟩]
           Lean  decodeProg w = some [l]      (payload ignored)
           Host  loadProgram refuses          (declares 7, names 1)
BATTERY    none — the fail-closed suite (Programs.test.ts) tests the
           host's refusal and no Lean statement contradicts it, so the
           divergence is invisible on both sides.
```

The estate's own rule for this shape is on the JSON door and points the
other way: "Decoding validates; it never repairs" (Lift/Decode.lean:54).

---

### H-5 — ADEQUACY: `runP` is executed by nothing, and the "cross-host run gate" does not run it

**Class:** conformance (γ), adequacy.

`runP` occurs in exactly five files
(`Cas/Lang/{Defun,Fragments,Representation}.lean`,
`Cas/Backend/Mcp.lean`, one Programs.ts comment) and in every one of
them as a STATEMENT or as prose. No `lake exe` computes it, no fixture
is derived from it, no test asserts against it. Yet Defun.lean:409-412
says:

> "`runP` is what the emitter's gate executes, at the exact fuel
> `p.length + 1`; … This corollary … is what makes R5's word
> observation and that equation ONE thing rather than two claims that
> resemble each other."

What the gates actually execute:

- `tools/EmitPrograms.lean` computes `treeProg`, `lineAddr` (:96),
  `contAddressOf` (:100), and the document round trip through
  `encodeLift`/`decodeLiftBytes` (:178-191) — all ENCODE-side. It
  emits no word and says so (:90-92).
- `VectorPrograms.test.ts:21-41` runs the GENERATED TypeScript program
  and compares its answered addresses to `vector.word`, which is
  `tree.flatten sha256Addr` (tools/Vectors.lean:35) — i.e. to the
  grammar term's flatten, an object `putTree_correct`
  (TreeProg.lean:467-473) proves the run's word is only a SUBLIST of.
- `Programs.test.ts` compares host addresses to `VectorProgramAddresses.json`,
  which is also encode-side.

So R5's "one program, the Lean interpreter and the generated Effect
runtime, identical words or red" (EFFECTS-BACKEND.md:93-95) is carried,
on this plane, by a comparison in which the Lean interpreter never
runs. The gate is a real and useful gate — it pins the ANSWER HISTORY
against `flatten` and the ENCODING against the digest — but it is not
the gate the prose names.

```
FALSIFIER  change runP's word semantics (e.g. make a duplicate put
           append) and exhibit a red gate
WITNESS    no gate goes red. Defun.lean would still compile; every
           fixture, every test, and every generated byte is unchanged.
```

A second, sharper version of the same hole: `ObsEq_embed_of_runP`
(:419) relates TWO TABLES inside Lean; the shipped gate relates ONE
table across two hosts. These are different judgments, and the
docstring at :406-418 spends its paragraph collapsing them.

---

### H-6 — ADEQUACY: `PLine.WF` is not the encodability condition it is used as

**Class:** domain, adequacy.

`PLine.WF` (:191-195) bounds a put's payload and reference count below
`2^32` and each answer index below `2^32`. It is the condition carried
by `decodeLine_encodeLine` (:635), by `decodeProg_encodeProg`'s `hwf`
(:999), by `Mcp.ofPProg_isSome` (Mcp.lean:436), by the lift door
(`PLine.wf`, Decode.lean:115), and — mirrored field for field — by the
host's `bounded` gate (Programs.ts HEAD). It does not imply that the
step node the line encodes is ADMISSIBLE.

`encodeLineBody (.put v t payload refs)` has length
`11 + |payload| + Σ(1 + |encodePIn|)` (Defun.lean:544-548, with
`frame bs = nat32 bs.length ++ bs`, Codec/Bytes.lean:36), while
`Node.WF n` requires `n.payload.length < 2^32`
(Core/Node.lean:47-48).

```
LAW        (implicit everywhere) a WF line encodes to an admissible node
FALSIFIER  exhibit l with l.WF and ¬ Node.WF (encodeLine l)
WITNESS    l = .put 0 0 (List.replicate 4294967285 0) []
           PLine.WF l          : 4294967285 < 4294967296  ✓
           |encodeLineBody l|  = 4294967296  → ¬ Node.WF (encodeLine l)
           so putWord H (encodeLine l) w = .error .notWellFormed
           while encodeProg_wf (:871) still reports Word.wf = true,
           because Word.wf never inspects Node.WF (IR/Word.lean:141-150).
BATTERY    none. The host's `bounded`/`wfRefusal` gate mirrors PLine.WF,
           so it inherits the same hole.
```

The value is not physically reachable, and that is beside the point: the
STATEMENT "the encoded table admits as a word" (Defun.lean:63-64,
:866-870) is read by consumers as "the store will take it", and it does
not say that. The working-tree diff on `Programs.ts` closes a
neighbouring member of this class (host `number` fields wider than
Lean's `UInt8`) and does not close this one.

---

### H-7 — IDENTITY: the version byte is a free parameter, so a table has many addresses

**Class:** abstraction, claim-scope. Bears directly on R4.

`decodeLine` gates on the tag alone (:582-583) and `decodeLine_exact`
(:826-827) concludes about `n.tag` and `n.payload` — never `n.version`.
`encodeLine` always writes `schemeVersion` (:578-579).

```
LAW        "one byte representation per code point" (Defun.lean:661-662)
FALSIFIER  exhibit two distinct nodes decoding to the same line
WITNESS    n₁ = ⟨schemeVersion, stepWireTag, encodeLineBody l, []⟩
           n₂ = ⟨7,             stepWireTag, encodeLineBody l, []⟩
           decodeLine n₁ = decodeLine n₂ = some l,  n₁ ≠ n₂
CONSEQUENCE encodeProg is not the only word that decodes to p. A cont
           node naming version-7 step nodes decodes to the same table at
           a DIFFERENT cont address, so "the program's address is its
           identity" (Programs.ts HEAD; EmitPrograms.lean:98-103) holds
           only for words the canonical encoder produced — the very
           closure `decodeProg_exact` (B9) would supply and which does
           not exist.
```

The host has the identical hole (`decodeLine`, Programs.ts HEAD, checks
`node.kind.tag === StepKindTag` only), so the two carriers are
consistent — consistently open. Contrast the lift door, which refuses
every non-canonical spelling by ruling (Decode.lean:48-59).

---

### H-8 — CLAIM-SCOPE: FRAME-1 at the table is vacuous at the first line, and bundles a premise its frame half does not use

**Class:** claim-scope.

`runP_frame_sound` (:1965-1974) takes
`hreach : runPFrom H [] pre w = (.done b, w')`. At `pre = []` that
hypothesis is UNSATISFIABLE: `runPFrom H [] [] w` matches the nil
clause with `env = []`, so `env.getLast? = none` and the result is
`(.refused (.failed "defun: empty program"), w)` (:273-276) — never
`.done`.

```
FALSIFIER  instantiate FRAME-1 at the first line of a table
WITNESS    pre = [], l = the table's first line. hreach is false, so the
           theorem says nothing about line 0 of any table.
```

Line 0 IS covered — by `runPFrom_frame_sound` (:1944), which takes no
run premise — and indeed the frame conjunct of `runP_frame_sound` is
proved by `simpa using runPFrom_frame_sound H [] pre l post` (:1974),
using `hreach` not at all. So the statement's shape overstates its
dependence in one conjunct and is empty in the other. Fragments.lean's
interop claim 1 (:200-212) cites `runP_frame_sound` as the whole-table
theorem; a consumer reading it and instantiating at `pre = []` gets
nothing.

---

### H-9 — MISSING LAW: refusal does not absorb, so the table monoid has no unconditional composition law

**Class:** contract, adequacy.

`runPFrom_append_done` (:1887) gives the composition law only when the
prefix reports `done`. Nothing states the other half. A scheduler that
splits a table, an executor that resumes one, or a client that reasons
about `p ++ q` from `p`'s outcome has no theorem when `p` refuses.

```
LAW (owed) runPFrom H env pre w = (.refused r, w') →
           runPFrom H env (pre ++ post) w = (.refused r, w')
FALSIFIER  exhibit env, pre, post, w where the suffix changes a refusing
           prefix's outcome
STATUS     believed true by inspection of every clause of :271-290;
           carried by nothing. Until it is stated, "the lines after a
           first refusal never execute" (Fragments.lean:71-73,
           EFFECTS-BACKEND-adjacent prose, and GAP 1's own narration at
           :2131-2134) is FOLKLORE — GAP 1's `example` (:2135-2141)
           exhibits one instance by `rfl`, not the law.
```

---

### H-10 — UNDERSPECIFICATION: the envelope's two numberings, and what a wrong consumer does with them

**Class:** adequacy (a wrong implementation satisfies the stated laws).

`PProg.puts` is a `filterMap` (:1176) so it numbers PUTS; `dataflowFrom`
counts LINES (:1184-1189). On any table containing a `load` the two
numberings disagree, and nothing at either definition site says so.
ProgProse.lean:28-31 states it — in a different module, in a docstring
about prose.

```
LAW (absent) the edge (i,j) of an envelope's dataflow refers to
             puts[i]
FALSIFIER    exhibit a table where a consumer pairing them is wrong
WITNESS      p = [.load (.lit a), .put 0 0 [] [(t, .ans 0)]]
             PProg.puts p     = [⟨0,0,[],[t]⟩]        (one entry, index 0)
             PProg.dataflow p = [(1, 0)]              (line 1 reads line 0)
             A grant checker reading "put 0 consumes line 0's answer"
             is describing a put that sits at line 1.
```

Adjacent and worth stating with it: `Envelope` does not record the
LOADS at all — no count, no positions — so `envelope p = envelope q`
does not determine `runP p = runP q`. That is correct for a GRANT (an
upper bound) and is exactly wrong for anyone who reads `Envelope` as a
program summary. Nothing states which reading is licensed.

---

### H-11 — CLAIM-SCOPE: the designated result is observed by nothing

**Class:** conformance (γ).

`PProg`'s contract is "the designated result is the last answer"
(:12, :186, :213). `ObsEq` carries that value on the `done` branch
(`interpretRef H p w = .ok (a, w')`, Representation.lean:134-135, and
`ObsEq.run_done` :182). No host observes it:

- the generated program returns the WHOLE answer array
  (`progProgram`: `stmts ++ [.ret (.arr vars)]`, EmitProg.lean:126,
  with `vars = a0 … a_{n-1}`);
- `RunOutcome` has `word` and `answers` and no result field
  (Programs.ts HEAD);
- `cas_run`'s reply is `{word}` only (Mcp.lean:152-154,
  handlers.ts:239).

```
FALSIFIER  exhibit a host that answers the WRONG designated result and
           passes every gate
WITNESS    a host returning answers[0] instead of answers[n-1]:
           VectorPrograms.test.ts compares the whole array, so it is
           unaffected; Programs.test.ts compares addresses; no gate
           reads a designated result at all.
```

Either the last-answer contract is load-bearing and a gate is owed, or
it is a Lean-internal convenience and the prose should stop calling it
the program's result.

---

### H-12 — MISSING LAW: no fuel monotonicity

**Class:** claim-scope.

`runP_embed_agree` (:362) is stated at fuel EXACTLY `p.length + 1`.
`Interp.lean` (`run`, :146-153) carries no lemma saying a halted run is
stable under more fuel. A consumer that budgets fuel generously — the
natural thing for a host or a scheduler — has no theorem, and
`ObsEq.of_run` (Representation.lean:162) quantifies fuel existentially
rather than supplying it.

```
LAW (owed) (run H f p w).1.isRunning = false → f ≤ g →
           run H g p w = run H f p w
```

---

### H-13 — INCONSISTENCY: three lowerings, one gate, and a generated docstring that mixes two of them

**Class:** abstraction, conformance.

Three walks take a `Tree` to a straight line:
`Tree.progK` (TreeProg.lean:40, into `Prog`), `lowerTree`/`treeProg`
(EmitProg.lean:55, into `PProg`), `lowerTable`/`Tree.table`
(ProgProse.lean:238, into `PProg`). No theorem relates any pair.
`ProgProse.lean:225` says so in as many words: "The two walks agreeing
is prose, not a theorem."

The generated program's own docstring is assembled from BOTH `PProg`
walks:

```
-- EmitPrograms.lean:124
let doc := (point :: tree.2.docLines) ++ [stampLine (treeProg tree.2)]
--                    ^ ProgProse's walk        ^ EmitProg's walk
```

so a generated module can carry prose describing table A above code
lowered from table B. The byte gate cannot see it: both halves are
regenerated from the same sources, so the file is self-consistent and
stable, and only a walk-vs-walk disagreement — which no gate compares —
would be wrong.

```
FALSIFIER  perturb lowerTable (e.g. swap the parent's child order) and
           exhibit a green build
WITNESS    the only pin is ProgProse.lean:298-299 — one `#guard`, on one
           two-node witness (`wLeaf`), comparing PUT SHAPES only
           (`PProg.puts wLeaf.table == (wLeaf.flatten noH).map
           PutShape.ofNode`). Reference operands and dataflow are not
           compared, and no term with a `parent`, `entry`, `manifest`
           or `file` node is covered — so a child-order swap in any of
           those four arms survives it.
```

This is the BREAKER's "sampling as proof" shape (BREAKER.md §1.1)
sitting under the estate's flagship generated artifact.

---

### H-14 — STALE PROSE contradicting live code, in three ratified or near-ratified files

**Class:** claim-scope (documentation drift). Each is a one-line fix,
but each currently mis-states the plane to its own reader.

| Site | Says | Live fact |
|---|---|---|
| `Cas/Backend/Mcp.lean:69-76` | "`Cas.Backend.EmitProg` lowers a `Tree` straight to TypeScript statements over host variable NAMES; it never builds a `PProg`, so there is no carrier shared with this document and no theorem relating the two." | `treeProg` (EmitProg.lean:85) builds a `PProg`; `progProgram` (:119) prints FROM the table. The shared carrier exists; only the theorem is still missing. |
| `Cas/Backend/ProgProse.lean:37-41` and :222-225 | "routing the emitter itself through `PProg` is its own slice … and is not taken here"; "`EmitProg.lowerTree` lowers a `Tree` straight to host statements over variable NAMES" | same — the routing landed. |
| `library/cas/Cas.lean:134-137` | "wire tags 14 and 15 (`step`, `cont`) remain RESERVED rows spelled outside `Ty`, pinned to `REGISTRY.md` by `#guard`, and ratifying either into `Ty` is its own slice." | Ratified 2026-08-29. `stepWireTag`/`contWireTag` are abbreviations of `Ty.step.wireTag`/`Ty.cont.wireTag` (Defun.lean:139-143); the reconciliation note (:145-162) records the discharge; REGISTRY.md:35 reads "RATIFIED core". |

---

## 3. THE CLEAN ALGEBRA — how the law list should read

Decision 2 binds: **no new sorts, no new carriers.** Every item below is
either an existing theorem kept, an existing statement strengthened, a
law stated over existing carriers, or a proof owed. Two items are
flagged as ruling questions instead of proposals.

### 3.1 The signature, unchanged

The six sorts of §1.1 are the right six. `PProg = List PLine` with
`++` is the carrier; `PIn`'s two constructors are exactly the two
sources of an address and the sandwich's read half depends on there
being no third (:1325-1327). Nothing here needs to move.

**One vocabulary correction, no sort.** The plane observes THREE
distinct things and calls two of them "the word":

| Object | Type | Where it lives |
|---|---|---|
| the answer HISTORY | `List Addr32` | `PProg.answersFrom H [] p` (:1385) — hash-determined, host-computable, equals `Tree.flatten`'s addresses on an all-put table |
| the store WORD | `Word` | `(runP H p w).2` (:293) — dedup'd, store-relative |
| the designated RESULT | `Addr32` | the `.done a` payload |

Naming these apart is the whole consolidation. It mints nothing:
`answersFrom` already exists and `runPFrom_done_answers` (:1537)
already proves the interpreter threads exactly it.

### 3.2 The law list

**KEEP as stated** — A1–A8, A10, B1, B3–B8, C1–C6, D1–D6, E1–E11, F1,
F2, G1, G5, G6. These are the proved core and none of the attacks
above lands on any of them.

**STRENGTHEN** (the statement is right, its scope or its prose is not):

- **L-S1 (from H-3).** `decodeProg_encodeProg`'s two premises travel
  with every citation. Concretely: `Cas/Grammar/Manifest.lean:633-640`
  (which generates REGISTRY.md:35) and `Cas.lean:122-128` gain the
  clause Fragments.lean:88-92 already carries. Programs.ts's
  "collision resistance … inherited rather than restated" sentence
  names its judgment or is struck.
- **L-S2 (from H-2).** `PLine.HashDetermined`'s docstring says "the
  REFERENCE handler may not contradict"; the quantifier over handlers
  is either dropped or turned into the theorem it wants —
  `∀ h, HandlerHonest h → …` — with `replayHandler` named as the
  handler outside it.
- **L-S3 (from H-8).** `runP_frame_sound` splits: the frame conjunct
  is restated without `hreach` (its proof already does not use it,
  :1974), and the reachability conjunct is restated so `pre = []` is
  admissible — either by taking `env` and `pre` as `runPFrom_append_done`
  does, or by adding the `pre = []` case as its own line.
- **L-S4 (from H-5).** Defun.lean:406-418 stops saying `runP` is what
  the gate executes. Either a gate executes it (see L-P1) or the
  paragraph says what the gate does execute.
- **L-S5 (from H-6).** The encodability condition is named for what it
  is. `PLine.WF` stays as the WIRE-FIELD condition; the ADMISSIBILITY
  condition `Node.WF (encodeLine l)` is stated separately wherever a
  consumer needs the store to take the encoding, and Defun.lean:63-64,
  :866-870 stop saying "admits" for `Word.wf`.
- **L-S6 (from H-14).** The three stale paragraphs are corrected.

**STATE-NEW** (laws over existing carriers; no sort, no carrier):

- **L-E12 (from H-9) — refusal absorbs.**
  `runPFrom H env pre w = (.refused r, w') →
   runPFrom H env (pre ++ post) w = (.refused r, w')`.
  With `runPFrom_append_done` (:1887) this makes `runPFrom` an
  unconditional partial action of `(PProg, ++)` on `(env, w)`.
- **L-D8 — the `answersFrom` split.**
  `(PProg.answersFrom H env p).length = p.length →
   PProg.answersFrom H env (p ++ q)
     = PProg.answersFrom H env p ++ PProg.answersFrom H (env ++ PProg.answersFrom H env p) q`.
  The length premise is exactly "p does not dangle" and is what D4
  (:1537) already produces on a `done` run.
- **L-E13 — the three homomorphisms.**
  `PProg.reads (p ++ q) = PProg.reads p ++ PProg.reads q`;
  `PProg.puts (p ++ q) = PProg.puts p ++ PProg.puts q`;
  `PProg.dataflowFrom i (p ++ q) = PProg.dataflowFrom i p ++ PProg.dataflowFrom (i + p.length) q`.
  Each is one `induction` over `p`; together they license every modular
  envelope argument the scheduler story wants.
- **L-C7 (from H-12) — fuel monotonicity** in `Interp.lean`, so
  `runP_embed_agree` is usable at any sufficient fuel.
- **L-B9 (from H-7, H-4b) — `decodeProg` exactness.** The dual the
  line level already has (`readLine_exact` :764, `decodeLine_exact`
  :826) and the table level does not: a successful `decodeProg` proves
  its input was `encodeProg H p` for the answered `p` — which requires
  the decoder to check the cont node's `version` and its declared
  `lineCount`, and `decodeLine` to check the step node's `version`.
  This is the closure that makes "the program's address is its
  identity" true rather than true-of-canonical-inputs, and it makes
  the two carriers' decoders one function again (H-4b).
- **L-E14 (from H-10) — the numbering note moves to the definition
  site.** Either a stated law
  (`PProg.puts p |>.length = p.length ↔ p contains no load`) or, at
  minimum, the ProgProse paragraph restated at Defun.lean:1176/:1184.
- **L-G3 (from H-13) — the two `PProg` walks are one.**
  `Tree.table tr = treeProg tr`, by induction on the term. Both are
  the same children-first recursion over existing carriers, so this is
  a statement, not a design.

**PROVE-OWED** (the estate already names these; this review adds their
falsifiers):

- **L-P1 — `treeProg` correctness** (G2, Lane D of
  CORE-ABSTRACTIONS-PLAN.md §1). The shape that closes H-5 at the same
  time: `runP H (treeProg tr) w = run H (tr.size + 1) tr.prog w` under
  `putTree_correct`'s premises, so the emitted table's meaning is
  `Tree.prog`'s and `runP` acquires an executed consequence.
- **L-P2 — the host observation, named and gated** (H-1, H-11). State
  which of the three objects of §3.1 the R5 gate decides. If it is the
  answer history — which is what every host computes and what
  `Tree.flatten` supplies — say so, and state the theorem
  `runPFrom_done_answers` already gives:
  `(runP H p []).1 = .done a → PProg.answersFrom H [] p` is the host's
  `answers`. Then `RunOutcome.word` is renamed for what it is, or the
  host stops pushing on `duplicate`. **This is the one finding whose
  fix is a behaviour choice rather than a statement**, and it belongs
  to the synthesizer.
- **L-P3 — address-keyed recovery** (H-4a). The shipped door
  (`loadProgram`, `cas_run_ref`) needs a model. Over existing carriers
  this is a definition `Word → Addr32 → Option PProg` plus the theorem
  that it recovers `p` from `encodeProg H p ++ v` for any admissible
  `v`. **Flagged as a ruling question**: it needs no new sort and no
  new carrier, but it does need a new top-level definition, and the
  estate's minting discipline should rule whether that counts before
  the lane opens.

### 3.3 The two ruling questions

1. **Does `answersFrom` become the named cross-host observation?**
   R5 says the observation is the word (EFFECTS-BACKEND.md:88-95). On
   this plane every host computes the answer history instead, and the
   registered `shared-chunk` vector makes the two differ. The choice —
   rename the host's object, or change the host to dedup, or ratify
   the answer history as the plane's observation alongside the word —
   is above a reviewer.
2. **Is a new top-level definition over existing sorts "a new
   abstraction" under decision 2?** L-P3 (address-keyed recovery) and,
   more weakly, L-B9's checked decoder both turn on it.

---

## 4. Pending, out of scope

`Cas/Lang/Worded.lean` and `Cas/Lang/WordWire.lean`
(merge/cas-word, `ad44b40b`) introduce `WordSig`/`since` and a
`LogEntry` receipt over the same word this plane leaves. They bear
directly on **H-1** (what "the word" is) and on **L-P2**, and were not
read. The synthesizer should re-run H-1 against them after the merge:
if `Worded.lean` fixes an observation, that is the seat where the
answer-history-versus-word question is already half-answered.

The daemon plane (merge/daemon-spine, `0aeeefd7`) serves `cas_run` and
`cas_run_ref` over HTTP and therefore inherits **H-1** and **H-4a**
unchanged; not read.
