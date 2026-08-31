# THE ALGEBRA — the estate's program, API, and semantics, stated once

**Status: PRE-GRADE. This document has not been grilled.** It is the
synthesis of the six area reviews of 2026-08-30 and it awaits the
operator's grilling pass exactly as `EFFECTS-BACKEND.md` awaited its
own on 2026-08-28. Nothing here is ratified. Section 4 holds the
questions the operator must answer before section 2's owed ledger can
be worked; section 3's falsifiers are the evidence those questions rest
on.

**What this document is for.** One page a newcomer or an agent reads to
know what the estate's store language *is*: its sorts, its signatures,
every law it holds and how each is carried, every hole where a wrong
implementation passes, and every question still open. It exists so that
"well, technically…" has nowhere left to stand — either a claim is
here with its carrier named, or it is not a claim the estate makes.

**Baseline.** main `7dac14d8`, Lean `leanprover/lean4:v4.33.1`. Two
working-tree files are dirty (`library/effects/src/cas/Programs.ts`,
`library/effects/test/Programs.test.ts`); every host citation below is
to `git show HEAD:`, and the in-flight diff is named where it bears
(§3.12). Two merge branches are pending and were not read —
`merge/cas-word` (`ad44b40b`: `Cas/Lang/Worded.lean`,
`Cas/Lang/WordWire.lean`, `src/cas/WordLog.ts`) and
`merge/daemon-spine` (`0aeeefd7`). Where a finding is expected to move
at either merge, it says so.

**Register.** Every claim carries a `file:line`. No soundness word
appears without its judgment named (AGENTS.md C5). The four status
words are used in exactly one sense each:

| Status | Means |
|---|---|
| **PROVED** | a kernel-checked Lean theorem, named, at `file:line` |
| **GATED** | a decidable executable check carries it; the gate is named |
| **ASSERTED** | the estate's prose states it; nothing executable carries it |
| **OWED** | the estate relies on it; nothing states it and no prose claims it |

`ASSERTED ✗` marks a prose claim against which a falsifier in §3 has
fired. Those are not merely unproved — they are wrong as written.

**Sources.** `.staging/algebraic-review/{prog-carrier, handlers-semantics,
defun-plane, word-store, schema-universe, host-api}.md`, with the
kernel-checked exhibit files `handlers-semantics-exhibits.lean` and
`word-store-exhibits.lean`. Read against `library/cas/EFFECTS-BACKEND.md`
(R1–R15, ratified 2026-08-28) and the obligation classes of
`.claude/skills/implement/CONTRACT.md:108-141`.

---

## 1. The sorts and the signatures

### 1.1 Sorts

Every carrier the estate's algebra is stated over, in one table. Plane
key: **L** = the language (`Cas/Lang/`), **W** = the word and store
(`Cas/IR/`, `Cas/Core/`), **G** = the grammar (`Cas/Grammar/`),
**S** = the schema universe (`Cas/Schema/`), **H** = the host mirror
(`library/effects/src/cas/`).

| Plane | Sort | Carrier | Site |
|---|---|---|---|
| L | `Sig` | `(Op : Type, Ans : Op → Type)` | `Cas/Lang/Sig.lean:13-15` |
| L | `Prog S A` | inductive: `pure a \| vis op k`; `A : Type u` | `Cas/Lang/Prog.lean:25-27` |
| L | `Handler S M` | one field `handle : (op : S.Op) → M (S.Ans op)`; `M : Type → Type v` | `Cas/Lang/Handler.lean:42-43` |
| L | `Status S A` | `done \| running \| refused` | `Cas/Lang/Interp.lean:42-45` |
| L | `Refusal` | six clause-named arms | `Cas/Lang/Interp.lean:28-34` |
| L | `RefM` | `StateT Word (Except Refusal)` — the reference target | `Cas/Lang/Handler.lean:74` |
| L | `PIn` | `lit (a : Addr32) \| ans (i : Nat)` | `Cas/Lang/Defun.lean:167-170` |
| L | `PLine` | `put (version tag : UInt8) (payload) (refs) \| load (src : PIn)` | `Defun.lean:180-184` |
| L | `PProg` | `abbrev PProg := List PLine` | `Defun.lean:187` |
| L | `PKind` | `put \| load` | `Defun.lean:1134-1137` |
| L | `PutShape` | `⟨version, tag, payload, refKinds⟩` | `Defun.lean:1155-1160` |
| L | `Envelope` | `⟨reads, puts, dataflow⟩` | `Defun.lean:1198-1202` |
| L | `RootedState` | `Word × List Addr32` | `Cas/Lang/Roots.lean:61` |
| W | `Bytes` | `List UInt8` | `Cas/Codec/Bytes.lean` |
| W | `Addr32` | `{ b : Bytes // b.length = 32 }` | `Cas/Core/Node.lean:27` |
| W | `Ref` | `(expectedTag : UInt8, addr : Addr32)` | `Cas/Core/Node.lean:31-34` |
| W | `Node` | `(version, tag : UInt8, payload : Bytes, refs : List Ref)` | `Cas/Core/Node.lean:38-43` |
| W | `Node.WF` | `payload.length < 2^32 ∧ refs.length < 2^32` | `Cas/Core/Node.lean:47-48` |
| W | `AdmittedNode` | `{ n : Node // n.WF }` | `Cas/Core/Node.lean:56` |
| W | `Binding` | `(address : Addr32, node : Node)` | `Cas/IR/Word.lean:29-32` |
| W | `Word` | `List Binding` | `Cas/IR/Word.lean:35` |
| W | `NonemptyWord` | `{ word : Word // word ≠ [] }` | `Cas/IR/Word.lean:39-41` |
| W | `Word.Admitted` | `NonemptyWord` + a `wf` proof | `Cas/IR/Word.lean:223-225` |
| W | `Store` | `Addr32 → Option Node` | `Cas/Core/Store.lean:21` |
| G | `Tree t` | the grammar term | `Cas/Grammar/Tree.lean` |
| G | `Honest H w` | `∀ p ∈ w, p.address = H (encodeNode p.node) ∧ p.node.WF` | `Cas/Grammar/Tree.lean:250-251` |
| S | `Ast` | 12 constructors: `null bool int str lit arr struct ref decl union enum tuple` | `Cas/Schema/Ast.lean:66-161` |
| S | `LitVal` | `null \| bool \| int \| str` | `Ast.lean:38-43` |
| S | `EnumValue` | `str \| int` (deliberately *not* `LitVal`) | `Ast.lean:60-63` |
| S | `SafeInt` | `{i : Int // i.natAbs ≤ 9007199254740991}` | `Ast.lean:32-35` |
| S | `DeclarationId` | 4 rows; `General` = the 3 non-dedicated | `Declarations.lean:129-140, 227-234` |
| S | `DeclPayload` | `null \| bool \| nat \| int \| str` | `Declarations.lean:56-62` |
| S | `UnionMode` | `anyOf \| oneOf` | `Union.lean:33-40` |
| S | `IngestRefusal` | 5 names | `Ingest.lean:86-107` |
| S | `El a` | the denotation, a `Type` | `El.lean:148-160` |
| S | `StoreRef t` | tag-retaining address | `El.lean:19-20` |
| S | `Json.Value` | the value plane's carrier | `Cas/Values/Json.lean` |
| H | `ContentId` | branded `string`, `/^[0-9a-f]{64}$/` | `Node.ts:23-26` |
| H | `Byte` | `Int ∈ [0,255]` | `Node.ts:15-18` |
| H | `CasNodeInput` | `{kind, payload: Uint8Array, refs}` | `Node.ts:46-51` |
| H | `CasError` | 7-member tagged union | `Node.ts:114-121` |
| H | `Operand` | `literal(ContentId) \| answer(number)` | `Programs.ts:102-104` |
| H | `Line` | `put(version,tag,payload,refs) \| load(source)` | `Programs.ts:120-128` |
| H | `Program` | `ReadonlyArray<Line>` | `Programs.ts:133` |
| H | `StoredProgram` | `{address, steps}` | `Programs.ts:340-343` |
| H | `RunOutcome` | `{word, answers}` | `Programs.ts:465-468` |

**The host has no `Word` sort.** What TypeScript calls a word is
`ReadonlyArray<ContentId>` (`Programs.ts:465-466`) — an address
sequence with the node halves discarded. That is not a naming
convenience; it is hole §3.1.

### 1.2 Signatures (`Sig` values) and their operations

| Signature | Operations → answers | Site |
|---|---|---|
| `CasSig` | `put (n : Node) → Addr32`; `load (a : Addr32) → Node`; `fail (r : String) → Empty` | `Cas/Lang/Ops.lean:21-33` |
| `LlmSig` | `infer (prompt : String) → String` | `Ops.lean:36-43` |
| `RootSig` | `publish (a : Addr32) → Unit`; `listRoots → List Addr32` | `Roots.lean:29-39` |
| `ByteSig` | `loadBytes → Option Bytes`; `presence → Bool`; `putBytes → Unit`; `fail → Empty` | `Tower.lean:36-49` |
| `AgentSig` | `CasSig ⊕ₛ LlmSig` | `Ops.lean:46` |
| `StoreSig` | `CasSig ⊕ₛ RootSig` | `Roots.lean:42` |

Four base signatures, two sums. `ByteSig` has no handler anywhere
(§3.6); `ByteE.presence` has no consumer anywhere (§3.6). `merge/cas-word`
adds a fifth, `WordSig`, summed with `CasSig` — every sum hole below
lands on it at the merge.

### 1.3 Operations of the carrier and its semantics

| Operation | Type | Site |
|---|---|---|
| `Prog.pure` | `A → Prog S A` | `Prog.lean:26` |
| `Prog.vis` | `(op : S.Op) → (S.Ans op → Prog S A) → Prog S A` | `Prog.lean:27` |
| `Prog.bind` | `Prog S A → (A → Prog S B) → Prog S B` | `Prog.lean:31-33` |
| `Prog.op` | `(e : S.Op) → Prog S (S.Ans e)` | `Prog.lean:38-39` — **0 call sites outside its own theorem** |
| `Prog.inl` | `Prog S A → Prog (S ⊕ₛ T) A` | `Prog.lean:41-44` |
| `Prog.inr` | `Prog T A → Prog (S ⊕ₛ T) A` | `Prog.lean:46-49` — **0 call sites** |
| `Sig.sum` (`⊕ₛ`) | `Sig → Sig → Sig` | `Sig.lean:20-25` |
| `interpret` | `[Monad M] → Handler S M → Prog S A → M A` | `Handler.lean:47-49` |
| `Handler.sum` | `Handler S M → Handler T M → Handler (S ⊕ₛ T) M` | `Handler.lean:63-66` — **0 call sites** |
| `Handler.through` | `Handler S (Prog T) → Handler T M → Handler S M` | `Tower.lean:65-67` |
| `idHandler` | `Handler S (Prog S)` | `Representation.lean:63-64` |
| `referenceHandler` | `(Bytes → Addr32) → Handler CasSig RefM` — **THE meaning** | `Handler.lean:78-92` |
| `replayHandler` | `Handler CasSig (StateT Word (Except Refusal))` | `Handler.lean:279-292` |
| `casOverBytes` | `(Bytes → Addr32) → Handler CasSig (Prog ByteSig)` | `Tower.lean:111-133` |
| `interpretRef` | `Prog CasSig A → Word → Except Refusal (A × Word)` | `Handler.lean:96-98` |
| `step` / `run` | small-step / fueled | `Interp.lean:70-85`, `:146-153` |
| `Prog.handleLlm` | `(String → String) → Prog AgentSig A → Prog CasSig A` | `Interp.lean:184-187` |
| `stepRooted` / `runRooted` | `StoreSig` small-step / fueled | `Roots.lean:69-81`, `:122-130` |
| `runPFrom` / `runP` | the direct table interpreter | `Defun.lean:271-290`, `:293` |
| `SemEq` / `ObsEq` | stratum-3 equalities | `Representation.lean:122-135` |

**Universe rider, load-bearing.** `Prog` is `A : Type u`-polymorphic
(`Prog.lean:25`); `Handler` targets `M : Type → Type v`
(`Handler.lean:42`). **Every law below is a law at answer-universe 0.**
A `Prog CasSig Type` is well-typed syntax for which `interpret`,
`interpretRef`, `step` and `run` do not typecheck (§3.20).

---

## 2. The law ledger

One numbered row per law. Where a family of lemmas discharges one
capability, the family is one row and the row says so. `H : Bytes →
Addr32` is universally quantified and carries **no hypothesis** unless
a row names one (§3.19).

### 2.1 The program carrier is a lawful monad

| # | Law | Status | Carrier |
|---|---|---|---|
| L1 | `p.bind .pure = p` | PROVED | `Prog.bind_pure_right`, `Representation.lean:39-44` |
| L2 | `(p.bind f).bind g = p.bind (fun a => (f a).bind g)` | PROVED | `Prog.bind_assoc'`, `Representation.lean:46-52` |
| L3 | `(Prog.pure a).bind f = f a` | PROVED | `rfl`, `Representation.lean:57` |
| L4 | `LawfulMonad (Prog S)` | PROVED | instance, `Representation.lean:54-58` (built from L1–L3, not `sorry`-carried) |
| L5 | `(Prog.op op).bind k = .vis op k` | OWED | `rfl`; proved in `handlers-semantics-exhibits.lean` §2 |
| L6 | the carrier is finite — no `Prog` diverges | PROVED by construction | `inductive Prog`, `Prog.lean:25-27`; `interpret` total by structural recursion |
| L7 | `(failWith r).bind f = failWith r` (failure absorbs its continuation) | OWED | provable by `funext` on `Empty`; every user of `require` assumes it |
| L8 | `require true r = pure ()`; `require false r = failWith r` | OWED | `rfl` both; `Ops.lean:59-60` |

### 2.2 Interpretation is a monad morphism

| # | Law | Status | Carrier |
|---|---|---|---|
| L9 | `interpret h (.pure a) = pure a` | PROVED | `interpret_pure`, `Representation.lean:110-111` (`rfl`) |
| L10 | `interpret h (p.bind f) = interpret h p >>= (interpret h ∘ f)` | PROVED | `interpret_bind`, `Handler.lean:53-60`; **for every handler into every lawful target** |
| L11 | `interpret h (Prog.op e) = h.handle e` | PROVED | `interpret_op`, `Representation.lean:115-117` — but its subject has 0 users (§3.21) |
| L12 | `interpret h (.vis op k) = h.handle op >>= fun a => interpret h (k a)` | OWED | `rfl`; today restated twice locally and never generally (§3.21) |
| L13 | "`interpret h` is a monad morphism" as ONE statement | OWED | L9 and L10 live in different files; no declaration names the conjunction |
| L14 | `interpret idHandler p = p` | PROVED | `interpret_id`, `Representation.lean:68-74` |
| L15 | agreement under every handler into every `M : Type → Type` implies `p = q` | PROVED | `eq_of_forall_interpret`, `Representation.lean:80-84` |
| L16 | `Handler.ext` — handlers agreeing per operation are equal | OWED | proved in `handlers-semantics-exhibits.lean` §3 |
| L17 | **uniqueness**: `interpret h = interpret g → h = g` | OWED | exhibits §3 |
| L18 | **existence**: every monad morphism out of `Prog S` is `interpret h` for some `h` | OWED | exhibits §4, nine lines. **L16+L17+L18 are what license R10's word "IS"** |
| L19 | `Prog S` is the free monad on `X ↦ Σ op, (S.Ans op → X)` | ASSERTED | `Lang.lean:21`; carried by nothing (§3.3) |
| L20 | `Prog` is INITIAL | ASSERTED ✗ | `EFFECTS-BACKEND.md:263` names L18; the theorem cited (L15) is L14 plus a specialization (§3.3) |

### 2.3 Signature sums — R2's algebra

Every row in this block is unstated. `Handler.sum` and `Prog.inr` have
zero call sites in the whole library (verified by grep at HEAD).

| # | Law | Status | Carrier |
|---|---|---|---|
| L21 | `(h.sum g).handle (.inl op) = h.handle op` | OWED | `rfl`; nowhere stated |
| L22 | `(h.sum g).handle (.inr op) = g.handle op` | OWED | `rfl`; nowhere stated |
| L23 | `interpret (h.sum g) p.inl = interpret h p` | OWED | exhibits §1. **The law every `liftCas` consumer assumes** |
| L24 | `interpret (h.sum g) q.inr = interpret g q` | OWED | exhibits §1 |
| L25 | `Prog.inl` is a monad morphism: `(p.bind f).inl = p.inl.bind (·.inl ∘ f)` | OWED | nowhere stated |
| L26 | `Prog.inl` injective | OWED | nowhere stated |
| L27 | `⊕ₛ` has a unit | — | **not stateable**: no `Sig.empty` exists — ruling Q7 |
| L28 | `⊕ₛ` associative / commutative | — | **false as equations** in Lean; needs a signature-morphism notion the estate does not have — ruling Q7 |
| L29 | our `⊕ₛ` + `inl`/`inr` are ITrees' `E +' F` with `Subevent` | ASSERTED ✗ | `EFFECTS-BACKEND.md:46-52`; `Subevent` is a resolution class closed under nesting, ours is two hand-applied functions (§3.2) |
| L30 | `Prog.handleLlm oracle = interpret (idHandler.sum ⟨fun (.infer q) => .pure (oracle q)⟩)` | OWED | the right-hand side is a **value** of the existing `Handler` — no new type |
| L31 | `handleLlm oracle (liftCas p) = p` | OWED | exhibits §6, three lines |
| L32 | `handleLlm` respects `bind` | ASSERTED | `Interp.lean:19, 181-183` says "monad morphism"; no judgment named (§3.4) |

### 2.4 The tower

| # | Law | Status | Carrier |
|---|---|---|---|
| L33 | `interpret h (interpret t p) = interpret (t.through h) p` | PROVED | `interpret_through`, `Tower.lean:71-85` — **one level, `Prog`-valued middle only** |
| L34 | `through` is associative | OWED | exhibits §5, one line from L33 |
| L35 | `idHandler` is a two-sided unit for `through` | OWED | exhibits §5 |
| L36 | "strata are free … interpretation composes all the way down to the admitted seams" | ASSERTED ✗ | `EFFECTS-BACKEND.md:213-216`; there is no bottom — `ByteSig` has no handler (§3.6) |
| L37 | a `Handler ByteSig M` exists, for any `M` | OWED | **none exists.** Grep over `library/cas`: nine `ByteSig` hits, all inside `Tower.lean` |
| L38 | `casOverBytes` over a faithful byte-plane handler agrees with `referenceHandler` word for word | OWED | honestly named at `Tower.lean:26-29`, ledger state `obligation`; **blocked on L37 — currently unstatable, not merely unproved** |
| L39 | `checkRefs (xs ++ ys) = checkRefs xs >>= fun _ => checkRefs ys` | OWED | `Tower.lean:104-106` hand-rolls the fold where `Prog.lean:18` states the house form is `foldlM`; L38's proof will need it |

### 2.5 Fuel, the small step, and the bridge

| # | Law | Status | Carrier |
|---|---|---|---|
| L40 | `step` on a `vis` IS the reference handler's clause, reified | PROVED | `step_handle`, `Handler.lean:131-144` |
| L41 | big-step `vis` unfolding | PROVED | `interpretRef_vis`, `Handler.lean:149-160` |
| L42 | `load` answers exactly the projected store | PROVED | `step_load_agrees`, `Interp.lean:88-93` (`rfl`) |
| L43 | a fresh put continues at the judged address; the word projects to the successor store | PROVED | `step_put_fresh`, `Interp.lean:98-108` |
| L44 | the step refuses exactly when the judgment rejects | PROVED | `step_put_error`, `Interp.lean:112-116` |
| L45 | one step preserves `Word.wf`; a run preserves it | PROVED | `step_preserves_wf` `Interp.lean:119-142`; `run_preserves_wf` `:163-177` |
| L46 | `run` reports `.running` only on fuel exhaustion | PROVED by construction | `Interp.lean:146-153` |
| L47 | a continuing step spends exactly one fuel | PROVED | `run_step_running`, `Interp.lean:156-159` |
| L48 | a halted `done` run reports the reference value AND word, at any fuel | PROVED | `interpretRef_of_run_done`, `Handler.lean:165-184` |
| L49 | a `refused` run reports the reference refusal — and nothing about the word | PROVED | `interpretRef_of_run_refused`, `Handler.lean:189-207` |
| L50 | a sufficient fuel EXISTS and is produced by the proof | PROVED | `run_of_interpretRef`, `Handler.lean:214-245` |
| L51 | the fueled `run` and the big-step reference are one semantics, past the produced fuel | PROVED | `run_interpretRef_agree`, `Handler.lean:255-272`; ledger row `discharged` |
| L52 | `run_halts`: `∀ p w, ∃ f, ∀ g ≥ f, (run H g p w).1.isRunning = false` | OWED | one line from L50; the table analogue exists (`runP_halts`, `Defun.lean:403-404`) |
| L53 | fuel monotonicity: halted at `f` implies the same result at every `f' ≥ f` | OWED | derivable from L48/L49/L50; **`runP_embed_agree` is stated at exactly `p.length+1`** |
| L54 | word monotonicity for general `run`: `∃ suffix, (run H f p w).2 = w ++ suffix` | OWED | the fragment has it (`runP_frame_sound`, `Defun.lean:1965`); general `run` does not |
| L55 | "divergence enters as fuel exhaustion" | ASSERTED | `EFFECTS-BACKEND.md:43-45`; precisely, `Prog` is inductive so **no `Prog` diverges** and `interpretRef` is the fuel-free total interpretation of the same programs (§3.22) |

### 2.6 Program equality — stratum 3

| # | Law | Status | Carrier |
|---|---|---|---|
| L56 | structural equality implies `SemEq` / `ObsEq` | PROVED | `SemEq.of_eq` `Representation.lean:127-128`; `ObsEq.of_eq` `:137-138` |
| L57 | halted agreeing runs **at every starting word** imply `ObsEq` | PROVED | `ObsEq.of_run`, `Representation.lean:162-178` — takes halting as a HYPOTHESIS (L52 unblocks it) |
| L58 | `ObsEq` transfers a `done` outcome with its word | PROVED | `ObsEq.run_done`, `Representation.lean:182-192` |
| L59 | `ObsEq` transfers a refusal WITHOUT its word | PROVED | `ObsEq.run_refused`, `Representation.lean:198-208` — the estate's model of claim-scope done right |
| L60 | "the equality the cross-host run gate decides per-program" | ASSERTED ✗ | `Representation.lean:130-133`; `ObsEq.of_run`'s `∀ w` hypothesis is discharged by nothing, and the gate runs from one starting state against a fixture (§3.5) |
| L61 | "no finer program equality exists" | ASSERTED ✗ | `EFFECTS-BACKEND.md:263`; true-but-empty as written, and the load-bearing direction is false (§3.3) |

### 2.7 The word

| # | Law | Status | Carrier |
|---|---|---|---|
| L62 | `find [] a = none`; first binding wins | PROVED | `Word.find_nil` `Word.lean:60`; definitional `:56-58` |
| L63 | `find w a = some n → find (w ++ v) a = some n` | PROVED | `find_append_of_some`, `Word.lean:62-71` |
| L64 | `find w a = none → find (w ++ v) a = find v a` | PROVED | `find_append_of_none`, `Word.lean:73-82` |
| L65 | `find w a = some n → ⟨a,n⟩ ∈ w`, and the converse `isSome` | PROVED | `find_mem` `:85-96`; `find_isSome_of_mem` `:99-109` |
| L66 | the packaged overlay: `find (w ++ v) a = (find w a).orElse (find v a)` | OWED | packages L63+L64; every consumer states the halves separately |
| L67 | `resolvesIn w r ↔ ∃ m, find w r.addr = some m ∧ m.tag = r.expectedTag` | PROVED | `resolvesIn_iff`, `Word.lean:118-131` |
| L68 | `resolvesIn w r → resolvesIn (w ++ v) r` | PROVED | `resolvesIn_mono`, `Word.lean:135-138` — the one theorem the host's lock-freedom prose leans on (§3.14) |
| L69 | `wfFrom prior (x ++ y) = wfFrom prior x && wfFrom (prior ++ x) y` | PROVED | `wfFrom_append`, `Word.lean:152-160` |
| L70 | prefix interior stays resolved | PROVED | `wfFrom_resolves`, `Word.lean:164-198` |
| L71 | `wf w → Store.Closed (toStore w)` | PROVED | `wf_toStore_closed`, `Word.lean:207-218` |
| L72 | the converse `Closed (toStore w) → wf w` | — | **FALSE**; witness kernel-checked (§3.13) |
| L73 | `wf w ∧ (∀ r ∈ n.refs, resolvesIn w r) → wf (w ++ [⟨a,n⟩])` | PROVED | `wf_snoc`, `Word.lean:238-246` |
| L74 | `wf (w ++ v) → wf w` | OWED | one line from L69 |
| L75 | `toStore = find`, definitionally | PROVED | `Word.lean:201` |
| L76 | fresh append is `Store.set`; occupied append is invisible | PROVED | `toStore_snoc` `Word.lean:283-295`; `toStore_append_shadowed` `:252-265` |
| L77 | store-equal prefixes stay store-equal under a common suffix | PROVED | `toStore_append_congr`, `Word.lean:270-280` |
| L78 | **a binding's address is `H (encodeNode node)`** | — | **NOT AN INVARIANT of `Word`.** `Honest` lives in the grammar layer, `Tree.lean:250-251` (§3.7) |
| L79 | `wf` admits words no interpreter can produce (shadowed bindings) | PROVED (witness) | kernel-checked exhibit, `word-store-exhibits.lean` A (§3.7) |
| L80 | reachability: `w` is a halted run's word from `[]` **iff** `wf w ∧ Honest H w ∧ addresses distinct` | OWED | makes "a serialized word is a replayable admission history" (`Word.lean:19-20`) a theorem instead of prose |
| L81 | a halted run's word loads back through its own store | OWED | every `runProgram` client assumes it; **false for shadowed words, true for reachable ones** — so it needs L80 first |
| L82 | `(tr.flatten H).getLast? = some ⟨tr.address H, tr.node H⟩` | OWED | one `cases`; only membership is proved (`self_mem_flatten`, `Tree.lean:236-238`) |
| L83 | `flatten` emits only honest words | PROVED | `Tree.flatten_honest`, `Tree.lean:264` |
| L84 | `flatten` admits — **under `Function.Injective H`** | PROVED (Level 1) | `Tree.flatten_wf`, `Tree.lean:463-465` |
| L85 | `(tr.flatten H).length = tr.size` | PROVED | `length_flatten`, `Tree.lean:231-233` |
| L86 | "the upload order the TypeScript `Graph.closure` emits" | ASSERTED ✗ | `Word.lean:14-20`; `closure` is children-first **and deduplicated** (`Graph.ts:101-103`) — on `shared-chunk`, `flatten` emits 5 and `closure` yields 4 |

### 2.8 The store and its admission judgment

| # | Law | Status | Carrier |
|---|---|---|---|
| L87 | `checkRefs σ rs = .ok () ↔ RefsOk σ rs` | PROVED | `checkRefs_ok_iff`, `Admission.lean:60-85` |
| L88 | a returned error's clause holds of the input; a condemned list is rejected | PROVED | `checkRefs_error_condemns` `:107-133`; `checkRefs_complete` `:137-145` |
| L89 | `put` rejects exactly when `checkRefs` rejects | PROVED | `put_error_iff`, `Admission.lean:188-197` |
| L90 | fresh / duplicate / conflict each characterized | PROVED | `put_fresh_spec` `:201-216`, `put_duplicate_spec` `:220-236`, `put_conflict_spec` `:242-261` |
| L91 | a fresh put preserves `Closed` | PROVED | `put_fresh_closed`, `Admission.lean:275-294` |
| L92 | **a duplicate put leaves the word unchanged** | PROVED | `referenceHandler`, `Handler.lean:84-86` via `Admission.lean:184`; `putWord_word`, `Defun.lean:1428` |
| L93 | `empty_closed`; `Closed.not_referenced`; `set_same`/`set_other` | PROVED | `Store.lean:32-59` |
| L94 | the byte plane is grow-only / a join semilattice | ASSERTED ✗ | `Backend.ts:20-25`; **not uniform across backends** — `KvsBackend.ts:95-101` is an unconditional `set` (§3.15) |
| L95 | check-then-insert needs no lock | ASSERTED | `Store.ts:10-11`, `:238-240` — no judgment named (§3.14) |

### 2.9 Identity — addressing (R4)

| # | Law | Status | Carrier |
|---|---|---|---|
| L96 | `addr` is a function of the canonical pre-image (Level 0) | PROVED | `addr_congr` `Address.lean:42-44`; `addr_eq_of_encode_eq` `:48-50` |
| L97 | equal addresses ⇒ equal nodes **or** an exhibited collision (Level 0) | PROVED | `addr_eq_or_collision`, `Address.lean:56-63` |
| L98 | address equality reflects node equality **under `hInj`** (Level 1) | PROVED | `addr_inj`, `Address.lean:69-71` |
| L99 | **Level 2 (collision resistance) is empty, and forced to be** | PROVED (exhibited) | `Address.lean:75-86`. *No theorem in the estate assumes collision resistance* |
| L100 | the concrete SHA-256 vectors carry no injectivity proof | ASSERTED, correctly | `Vectors.lean:18-20` |

### 2.10 The straight-line table — codec

| # | Law | Status | Carrier |
|---|---|---|---|
| L101 | `x.WF → readPIn (encodePIn x ++ rest) = some (x, rest)`, and the `PRef` twin | PROVED | `readPIn_encodePIn` `Defun.lean:482`; `readPRef_encodePRef` `:508` |
| L102 | `l.WF → decodeLine (encodeLine l) = some l` | PROVED | `decodeLine_encodeLine`, `Defun.lean:635` |
| L103 | the three exactness duals (`readPIn`, `readPRef`, `readLine`) | PROVED | `:708`, `:742`, `:764` |
| L104 | `decodeLine n = some l → n.tag = stepWireTag ∧ n.payload = encodeLineBody l ∧ l.WF` | PROVED | `decodeLine_exact`, `Defun.lean:826` — **concludes nothing about `n.version`** (§3.17) |
| L105 | counted-sequence round trip and its membership-relative dual | PROVED | `readN_encode_of` `:526`; `readN_exact_of` `:672` |
| L106 | boolean twin of `PLine.WF` decides it | PROVED | `PLine.wf_iff`, `Lift/Decode.lean:128` |
| L107 | "one byte representation per code point" for the step sort | ASSERTED ✗ | prose `Defun.lean:661-662`; the version byte is a free parameter (§3.17) |
| L108 | `Word.wf (encodeProg H p) = true`, for every `H` | PROVED | `encodeProg_wf`, `Defun.lean:871` (Level 0, no injectivity) |
| L109 | "the encoded table ADMITS as a word" | ASSERTED ✗ | `Defun.lean:63-64`, `:866`; `Word.wf` never inspects `Node.WF` (§3.16) |
| L110 | `hwf ∧ hsep → decodeProg (encodeProg H p) = some p` | PROVED | `decodeProg_encodeProg`, `Defun.lean:998-1002` |
| L111 | `hsep` is NECESSARY | PROVED (witness) | `example`, `Defun.lean:1023-1038`, `by decide` |
| L112 | recovery preserves the run / `ObsEq` / the envelope | PROVED | `runP_decodeProg_encodeProg` `:1051`; `ObsEq_decodeProg_encodeProg` `:1062`; `envelope_decodeProg_encodeProg` `:2114` |
| L113 | `find` inside the encoded word answers the line's own node | PROVED | `find_lineAddr` `:949`; `find_encodeProg` `:974` |
| L114 | `decodeProg` accepts nothing outside `encodeProg`'s image (`decodeProg_exact`) | OWED | the dual the line level has (L103/L104) and the table level does not (§3.17) |
| L115 | address-keyed recovery — a model for the SHIPPED door (`loadProgram`, `cas_run_ref`) | OWED | `decodeProg` reads `w.getLast?` (`Defun.lean:941`) and answers `none` on any store holding a second program (§3.9) |

### 2.11 The straight-line table — interpretation

| # | Law | Status | Carrier |
|---|---|---|---|
| L116 | `putWord` IS the reference handler's put clause | PROVED | `step_put_putWord`, `Defun.lean:251` (corollary of L40) |
| L117 | `run H (p.length+1) (embed p) w = runP H p w` — AGREEMENT | PROVED | `runP_embed_agree`, `Defun.lean:362-364` |
| L118 | `runP` preserves `Word.wf`; `runPFrom`/`runP` always halt | PROVED | `:368`, `:375`, `:403` |
| L119 | tables whose `runP` agrees at every word are `ObsEq` | PROVED | `ObsEq_embed_of_runP`, `Defun.lean:419-425` |
| L120 | an accepting put answers `H (encodeNode n)` — fresh AND duplicate, no premise on `H` | PROVED | `putWord_answer`, `Defun.lean:1401` |
| L121 | every `CasSig` line is hash-determined | PROVED | `PLine.hashDetermined`, `Defun.lean:1496` |
| L122 | "a total function … that **no handler may contradict**" | ASSERTED ✗ | `Defun.lean:1453-1455`; the definition quantifies over `runPFrom` only, and `replayHandler` contradicts it (§3.4) |
| L123 | on a `done` run the threaded history IS `answersFrom`, of length `p.length` | PROVED | `runPFrom_done_answers`, `Defun.lean:1537` |
| L124 | `answersFrom` cons law; `answersFrom H env p` prefixes `answersFrom H env (p ++ q)` | PROVED | `answersFrom_cons_of` `:1602`; `answersFrom_prefix` `:1868` |
| L125 | the `answersFrom` SPLIT law | OWED | `answersFrom` cannot be computed compositionally though it is a pure recursion on first-order data |
| L126 | an operation OUTSIDE the hash-determined boundary exists | PROVED (witness) | closing `example`, `Defun.lean:2190-2198` — one `AgentSig` program, two oracles, `by decide` |
| L127 | **anything at all executes `runP`** | — | **NOTHING DOES.** Word-boundary grep: `runP` occurs in `Defun`, `Mcp`, `Fragments`, `Representation` only — statements and prose (§3.5) |

### 2.12 The straight-line table — envelope and frame

| # | Law | Status | Carrier |
|---|---|---|---|
| L128 | every consulted address is an enveloped literal or a history entry | PROVED | `PProg.resolve_sound` `Defun.lean:1332`; `touches_sound` `:1355` |
| L129 | resolution changes only ADDRESSES; kinds come from the table | PROVED | `resolveRefs_kinds`, `:1248` |
| L130 | the word only GROWS, by a **`Sublist`** of the declared put shapes, in order | PROVED | `runPFrom_puts_sound` `:1618-1621`; `runP_puts_sound` `:1672`. *`Sublist` and not prefix precisely because a duplicate put appends nothing* |
| L131 | a refusal naming an absent address names an enveloped one | PROVED | `runPFrom_absent_sound` `:1766`; `runP_absent_sound` `:1839` |
| L132 | a run that completes a prefix continues at the DETERMINED history | PROVED | `runPFrom_append_done`, `:1887` |
| L133 | refusal ABSORBS its suffix | OWED | believed true by inspection of `:271-290`; without it the table monoid has **no unconditional composition law** |
| L134 | FRAME-1, per line, at the determined history | PROVED | `runPFrom_frame_sound`, `:1944` |
| L135 | FRAME-1 at the table | PROVED but VACUOUS at `pre = []` | `runP_frame_sound`, `:1965` (§3.23) |
| L136 | a load's outcome is a function of the word AT its resolved address | PROVED | `runPFrom_load_absent` `:1992`; `runPFrom_load_present` `:2002` |
| L137 | a closed dataflow cannot dangle, at any word | PROVED | `runPFrom_no_dangling` `:2050`; `runP_no_dangling` `:2101` |
| L138 | the envelope's two over-approximations, exhibited | PROVED (witnesses) | GAP 1 `:2135`; GAP 2 `:2149` |
| L139 | `reads`/`puts`/`dataflowFrom` are monoid homomorphisms on `++` | OWED | the definitions are literally homomorphic (`:1170`, `:1176`, `:1184`); no modular envelope argument is licensed |
| L140 | the `puts` index and the `dataflow` index are DIFFERENT numberings | ASSERTED, in the wrong file | `ProgProse.lean:28-31`; nothing at the definition sites (§3.24) |

### 2.13 The schema universe — admission and registries

| # | Law | Status | Carrier |
|---|---|---|---|
| L141 | `a.wf = true ↔ a.WF`, and the six helper family twins | PROVED | `Ast.wf_iff`, `Ingest.lean:185-232` |
| L142 | `discriminatedB ms = true ↔ Discriminated ms` | PROVED | `Discriminated.lean:74-93` |
| L143 | `¬(union []).WF`; `¬(enum []).WF`; sorted names `Nodup`; enum names `Nodup` | PROVED | `Ast.lean:250-278` |
| L144 | the declaration registry is closed, complete, `Nodup` on the wire | PROVED / GATED | `Declarations.lean:202-212`; `Nodup` by `#guard` `:207` |
| L145 | `General` is exactly the non-dedicated part of the registry | PROVED | `row_not_dedicated`/`row_surjective`/`row_inj`, `Declarations.lean:281-298` |
| L146 | `UnionMode` and `DeclPayload` round trips, injectivity, canonicality | PROVED | `Union.lean:58-68`; `Declarations.lean:85-99` |
| L147 | `Ast.WF`'s struct-sortedness clause is grounded in **schema** canonicality | ASSERTED ✗ | `Ast.lean:165-169` gives a revision-0 rationale; under revision 1 the ground is `encode_canonical` on the value plane (§3.25) |
| L148 | `Ast.discriminated a = true ↔ ∃ ms m, a = .union ms m ∧ discriminatedB ms` | OWED | `Discriminated.lean:177-179` has **no theorem at all**, and six `#guard` sites rely on it |

### 2.14 The schema universe — projection, codec, identity

| # | Law | Status | Carrier |
|---|---|---|---|
| L149 | revision-1 canonicality of representation / document / envelope — **no `WF` premise** | PROVED | `toRepresentationJson_canonical`, `SelfCodec.lean:798-938` |
| L150 | `a.payload = renderPlain a.envelope` | PROVED | `payload_renderPlain`, `SelfCodec.lean:942-944` |
| L151 | `ofRepresentationJson (toRep a) = some a.repNorm`; `= some a` on `RepNormal` | PROVED | `SelfCodec.lean:1469-1583` |
| L152 | the decoder's image is `RepNormal` | PROVED | `ofRepresentationJson_repNormal`, `SelfCodec.lean:1969-1984` |
| L153 | **`ofRep v = some a → a.toRepresentationJson = v`** (decoder exactness) | OWED | **the single largest hole in the schema plane** (§3.10). The value plane has exactly this law with no premise (`decode_exact`) |
| L154 | census: `toRep a = toRep b ↔ a.repNorm = b.repNorm`, no `WF` premise | PROVED | `toRepresentationJson_eq_iff_repNorm`, `Basis.lean:634-646` |
| L155 | the carrier's redundancy is measured and equals one: `.lit .null ↔ .null` | PROVED | `repNorm_the_one_collapse` `Basis.lean:645-650`; `repNorm_fixes_every_other_leaf` `:656` |
| L156 | `repNorm` idempotent, `WF`-preserving, invisible at the address | PROVED | `SelfCodec.lean:1012-1289`; `payload_repNorm`, `Basis.lean:578-583` |
| L157 | `deNumNorm ∘ numNorm = id` on a `WF` code's representation image | PROVED | `deNumNorm_numNorm_representation`, `PayloadInj.lean:156-274` |
| L158 | the `WF` premise for L157 is NECESSARY, exhibited | PROVED (witness) | `payload_inj_needs_wf`, `PayloadInj.lean:296-310` |
| L159 | `a.payload = b.payload ↔ a.repNorm = b.repNorm` under `WF`; and at the bytes | PROVED | `payload_inj` `PayloadInj.lean:327-346`; iff at `Basis.lean:589-604` |
| L160 | the emit-path normalizer set is exactly `{repNorm}`, and minimal | PROVED | `normalizers_are_independent`, `Basis.lean:612-624` |
| L161 | revision-0 canonicality, decoder, round trip, injectivity | PROVED | `SelfCodec.lean:387-681` |
| L162 | `Ast.legacyEnvelope` has a decoder | OWED | `SelfCodec.lean:313-314` — **no decoder anywhere in Lean**; its only laws are canonicality and `renderPlain` (§3.11) |
| L163 | `schemaKindTag` is owned in one place | ASSERTED ✗ | `SelfCodec.lean:34` spells `0x53` independently of `Cas/Grammar/Sorts.lean:63`; nothing binds them (§3.26) |

### 2.15 The schema universe — the door

| # | Law | Status | Carrier |
|---|---|---|---|
| L164 | `ingest v = .ok a → a.WF` | PROVED | `ingest_wf`, `Ingest.lean:291-303` |
| L165 | `a.WF → ingest a.envelope = .ok a.repNorm`; on `RepNormal`, `= .ok a` | PROVED | `ingest_envelope` `:306-313`; `ingest_envelope'` `:315-317` |
| L166 | the same three for `ingestLegacy` and `ingestBytes` | PROVED | `:335-357`, `:608-632` |
| L167 | `ingest` is constant on `canonValue`'s classes; `canonValue` is a no-op on the image and genuinely widens the door | PROVED | `Basis.lean:316-371` |
| L168 | `ingest v = .ok a → canonValue v = a.envelope` (the door's canonical image) | OWED | corollary of L153; without it "the same code from any spelling lands at the same address" (`Ingest.lean:23-26`) is ASSERTED |
| L169 | `¬a.WF → ingest a.envelope = .error .illFormed`, and the `↔` form | OWED | the boundary is one `#guard` per clause in a different module (§3.27) |
| L170 | the five refusal NAMES are witnessed | GATED | `#guard`s at `Cas/Backend/Admission.lean:385-468`; two of the five (`wrongRevision`, `nonEmptyReferences`) have no witness in `Ingest.lean` itself |
| L171 | `refusalOf v = .wrongRevision ↔ v is an envelope whose revision ≠ 1` | OWED | the taxonomy is point witnesses, never a quantified law |
| L172 | the two doors name the same verdict on the same bytes | ASSERTED ✗ | `CanonicalSchema.ts:110-115`; they disagree at revision 0 (§3.11) |

### 2.16 The value plane (`El`)

| # | Law | Status | Carrier |
|---|---|---|---|
| L173 | exactness, **no premise at all**: `decode a v = some x → v = encode a x` | PROVED | `decode_exact`, `Codec/Laws/Mutual.lean:251-273` |
| L174 | forward round trip under `WF`; `encode` injective | PROVED | `decode_encode` `:582-605`; `encode_inj` `Codec/Laws.lean:15-20` |
| L175 | unique JSON representative; unique canonical rendering; `decode` injective in the value | PROVED | `Codec/Laws.lean:27-45` |
| L176 | the encode image is canonically spelled under `WF`; `renderCompact = renderPlain` on it | PROVED | `Codec/Laws/Render.lean:63-125` |
| L177 | a tagged member's encoding leads with its tag; members are decode-disjoint | PROVED | `Codec/Core.lean:180-208`; `decode_head_encodeMembers_tail`, `Mutual.lean:284` |
| L178 | a union VALUE is itself evidence that its code is discriminated | PROVED | `discriminatedB_of_el`, `El.lean:195-199` |
| L179 | `Described`: round trip, exactness, injectivity | PROVED | `Described/Core.lean:34-61` |
| L180 | `encodeMembers`'s three-arm shape mirrors `ElMembers`'s | OWED | FOLKLORE held by elaboration; one `rfl`-shaped lemma per arm |
| L181 | `declEl`, `generalUnionEl`, `enumEl`, `tupleEl` — the four denotation tables | OWED | named and dated at `El.lean:37-138`. **These are the model of how an obligation should be written** |

### 2.17 The projection bridge to a store node

| # | Law | Status | Carrier |
|---|---|---|---|
| L182 | `eraseR (elR a v) = encode a v` — the bridge cannot fork the ratified wire shape | PROVED | `eraseR_elR`, `Projection.lean:220-234` |
| L183 | `canonR (elR a v) = elR a v` under `WF` | PROVED | `canonR_elR`, `:332-361` |
| L184 | forced-index law; the reference array is the folded tree's links in canonical order | PROVED | `project_wellRefIndexed` `:449-462`; `project_refs` `:464-477` |
| L185 | marker/link agreement under `WF` | PROVED | `project_agreement`, `Projection.lean:486-500` |
| L186 | `putPayload`/`putRefs`/`putNode` byte pins for `Exchange`, `SystemNode` | GATED | `#guard`s `Exchange.lean:120-132`, `System.lean:265-283` |
| L187 | `raise : Node → El a` with `raise_lower` / `lower_raise` | OWED | named at `Projection.lean:504-525` |

### 2.18 Roots and publication

| # | Law | Status | Carrier |
|---|---|---|---|
| L188 | Cas ops delegate: the word evolves as `step`, roots unchanged | PROVED | `stepRooted_cas_agrees`, `Roots.lean:85-90` |
| L189 | `stepRooted` preserves `wf` (one step) | PROVED | `Roots.lean:94-107` |
| L190 | a successful publish's address has a binding in the word | PROVED | `publish_mem`, `Roots.lean:111-119` |
| L191 | `runRooted` preserves `wf`; `runRooted` halts; `runRooted` relates to `run` | OWED | **`runRooted` (`Roots.lean:122-130`) carries no theorem at all** |
| L192 | `publish` is idempotent | ASSERTED ✗ | `Backend.ts:86`; **false in Lean** — `roots ++ [a]` is unconditional (§3.8) |
| L193 | `listRoots` order is unspecified | ASSERTED ✗ | `Backend.ts:90`; **false in Lean** — it is publication order (§3.8) |
| L194 | publication is fail-closed: an address publishes only if the store holds it | OWED at the host seam | Lean has it at the signature (`Roots.lean:77-80`); the host guard is two hand-written copies (§3.8) |

### 2.19 The host mirror

| # | Law | Status | Carrier |
|---|---|---|---|
| L195 | `load` re-verifies: canonical decode, byte-identical re-encode, known kind, recomputed address | GATED | `verifyNodeBytes`, `Store.ts:135-157`; battery `test/CasStore.test.ts`, `Cli.test.ts:370` |
| L196 | `put` admits children-first, else `DanglingReference`/`WrongKindReference` | GATED | `internal/admission.ts:69-98`, `Store.ts:241-273` |
| L197 | equal canonical bytes → equal address; a second put is inert | GATED | `Cli.test.ts:194, 334` |
| L198 | a hash collision at distinct bytes is a typed refusal, not a silent overwrite | GATED | `admission.ts:95-96`, `Store.ts:254-257` |
| L199 | scheme-0 SHA-256 through WebCrypto is "**proved** by the conformance gate" | ASSERTED ✗ | `Store.ts:392-394`; a known-answer gate is `γ`-class evidence, not `π` (C5) |
| L200 | `closure` emits children-first, deduplicated, root last | GATED | `Graph.ts:101-103`; `test/Graph.test.ts` |
| L201 | `verify` succeeds "**exactly when** the backend faithfully serves the whole graph" | ASSERTED ✗ | `Graph.ts:203-204`; neither direction proved or gated, "faithfully" undefined (§3.18) |
| L202 | `verify`'s enumerated checks are its refusal set | ASSERTED ✗ | `Graph.ts:200-202` omits the edge-typing clause it enforces at `:171-176` (§3.18) |
| L203 | a Lean shadow for `Graph.verify` | OWED | `Word.wf` is the model-side closure predicate over a *word*; nothing relates it to `verify` over a *store* |
| L204 | **`putProgram(t).address` = the cont address `encodeProg` computes, character for character** | GATED | `Programs.test.ts:104-133` against `VectorProgramAddresses.json`, byte-identity-gated in `check:cas`. **The reference standard for the whole host surface** |
| L205 | `loadProgram(putProgram(t)) = t` | GATED on 8 programs; **FALSIFIED in general** | §3.12, exhibit A |
| L206 | a line body must be consumed EXACTLY; a trailing byte refuses | GATED | `Programs.ts:267, 287`; `Programs.test.ts:242-262` |
| L207 | the tag is the gate: a non-step node decodes to nothing | GATED | `Programs.ts:295-296`; `Programs.test.ts:230-240` |
| L208 | `programAddress` (no store) = `putProgram` (store) | GATED | `Programs.test.ts:211-224` |
| L209 | the step/cont tag numbers are the registry's | GATED (byte) | `Programs.ts:92, 96` reads `generated/grammar/kindTags.ts` |
| L210 | `RunOutcome.word` = "the addresses admitted, in admission order" | **RE-VERIFIED 2026-08-31: DISCHARGED** (was ASSERTED ✗) | the CX-007 fix landed in `9bbcb901`: `Programs.ts:592` pushes only on `fresh`, matching L92; the old `:524` cite is now the interface declaration. Stream-loop review QE-A10 caught these rows stale |
| L211 | a load extends the answer history and NOT the word | GATED | `Programs.ts:525-533`; `Programs.test.ts:204-208` |
| L212 | naming an answer that has not been given refuses | GATED | `Programs.ts:473-478`; `Programs.test.ts:264-278` |
| L213 | `runProgramAt(s, putProgram(s,p).address) = runProgram(s,p)` | ASSERTED ✗ | `Programs.ts:544-548`; the only check is a self-comparison (§3.9, exhibit D) |
| L214 | the empty table's meaning on the host | OWED | Lean refuses it (`Defun.lean:273-276`); the host succeeds, publishably and runnably (§3.9, exhibit E) |
| L215 | a cont node whose declared line count disagrees with its edges is refused | ASSERTED, **host-stricter than the model** | `Programs.ts:437-455`; Lean's `decodeProg` has no such clause (§3.9) |
| L216 | the designated result is the last answer | ASSERTED, **not exported** | `Programs.ts:462-464`; `RunOutcome` has no result field and no host observes one (§3.28) |
| L217 | `WF : Program → Option refusal` — the complete host mirror of `∀ l ∈ p, PLine.WF l` plus the clauses Lean's types supply free | OWED | the host's only door is `bounded` (`Programs.ts:312-331`), which checks 3 clauses and truncates outside them (§3.12) |
| L218 | every door that turns a `Program` into bytes passes that check first | OWED | `stepNodes`/`encodeLine`/`encodeLineBody`/`tableNode` are exported and consult nothing (§3.29) |
| L219 | "the premise is the collision resistance this host already assumes everywhere else, so it is inherited" | ASSERTED ✗ | `Programs.ts:69-77`; L99 states the estate's actual position — *no theorem assumes collision resistance* (§3.36) |
| L220 | every verb that answers a question has two registers; `--json` is one JSON object | ASSERTED ✗ | `commands.ts:113-122`, ratified `IMPLEMENTATION-PLAN.md:1553-1557`; `cas put --program --json` prints prose (§3.30) |
| L221 | `verify` reports a verdict per root, never stopping at the first refusal | GATED | `commands.ts:1054-1117`; `Cli.test.ts:276, 370, 545`. **The second reference standard for the host** |
| L222 | `cas run` / `cas put --program` — any law at all | OWED | no case in `test/Cli.test.ts` invokes either; the two verbs that carry R7 have no CLI battery |

### 2.20 The cross-host gates

| # | Law | Status | Carrier |
|---|---|---|---|
| L223 | every registered program's answered addresses equal the Lean word's addresses, positionally | GATED | `test/VectorPrograms.test.ts:33-39` |
| L224 | every vector binding's node re-encodes to its declared address on this host | GATED | `test/ConformanceVectors.test.ts:32-35` |
| L225 | the index's `root` is the last binding's address | GATED | `test/ConformanceVectors.test.ts:84` |
| L226 | the daemon's `cas_run_ref` word equals the Lean word — **for one program** | GATED | `test/BrainStem.test.ts:367` (`fileReadme`) |
| L227 | a program's word takes only fresh admissions (was: one entry per put LINE, contradicting L92/L130) | **RE-VERIFIED 2026-08-31: the gate now asserts AGREEMENT** | `test/Programs.test.ts:160+` gates "a run's word takes only fresh admissions; a re-run admits nothing" — the divergence-baking test was rewritten with the CX-007 fix (`9bbcb901`) |
| L228 | word equality in the `List Binding` sense, cross-host | — | **NOTHING COMPARES IT ANYWHERE** (§3.5) |
| L229 | the differential schema corpus: `Materialize.fromPayload` admits exactly where `ingest` admits, by the same name | GATED | `conformance/schema-verdicts.json`, `test/SchemaVerdicts.test.ts` |
| L230 | the byte-identity gate on every generated surface | GATED | `mise run check:cas`, `mise.toml:429-445` |
| L231 | `treeProg tr` computes the term | OWED | GATED on 7 registered terms (`VectorPrograms.test.ts:21-41`); named as Lane D |
| L232 | `Tree.table tr = treeProg tr` (the two `PProg` walks agree) | OWED | `ProgProse.lean:225` says outright: "The two walks agreeing is prose, not a theorem" (§3.31) |
| L233 | R1–R14a are bound to a build artifact | OWED | the `LAW <id>` mechanism exists and is gated (`tools/Laws.lean`, `check:cas:laws`) and covers `SM-` rows only; **no `LAW` line exists anywhere in `Cas/Lang/`** |

### 2.21 The formal debt, ordered by blast radius

Every `OWED` row and every `ASSERTED ✗` row above, ranked by what
breaks if it is false or stays absent. This is the estate's formal
debt; the top five are the ones this review would put in front of any
other work.

| Rank | Debt | Rows | If it stays open |
|---|---|---|---|
| **1** | **The host↔model word agreement.** Whichever object §4/Q1 rules to be "the word", the law that the host computes it. **LARGELY DISCHARGED 2026-08-31**: the host now appends fresh-only (`9bbcb901`, L210/L227 re-verified above) — the carriers agree; the residue is L228 (cross-host `List Binding` word equality still compared nowhere). Note for the record: the discharge landed under the commit message "Refactor and clean up codebase" with no ledger update — caught by the stream-loop review (QE-A10), re-cited here. | L210 ✓, L227 ✓, L228 open, L92, L130 | Residual exposure is L228 only: no gate compares the full binding-level word cross-host. |
| **2** | **The sum injection laws** `interpret (h.sum g) p.inl = interpret h p` (+ `.inr`, + `inl` is a monad morphism). | L21–L26, L30 | The word gate is blind to their falsifier **by construction** (§3.2): an `inl` that performs every operation twice is `ObsEq`-equal to the real one for every `CasSig` program. The statement is the whole of the protection. `liftCas`, `liftRootedCas`, `handleLlm` and the incoming `WordSig` all ride on it. |
| **3** | **`treeProg` correctness** — the emitted table's meaning is `Tree.prog`'s. | L231, L127, L232 | The estate's flagship generated artifact (7 programs, the R5 gate itself) is tied to the grammar by nothing, and `runP` — the operation R5's prose names — acquires no executed consequence. This is the single lane that closes §3.5 and §3.31 together. |
| **4** | **`ofRepresentationJson_exact`** — the revision-1 decoder is exact on its domain. | L153, L168 | "The same code from any spelling lands at the same address" is ASSERTED. A domain-widening decoder passes every stated law of the module and silently discards a check while readdressing the schema (§3.10). The *value* plane has this law with no premise; the *self*-codec does not. |
| **5** | **Interpretation's universal property** — `Handler.ext`, uniqueness, existence. | L16–L18, L19, L20 | These three license R10's "a semantics IS a handler", which the whole architecture rests on — and the estate already contains two semantics that are not handlers (§3.4). Until they land, INITIAL and "free monad" are pending words at two sites. |
| 6 | `run_halts` + fuel monotonicity | L52, L53, L54 | `ObsEq.of_run` cannot be used outside the `PProg` fragment; "the run gate decides `ObsEq`" is scoped without saying so. |
| 7 | `decodeProg_exact` + the version-byte check | L114, L104, L107 | "The program's address is its identity" holds only for words the canonical encoder produced. |
| 8 | A `Handler ByteSig M`, then the `casOverBytes` refinement theorem | L37, L38, L39 | R12's "composes all the way down to the admitted seams" describes a descent with no last step; the owed theorem is **unstatable**, not merely unproved. |
| 9 | `replayHandler`'s contract, whatever it is | L122, L86 | Two kernel-checked witnesses defeat R10's replay/record sentence as written (§3.4). Nothing should be built on that sentence until it is answered. |
| 10 | Reachability (`wf ↔ halted-run word`) and the run postcondition | L80, L81, L79 | `wf` is a property of the *history*, not the *state*; `Word.Admitted`'s docstring reads as the strong object and is not. |
| 11 | Refusal absorbs; the `answersFrom` split; the three envelope homomorphisms | L133, L125, L139 | The table monoid has no unconditional composition law — no scheduler, resumer, or incremental executor has a theorem. |
| 12 | `runRooted`'s preservation, halting and agreement | L191 | `StoreSig` is a second-class language: a reader who follows R10 to `Roots.lean` finds a semantics R10 does not describe. |
| 13 | The host `WF` door on every byte-producing operation | L217, L218 | The encoder truncates outside its unstated domain instead of refusing; the one gate is bypassable and the estate's own R7 showcase bypasses it. |
| 14 | `Graph.verify`'s Lean shadow and its honest biconditional | L203, L201, L202 | The estate's flagship verb has a battery and no law. |
| 15 | `Ast.discriminated`'s characterization; `encodeMembers`/`ElMembers` correspondence; `legacyEnvelope`'s decoder | L148, L180, L162 | Six `#guard` sites and one whole revision arm rest on FOLKLORE. |
| 16 | `LAW` lines binding R1–R14a to the build | L233 | "Rewrite the comment and the law is gone, silently, with every gate still green" — the defect `tools/Laws.lean:8-11` names in its own opening. |

**Counts.** 233 numbered laws:

| Status | Count | Note |
|---|---|---|
| PROVED | **121** | includes 7 proved-by-witness/by-construction rows and one row that is both proved and gated |
| GATED | **23** | one of them (L205) is falsified off its gated set |
| ASSERTED | **30** | of which **22 carry a fired falsifier** (marked ✗) — wrong as written, not merely unproved |
| OWED | **53** | the debt above |
| recorded absence | **6** | not stateable (L27, L28), false with a witness (L72), not an invariant (L78), executed by nothing (L127), compared by nothing (L228) |

So **144 of 233 laws are carried by something executable** (a theorem
or a gate) and **89 are not**. Of the 89, twenty-two are claims the
estate currently makes and this review defeats.

---

## 3. The holes and the inconsistencies

Deduplicated across the six areas. Each carries the falsifier in
exhibit form and its obligation class
(`.claude/skills/implement/CONTRACT.md:109-139`). Ranked: §3.1–§3.12
are the ones that change what the estate may claim; §3.13 onward are
the remaining ledger.

---

### 3.1 — "The word" names two different objects, and a green test asserts the divergence

**Class:** conformance, claim-scope, adequacy.
**Found by:** word-store §3.2, defun-plane H-1, host-api X1/H7/R-1,
handlers-semantics B.7. **This is the estate's top hole.**

Lean's reference handler appends to the word **only** on the `.fresh`
arm; a duplicate put answers the address and leaves the word alone
(`Handler.lean:84-86`, via `Admission.lean:184`; `putWord_word`,
`Defun.lean:1428`). `runPFrom_puts_sound` concludes a `Sublist` and
not a prefix for exactly this reason, and says so
(`Defun.lean:1614-1621`). The host pushes unconditionally
(`Programs.ts:524`).

```
LAW        the cross-host observation is the word (R5,
           EFFECTS-BACKEND.md:88-95)
FALSIFIER  exhibit a table p and a word w with
           (runP H p w).2 ≠ w ++ (the host's RunOutcome.word)
WITNESS    the REGISTERED conformance vector `shared-chunk`
           (Registry.lean:41-44 — built for this case). Its table has
           5 lines with lines 0 and 2 identical, 4 distinct addresses.
             Lean : (runP sha256Addr p []).2 has 4 bindings
             Host : runProgram(store, p).word has 5 entries
EXECUTED   host side, under layerMemoryLive:
             put lines 5 / RunOutcome.word len 5 / distinct 4
           (word-store §3.2 exhibit B′)
KERNEL     ∃ H p, (runP H p []).2.length = 1 ∧ (PProg.puts p).length = 2
           (word-store-exhibits.lean, exhibit B)
BATTERY    `Programs.test.ts:166-167` asserts
           `byAddress.word.length === lift.instructions.length`
           — it BAKES THE DIVERGENCE IN as a gate.
```

Three consequences, each verified:

1. **The divergence is served.** `cas_run`'s reply is
   `outcome.word.map(address => ({address}))` (`handlers.ts:239`),
   while `Mcp.lean:30` declares the tool's meaning is
   "`Cas.Lang.runP` and nothing else" and `Mcp.lean:152-154` declares
   the reply is "the word, in admission order". On `shared-chunk` the
   served reply has one more entry than the declared meaning.
2. **The CLI reports admissions that did not happen.** `cas run --json`
   twice on one store reports the same non-empty word the second time
   (host-api exhibit I, executed against a real file store) — the
   second invocation admitted nothing.
3. **The root cause is an export-set defect, not a `Programs.ts` bug.**
   `AdmissionVerdict` distinguishes `Admit` from `AlreadyResident`
   (`internal/admission.ts:32-33`); `put` collapses both to `id`
   (`Store.ts:258-272`). `CasStoreShape.put : Node → Eff⟨ContentId⟩`
   therefore **cannot** answer the model's word, so no client of the
   export set can compute the observable R5 makes the conformance gate.

Also note `Programs.ts:62-67` states the scope backwards: "two stores
that hold different content can honestly answer different words for
one program". This host does the opposite — it answers the same list
regardless of store state — so the warning gives false comfort.

**Ruling owed: Q1.** Do not fix before reading `merge/cas-word`.

---

### 3.2 — The sum algebra is empty, and the word gate is blind to its falsifier by construction

**Class:** adequacy.
**Found by:** prog-carrier §2.1 H-2/H-3 + S1–S10, handlers-semantics B.9.

`Sig.sum` (`Sig.lean:20-25`), `Prog.inl`/`Prog.inr`
(`Prog.lean:41-49`) and `Handler.sum` (`Handler.lean:63-66`) carry
**zero theorems** between them. Verified by grep at HEAD:
`Handler.sum` has one definition site, one prose mention in
`EFFECTS-BACKEND.md:179`, and one row in the surface inventory —
**no call site**. `Prog.inr` likewise: **no call site**. So R2's
"our `⊕ₛ` and `Prog.inl`/`inr` are the same algebra" is two
definitions and an unproved analogy.

```
LAW CLAIMED  R10 (EFFECTS-BACKEND.md:176-179) — seam effects are
             "operations of their own signature summed in (⊕ₛ,
             Handler.sum), never smuggled through request/reply"
LAW STATED   none
ADVERSARY 1  def badSum (h : Handler CasSig RefM) (g : Handler LlmSig RefM)
                 : Handler AgentSig RefM where
               handle
                 | .inl op         => h.handle op
                 | .inr (.infer _) => fun w => .ok ("", w)
             — typechecks; g is discarded; no stated law violated.
BLIND GATE   every CasSig-only program is word-identical under badSum,
             so no run gate distinguishes it
KILLED BY    interpret_inr (L24)
```

The sharper one, and the reason this sits at rank 2 of the debt:

```
ADVERSARY 2  def inl' : Prog S A → Prog (S ⊕ₛ T) A
               | .pure a  => .pure a
               | .vis e k => .vis (Sum.inl e) fun r =>
                               .vis (Sum.inl e) fun _ => (k r).inl'
             — performs EVERY operation twice, keeps the first answer
WHY IT PASSES  On CasSig the doubling is invisible at the word: the
             second put of the same node is `duplicate`, which leaves
             the word unchanged (Handler.lean:85); the second load of
             a present address is `Word.find` again; `fail` answers
             Empty. So ObsEq H (liftCas p) (inl' p) holds for EVERY
             store program.
WHAT MOVES   the operation count — fuel doubles, and on the LlmSig
             summand the oracle is called twice
KILLED BY    interpret_inl (L23) together with `inl` is a monad
             morphism (L25); nothing weaker separates them
CLASS        adequacy
```

The estate's *only* mechanical check on program meaning cannot in
principle see this defect. The statement is the whole of the
protection. **`merge/cas-word` adds a third hand-rolled sum consumer,
so the question is live before that merge, not after.**

---

### 3.3 — INITIAL and "free monad" name a universal property no theorem states

**Class:** claim-scope.
**Found by:** prog-carrier C-1, handlers-semantics B.1.

`EFFECTS-BACKEND.md:262-265` calls `Prog` "a proved `LawfulMonad` …
and INITIAL (`eq_of_forall_interpret`: agreement under every lawful
interpretation IS structural equality — no finer program equality
exists)". `Lang.lean:21` calls `Prog` "the free monad of continuations
over a signature".

What `eq_of_forall_interpret` (`Representation.lean:80-84`) says: if
`p` and `q` agree under *every* handler into *every* `M`, then `p = q`.
Its proof instantiates that hypothesis at exactly one point —
`M := Prog S`, `hd := idHandler` — and closes with `interpret_id`. It
is `interpret_id` plus a specialization at the syntactic monad.

What INITIAL and FREE actually name, and what is missing: that
`interpret h` is the **unique** monad morphism extending `h`, and that
every monad morphism out of `Prog S` is one. Both are L17/L18, both
proved in ~15 lines in `handlers-semantics-exhibits.lean` §3–§4, and
neither is in the estate.

The reading the prose invites, refuted:

```
CLAIM READ AS  two programs that behave alike in the estate's
               semantics are equal
FALSE. WITNESS  n any node with n.refs = []
  p := put n
  q := put n >>= fun a => put n >>= fun _ => pure a
  Under referenceHandler, whatever the first put does, the second put
  of the SAME node hits Cas.put's `duplicate` outcome
  (Admission.lean:183-184), answering the same address and leaving
  the word unchanged. So ObsEq H p q for every H and every starting
  word — and p ≠ q structurally.
CONCLUSION  ObsEq is strictly COARSER than =. "No finer program
            equality exists" is true (nothing is finer than equality,
            for any type) and carries no information; the load-bearing
            direction — that = is not too FINE — is false, and is
            what R5's certificate discipline exists to handle.
CLASS       claim-scope
```

Until L17/L18 land, INITIAL (`EFFECTS-BACKEND.md:263`) and "free
monad" (`Lang.lean:21`) are pending words per C5.

---

### 3.4 — Three semantics live outside the handler algebra R10 says every semantics is

**Class:** claim-scope, adequacy, contract, abstraction.
**Found by:** prog-carrier X-1, handlers-semantics B.2/B.3/B.9,
defun-plane H-2, word-store §3.8.3.

R10 rules that a semantics is a `Handler` and `interpret` is the
induced morphism. The estate has three semantics that are not.

**(a) `Prog.handleLlm`** (`Interp.lean:184-187`) — a hand-rolled
recursion handling `LlmSig` away into `Prog CasSig`. Its docstring
says "interpret … by monad morphism" (`Interp.lean:19, 181-183`) with
no judgment named (C5). It is expressible inside the algebra as
`interpret (idHandler.sum ⟨fun (.infer q) => .pure (oracle q)⟩)` and is
not so expressed.

```
FALSIFIER   sabotage the `inl` arm and exhibit a green build
WITNESS     replace Interp.lean:186 with
            | .vis (Sum.inl e) k => .vis e (fun _ => (k <arbitrary>).handleLlm oracle)
            — discards the store answer. EVERY theorem in library/cas
            still holds, because no theorem mentions handleLlm.
            runAgent (Interp.lean:190-192) is definitional and
            constrains nothing. The one tripwire, Defun.lean:2191-2199,
            concludes an INEQUALITY of two oracle runs and survives.
KILLED BY   L30 (handleLlm IS an interpret) + L31 + L32
CLASS       claim-scope, adequacy, contract
```

**(b) `stepRooted`** (`Roots.lean:69-81`) — a hand-rolled small step
for `StoreSig` delegating the `CasSig` half to `step` and re-injecting
by `rest.inl.bind k` (`:74`). It has three laws against `CasSig`'s ten;
`runRooted` (`:122-129`) has **none**. `Roots.lean:75` carries a dead
branch (`step` on a `.vis` never reports `.done`) — the symptom of an
open-coded sum a proved `Handler.sum` would not accumulate.

**(c) `replayHandler`** (`Handler.lean:279-292`) — asserted to be "the
co-direction of recording" (`EFFECTS-BACKEND.md:180-183`;
`Handler.lean:20-21, 276-278`). It is not, and two kernel-checked
witnesses say so. It consumes the word as a QUEUE at `put` (pops the
head, `:283-287`) while resolving `load` over the REMAINING suffix
(`:288-291`); the reference resolves `load` over the ACCUMULATED word
and does not extend on a duplicate.

```
WITNESS A  duplicate starves replay
  interpret replayHandler
    (vis (put n) fun _ => vis (put n) fun _ => pure ()) [⟨a,n⟩]
    = .error (.failed "replay: word exhausted")
  while the reference admits it (second put is .duplicate)
  EXHIBIT  handlers-semantics-exhibits.lean:137

WITNESS B  replay refuses a load the reference admits
  interpret replayHandler
    (vis (put n) fun ans => vis (load ans) fun _ => pure ()) [⟨a,n⟩]
    = .error (.noObject a)
  interpretRef H (that program) [] = .ok ((), [⟨addr H ⟨n,hwf⟩, n⟩])
  EXHIBIT  handlers-semantics-exhibits.lean:155 and :171
CLASS      adequacy (the spec is the bug), contract
```

Every straight-line program that loads back what it just put — the
shape `TreeProg` and `Defun` traffic in — is refused by replay and
admitted by the reference.

**Consequence in a third file.** `PLine.HashDetermined`'s docstring
(`Defun.lean:1453-1455`) states the boundary ruling
`Fragments.lean:64-69` cites as law: "a total function … that **no
handler may contradict**". The definition quantifies over `runPFrom`
only. `replayHandler` at `w = [Binding.mk a n]` with
`a ≠ H (encodeNode n)` answers `a`, where `PLine.answer` answers
`H (encodeNode n)`. The honest statement is what `putWord_answer`
(`Defun.lean:1401`) already proves: the **reference** handler cannot
contradict it.

**Ruling owed: Q4 (what is `replayHandler` for?), Q5 (`Handler.sum` —
law it or lose it).** `.staging/operational-structure/DESIGN.md:45-56`
has already ruled what `replayHandler` is *not*; nobody has ruled what
it *is*.

---

### 3.5 — The R5 gate is a three-link chain presented as one link, and the Lean interpreter is not on it

**Class:** conformance, adequacy, claim-scope.
**Found by:** defun-plane H-5, word-store §2, handlers-semantics B.7,
host-api H5.

`Defun.lean:409-412` says "`runP` is what the emitter's gate executes,
at the exact fuel `p.length + 1`". Word-boundary grep at HEAD: `runP`
occurs in `Defun.lean`, `Mcp.lean`, `Fragments.lean`,
`Representation.lean` — **in statements and prose only.** No
`lake exe`, no fixture, no test computes it.

What the gates actually execute:

| Gate | Compares | Against |
|---|---|---|
| `VectorPrograms.test.ts:33-39` | the answered addresses of the **separately emitted** `test/generated/VectorPrograms.ts` | `vector.word`'s binding **addresses** — and `vector.word` is `Tree.flatten` (`tools/Vectors.lean:35`), not any interpreter's output |
| `ConformanceVectors.test.ts:32-35` | each Lean binding's node, replayed | its declared address, via this host's digest |
| `Programs.test.ts:104-133` | host cont addresses | `VectorProgramAddresses.json` — **encode-side** |
| `Programs.test.ts:155-167` | `byAddress.word` | `direct.word` — **this host against itself** — plus `word.length === instructions.length` |
| `BrainStem.test.ts:367` | `cas_run_ref`'s word, one program | `library/cas/vectors/file-readme.json` |

So the chain R5's sentence asserts is

```
TS host run  =gate=  fixture word (flatten)  =???=  runP/run  =bridge=  interpretRef
                                            ^^^^^
```

and the marked link is carried by `putTree_correct`
(`TreeProg.lean:467`, named at `Lang.lean:26-29`) — a real theorem
that is nowhere named as the link making R5's sentence true, and whose
conclusion is a **`Sublist`**, not an equality.

```
FALSIFIER  change runP's word semantics — make a duplicate put append
           — and exhibit a red gate
WITNESS    no gate goes red. Defun.lean still compiles; every fixture,
           every test, and every generated byte is unchanged.
CLASS      conformance, adequacy
```

**And nothing anywhere compares `List Binding` to `List Binding`.**
Word equality in Lean is list equality on `(Addr32, Node)` pairs
(`Word.lean:29-35`). `VectorPrograms.test.ts` reads the `address` half
of every binding and never the `node` half. No gate compares store
state after a run. `ObsEq.of_run`'s `∀ w` hypothesis
(`Representation.lean:162-165`) is discharged by nothing, so "the
equality the cross-host run gate decides per-program"
(`Representation.lean:130-133`) is ASSERTED.

**One-line statement of what the R5 gate certifies today.** *A host's
puts answer the Lean addresses in the Lean order, and each Lean binding
is honest on the host. It does not certify word equality, store-state
agreement, program equivalence, refusal behaviour, or root agreement.*

---

### 3.6 — The tower has no bottom, and one of its operations has no consumer

**Class:** conformance, claim-scope.
**Found by:** handlers-semantics B.5.

R12 (`EFFECTS-BACKEND.md:205-216`) says `CasStore` "is itself
IMPLEMENTED as a program over the byte-plane signature" and that
"interpretation composes all the way down to the admitted seams
(digest, filesystem, network), which are the only places the tower
touches trust."

Grep over `library/cas` for `ByteSig`: nine hits, **all inside
`Tower.lean`** (`:11, :49, :51, :54, :57, :60, :93, :104, :111`).
There is no `Handler ByteSig M` for any `M`. So `casOverBytes` has
never been interpreted, `interpret_through` has never been instantiated
at a real pair, and the descent stops one level above the seams. The
refinement theorem is honestly marked owed (`Tower.lean:26-29`,
ledger state `obligation`) — but it **cannot be stated** until a
byte-plane handler exists, which the owed-note does not record.

```
LAW        R2 — a signature's operation enters only with a real
           consumer (EFFECTS-BACKEND.md:49-51, grammar-grill ruling 5)
FALSIFIER  exhibit an operation of a landed signature with no consumer
WITNESS    ByteE.presence. Four sites, all its own definition: the
           constructor (Tower.lean:38), its answer-type row (:44), and
           its smart constructor bytePresence (:54-55). No caller
           anywhere; casOverBytes uses byteLoad for presence testing
           (Tower.lean:118, :127).
CLASS      conformance — the ruling is decidable by grep, and this is
           a red gate the estate does not run
```

**Ruling owed: Q6.**

---

### 3.7 — `Word` carries no identity invariant, and `wf` admits words no interpreter can produce

**Class:** invariant, claim-scope, adequacy.
**Found by:** word-store §3.3 + §3.9 + §3.4.

R4 says identity hashes presentations. In the carrier, nothing enforces
it. `Binding` is any `(Addr32, Node)` pair (`Word.lean:29-32`); `wf`
never mentions an address function (`:141-150`). The honesty predicate
exists — `Honest w := ∀ p ∈ w, p.address = H (encodeNode p.node) ∧
p.node.WF` — but it lives in the **grammar** namespace
(`Tree.lean:250-251`) and is a field of `Word`, `NonemptyWord`,
`Word.Admitted` and `ConformanceVector` in none of the four.

```
LAW        a conformance vector's word is honest
FALSIFIER  exhibit a vector binding one address to two different nodes
           that CHECKS
WITNESS (KERNEL-CHECKED)
  ConformanceVector.check
    { name := "shadow", description := "two nodes, one address"
      word := ⟨[Binding.mk a0 n1, Binding.mk a0 n2], by decide⟩ }
    |>.isOk = true
  where n1 = ⟨0,0,[],[]⟩, n2 = ⟨1,0,[],[]⟩
  (ConformanceVector.check runs Word.wf and nothing else,
   Vectors.lean:141-146)
CLASS      invariant, claim-scope
```

A second kernel-checked witness: `wf` never checks that a binding's
address is fresh in the prior word, so it admits a word binding one
address to two distinct nodes — and `wf_toStore_closed` then certifies
the projection as `Closed`. **No run can produce such a word**, because
`step` appends only in the `.fresh` arm. So the reachable words are a
proper subset of `{w | wf w}`, and the gap is exactly the shadowed
words (L79/L80).

A third, on the same predicate: `wf` is strictly finer than
`Closed ∘ toStore` and is **not** a store property at all.
Kernel-checked witness: a word whose shadowed second binding dangles
fails `wf` while the store it projects to is `Closed`, because
first-binding resolution makes that binding invisible. `Word.lean:20-22`
reads as an equivalence ("nothing dangles, nothing mis-kinds, through
the word as through the store"); it is one-directional (L71/L72).

**Mitigation, named.** `ConformanceVectors.test.ts:32-35` re-derives
each address from its node and *does* catch the first witness. So
honesty is **GATED on the host** and never **INVARIANT in the
carrier** — a defensible position (R4's discipline pushed to the
boundary) that should be written down, because `Word.lean:220-222`
reads as if `Admitted` were the strong object.

**Ruling owed: Q3.**

---

### 3.8 — The roots plane has three answers, and Lean's is the one R10 makes the meaning

**Class:** conformance, abstraction.
**Found by:** word-store §3.6, host-api X3/T-2/T-3, prog-carrier X-1.

| Carrier | `publish a; publish a; listRoots` | order |
|---|---|---|
| Lean `stepRooted` (`Roots.lean:77-79`, `roots ++ [a]` unconditional) | `[a, a]` | publication order |
| TS `RootStore` (`Backend.ts:86`, a `Set`) | `[a]` | insertion order |
| MCP `cas_list_roots` (`handlers.ts:294-296`, `toSorted()`) | `[a]` | sorted |

`Backend.ts:86` documents `publish` as "Idempotent" and `:90` documents
`list` as "Order is unspecified". Neither is true of the Lean
semantics, and R10 makes the Lean handler the meaning
(`EFFECTS-BACKEND.md:158-162`).

```
KERNEL-CHECKED  (runRooted H 4
                   ((publish a0).bind fun _ => (publish a0).bind fun _ => listRoots)
                   ([Binding.mk a0 n1], [])).2.2  =  [a0, a0]
KERNEL-CHECKED  publication order, not sorted:
                (… publish a1 … publish a0 … listRoots …).2.2 = [a1, a0]
BATTERY         BrainStem.test.ts:346 asserts roots toEqual [contAddress]
                after ONE publish — the only case where all three agree
CLASS           conformance, abstraction (α-commutation)
```

Two riders. `runRooted` (`Roots.lean:122-130`) carries **no theorem at
all**. And the TS `cas_publish_root` is *stronger* than Lean's
`publish`: it requires `loader.load(address)` to succeed
(`handlers.ts:279`) where Lean requires only `Word.find w a ≠ none`.
That is not a defect — a realization may refuse more — but the refusal
sets differ and nothing says so. Separately, the fail-closed guard is
not a seam law: `RootStoreShape.publish` (`Backend.ts:86-89`) takes any
`ContentId`, `Cas.RootStore` is exported, and the guard is two
hand-written copies (`commands.ts:696-700` and the MCP handler), so a
library client publishes a dangling root in one call.

**Ruling owed: Q14.**

---

### 3.9 — Four doors that claim to mirror one operation and do not

**Class:** conformance, adequacy, contract.
**Found by:** host-api H2/H3/X4/X5, defun-plane H-4.

**(a) `runProgramAt` vs `runProgram`.** `Programs.ts:544-548` asserts
they agree "by construction"; the only check is a self-comparison over
the registered programs.

```
EXHIBIT D (EXECUTED, HEAD Programs.ts, SHA-256)
  p = [ put v0 t1 [0x03], put v0 t1 [0x04], load answer(1.5) ]
  D1 encodeLineBody(p[2]) = 010100000001              ← answer(1)
  D2 runProgram(store, p)                       = Failure
  D3 runProgramAt(store, putProgram(p).address)  = Success, word 2, 3 answers
```

The same table refuses through one door and succeeds through the other.
`runProgramAt` has **no production caller** — both real callers compose
`loadProgram` + `runProgram` by hand (`commands.ts:651`,
`handlers.ts:248`). Three spellings of one act, one of them dead.

**(b) `decodeProg` vs `loadProgram`, positional vs address-keyed.**
Lean's `decodeProg` reads `w.getLast?` (`Defun.lean:941`) — it recovers
a program only from a word that IS exactly that program's encoding.
The SHIPPED door (`cas_run_ref`, `handlers.ts:248-253`) is
address-keyed and has **no model-level counterpart at all**.

```
FALSIFIER  exhibit a word where a program is recoverable by address
           and decodeProg answers none
WITNESS    w = encodeProg H p ++ [b] for any binding b whose node is
           not a cont node. decodeProg w = none; loadProgram still
           recovers p. EVERY REAL STORE IS OF THIS SHAPE AFTER ITS
           SECOND PROGRAM.
```

**(c) The declared line count.** Lean's `decodeProg` never reads the
cont node's payload; the host refuses on disagreement
(`Programs.ts:437-455`), and `Manifest.lean:618-620` declares
`lineCount` with a MEANING the Lean decoder does not enforce. Witness:
a cont node declaring 7 lines and naming 1 — Lean answers `some [l]`,
the host refuses. Neither side has a battery, so the divergence is
invisible on both.

**(d) The empty table.** `runPFrom` on `[]` with an empty history is
`.refused (.failed "defun: empty program")` (`Defun.lean:273-276`).

```
EXHIBIT E (EXECUTED)
  E1 runProgram(store, [])    = Success { word: [], answers: [] }
  E2 putProgram(store, [])    = Success, cont address 9ca0e761…67b02
  E3 runProgramAt(empty prog) = Success { word: [], answers: [] }
```

An "empty program" is a first-class, publishable, runnable store
citizen on this host and a refusal in the model. Nothing in
`Programs.ts` mentions the case. **Silence is the defect.**

**Ruling owed: Q10, Q11.**

---

### 3.10 — The revision-1 decoder has no exactness law, and its docstring claims one

**Class:** adequacy, claim-scope.
**Found by:** schema-universe B-1.

`Ast.ofRepresentationJson`'s docstring says it decodes "exactly the
spellings `Ast.toRepresentationJson` emits, key order and all, nothing
else" (`SelfCodec.lean:1347-1349`) — a left-inverse claim about the
decoder's *domain*. What is proved is the other direction only
(L151, L152). The value plane's codec has exactly the missing law with
no premise at all (`decode_exact`, `Codec/Laws/Mutual.lean:251-255`,
proved *first* in that module). The schema plane's own codec has the
discipline; the schema plane's *self*-codec does not.

```
LAW        ofRepresentationJson v = some a → a.toRepresentationJson = v
FALSIFIER  exhibit v, a with ofRep v = some a and toRep a ≠ v
ADVERSARY  widen the Null arm:
             | .obj [("_tag", .str "Null"), ("checks", .arr [_])] => some .null
           It accepts {"_tag":"Null","checks":[<anything>]} and
           answers .null, whose re-emission is {"_tag":"Null","checks":[]}.
WHY IT PASSES  the round trip quantifies over the ENCODER's image, so
           it is unaffected; ofRepresentationJson_repNormal still holds
           (.null is RepNormal); ingest_wf still holds; ingest_envelope
           still holds. The door now silently DISCARDS A CHECK and
           READDRESSES THE SCHEMA.
BATTERY    none exists — this is the missing statement
CLASS      adequacy
```

The chain this blocks: `ingest v = .ok a → canonValue v = a.envelope →
a.payload = renderPlain (canonValue v)`. Without it, "the same code
from any spelling lands at the same address" (`Ingest.lean:23-26`) is
ASSERTED, carried by `#guard` witnesses on a handful of shapes and by
the cross-runtime corpus — not by a theorem quantified over `v`.

By inspection of `:1351-1385` the statement is **true today**: every
arm is an exact literal pattern and the two non-structural gates
re-emit what they matched. It is a real proof rather than a `rfl`
because of `declOfRepresentation`'s registry dispatch — which is why
`declOfRepresentation_image` (`:1671`) already exists as a private
inversion lemma and would be reused.

---

### 3.11 — The two schema doors disagree, and the estate's own record says where

**Class:** conformance, adequacy.
**Found by:** schema-universe B-2 and B-3.

**(a) Revision 0.** `CanonicalSchema.ts:680-691` is one switch over the
revision byte and admits rev-0 via `legacySchema`; Lean's `ofEnvelope`
accepts revision 1 and nothing else (`SelfCodec.lean:1458`).

```
LAW        the two doors name the same verdict on the same bytes
           (CanonicalSchema.ts:110-115)
FALSIFIER  exhibit bytes v with ingest refusing and the TS door admitting
WITNESS    v = {"revision":0,"value":{"_tag":"String"}}
             Lean : ingestBytes v = .error .wrongRevision
             TS   : fromEnvelope admits, returns Schema.String
BATTERY    none — the differential corpus is revision-1 only
STRUCTURAL CAUSE
           Ast.legacyEnvelope (SelfCodec.lean:313) has NO DECODER
           anywhere in Lean; ingestLegacy takes the BARE tagged value
           (Ingest.lean:320-333). The envelope-stripping step exists on
           the TypeScript side and not on the Lean side.
CLASS      conformance
```

Sub-case, benign only by accident: TS collapses a null literal on the
legacy read (`CanonicalSchema.ts:816`) where Lean keeps `.lit .null`.
The two agree *at the address* only because `repNorm` identifies them
(`litNull_payload`, `Basis.lean:651`). Nothing states that.

**(b) The annotations bag, and self-comparison at exactly the
documented divergence.** The estate's own record states the fact:
"`toJson` emits an `annotations` bag on a `Declaration` node …
so exact-key enforcement on the TypeScript side would refuse three of
the four registry rows as they are actually stored"
(`Cas/Backend/Admission.lean:53-58`). TypeScript answers by reading the
generated key lists as *required* keys, tolerating extras
(`SchemaAdmission.ts:16-20`). Lean's arm is an exact four-key pattern
(`SelfCodec.lean:1365-1368`), and canonical key order puts `_tag`
before `annotations` — five keys, no matching arm, `none`.

```
LAW        a row the registry ADMITS can be read back from the bytes
           the source language actually writes for it
FALSIFIER  exhibit an admitted DeclarationId row whose real persisted
           representation ingest refuses
WITNESS    Schema.Date as Effect stores it
             Lean : ingestBytes = .error .notASchema
             TS   : admitDocument accepts (required-keys column)
BATTERY    none. Every declaration row in the differential corpus is
           the LEAN-PROJECTED spelling — decl-date, decl-url,
           decl-option-str, decl-option-nested.
CLASS      conformance, adequacy
```

The admission map is the plane's CLAIMS artifact and its verdict
`ADMITTED` is pinned "by a WITNESS: a code of the carrier whose
revision-1 projection … survives `ingest`" (`AdmissionMap.lean:37-40`)
— the estate's own projection checked against the estate's own decoder.
R6 names the alternative: "generator and extractor as each other's
check, **never self-comparison**" (`EFFECTS-BACKEND.md:107-109`). This
is not a defect in the decoder — refusing an un-modelled annotation bag
is defensible. It is a defect in the **claim**: `ADMITTED` reads, to any
outsider, as "the door takes this variant as Effect writes it", and it
does not.

**Ruling owed: Q16, Q17.**

---

### 3.12 — The host's abstraction function has no stated domain, and the encoder truncates instead of refusing

**Class:** abstraction, domain, conformance.
**Found by:** host-api H1.

`α(Program) = Cas.Lang.PProg` is never written down and its domain is
never stated. It is partial: `PLine` carries `version tag : UInt8` and
`PIn.ans (i : Nat)`, where the host `Line` carries `number` in all four
positions (`Programs.ts:114-128`). `PLine.WF` needs no byte clause
because the Lean *type* supplies it; the host's only door is `bounded`
(`Programs.ts:312-331`), which checks three upper bounds and nothing
else. The encoder then narrows by `Uint8Array.of` and `>>>`, both of
which **truncate silently**.

```
LAW        putProgram answers encodeProg's address for the table it was given
FALSIFIER  exhibit p ≠ q with programAddress(H,p) = programAddress(H,q)
EXHIBIT A (EXECUTED, HEAD Programs.ts, SHA-256)
  p = [{ _tag:"put", version:  0, tag:1, payload:[0x01], refs:[] }]
  q = [{ _tag:"put", version:256, tag:1, payload:[0x01], refs:[] }]
  encodeLineBody(p[0]) = encodeLineBody(q[0]) = 000001000000010100000000
  programAddress(p) = programAddress(q) = b81a029e…3f35
  loadProgram(putProgram(q)) = [{ "_tag":"put","version":0,… }]
  → q is stored at p's address and reads back as p
EXHIBIT B  expectedTag: 257 encodes as byte 01
EXHIBIT C  answer(-1) encodes as 0101ffffffff and reads back as
           answer(4294967295); putProgram succeeds
BATTERY    none exists
CLASS      abstraction, domain
```

`decodeProg_encodeProg`'s `hwf` premise is exactly where the break
lives: the host admits tables outside `hwf`'s domain, so the theorem
says nothing about them, and the code does the *wrong* thing rather
than nothing.

**In flight, stated once and not relied on.** The dirty working copy of
`Programs.ts` carries a `wfRefusal` door replacing `bounded`, which
closes exhibits A–C. It is uncommitted, so HEAD is what this document
grades. It does **not** close §3.29 (`stepNodes`/`encodeLine`/
`tableNode` stay ungated) and it touches none of §3.1, §3.9, §3.14–§3.18.

---

### 3.13 — The remaining ledger

Each row is a confirmed finding with its falsifier compressed to one
line and its obligation class. Full exhibits are in the area reports.

| # | Finding | Falsifier | Class |
|---|---|---|---|
| 3.14 | The lock-freedom argument names no judgment. `Store.ts:10-11`, `Backend.ts:23-25`, `KvsBackend.ts:23` say "sound"/"lawful"/"soundness rests where it already rested". | `resolvesIn_mono` (`Word.lean:135-138`) covers reference stability under **word growth**; the concurrent byte plane has no model, and the collision arm's read-then-write window (`admission.ts:93-97` → `Store.ts:268`) is closed only by the collision-resistance assumption L99 refuses to make. | claim-scope, frame |
| 3.15 | The byte seam's stated law admits an overwriting backend. `Backend.ts:20-22`: "`putBytes` is join with a singleton". | The law is silent on *differing* bytes at one id, and the three realizations pick differently: memory refuses (`Backend.ts:135-148`), file refuses (`FileBackend.ts:199-209`), kvs is "an unconditional `set`" (`KvsBackend.ts:95-101`). Under an overwriting backend the plane is not grow-only, so §3.14's premise fails, and `Word.find`'s first-binding resolution inverts against last-write-wins. Reachability through the store door is closed today; **the defect is in the stated law, not (currently) in behaviour**. | adequacy, conformance |
| 3.16 | `PLine.WF` is not the encodability condition it is used as; "the encoded table admits as a word" overclaims. | `l = .put 0 0 (List.replicate 4294967285 0) []` — `PLine.WF l` holds, `\|encodeLineBody l\| = 4294967296`, so `¬ Node.WF (encodeLine l)` and `putWord` refuses `.notWellFormed`, while `encodeProg_wf` still reports `Word.wf = true` because `Word.wf` never inspects `Node.WF`. The host's `bounded` mirrors `PLine.WF` and inherits the hole. | domain, adequacy |
| 3.17 | The version byte is a free parameter, so a table has many addresses. | `decodeLine` gates on the tag alone (`Defun.lean:582`) and `decodeLine_exact` concludes about `n.tag` and `n.payload`, never `n.version`. `n₁ = ⟨schemeVersion, stepWireTag, body, []⟩` and `n₂ = ⟨7, stepWireTag, body, []⟩` both decode to `l`. A cont node naming version-7 step nodes decodes to the same table at a **different** cont address. The host has the identical hole (`decodeLine`, `Programs.ts:295`), so the two carriers are consistently open. | abstraction, claim-scope (bears on R4) |
| 3.18 | `Graph.verify`'s biconditional, and its under-reported refusal set. | `Graph.ts:203-204` says "succeeds **exactly when** the backend faithfully serves the whole graph": neither direction proved or gated, "faithfully" undefined. `Graph.ts:200-202` enumerates three checks; `:171-176` also refuses `WrongKindReference` on every edge, which `load` never does. `commands.ts:1133` inherits the omission. No Lean shadow exists for the estate's flagship verb. | claim-scope |
| 3.19 | `H` gets three postures in one library and no ruling says which is authoritative. | `referenceHandler`/`step`/`run`/`casOverBytes` take `H` with **no hypothesis**; `Tree.flatten_wf` takes `hInj : Function.Injective H`; `Address.lean:59-62` deliberately *produces* a collision pair. Witness: `degenerateH := fun _ => ⟨List.replicate 32 0, _⟩` collides every node at address 0 — every theorem in `Handler`/`Interp`/`Tower` survives unchanged (kernel-checked, exhibits §8). **Not a bug**: collision-as-explicit-refusal is deliberate and is *why* no injectivity hypothesis is needed. The defect is that "meaning lives in exactly one place" names a FAMILY indexed by `H`, and `ObsEq` is correctly `H`-indexed while the prose is not. | adequacy, claim-scope |
| 3.20 | `Prog`'s universe exceeds every semantics it has. | `(Prog.pure Nat : Prog CasSig Type)` typechecks (`Prog.lean:25` admits `A : Type u`) and `interpret`/`interpretRef`/`step`/`run` do not typecheck at it. A legal program with syntax and no semantics, in any handler, at any target. Nothing in `library/` or `examples/` uses the wider form. | claim-scope, domain |
| 3.21 | `interpret_op` fires on nothing, and five theorems have zero consumers. | `Prog.op` occurs in exactly two places, both inside `interpret_op` itself (verified by grep). Every smart constructor spells `.vis` directly, so `rw [interpret_op]` / `simp [interpret_op]` — R14a-P2's named mechanism — fire on nothing. `interpret_op`, `eq_of_forall_interpret`, `interpret_through`, `SemEq` and `SemEq.of_eq` each have zero consumers. Separately, the general `interpret`-at-a-`vis` lemma (L12, `rfl`) is restated twice locally — `interpretRef_vis` (`Handler.lean:149`) and `interpret_vis_state` (`Auth.lean:387`, whose own docstring calls itself "the generic form" while living downstream of the special one) — and never stated generally. | claim-scope, abstraction |
| 3.22 | R14a P2 and P3 are falsified by the estate's own code. | **P2** ("continuations end in `.pure`"): `failWith` (`Ops.lean:55-56`) and `byteFail` (`Tower.lean:60-61`) end in `Empty.elim`; `embedFrom` writes `.vis` directly; `stepRooted` rebinds `rest.inl.bind k`. P2's stated consequence fails for the fail node: `Prog.op (.fail r) : Prog CasSig Empty` is not `failWith r : Prog CasSig A` and no lemma relates them (L7 is the missing statement). **P3** ("typeclass form in program text"): the typeclass `pure` appears at exactly **two** sites in all of `Cas/Lang/` — the instance itself and inside `interpret`. Every smart constructor, every handler body, every program-building definition uses the constructor spelling. P3 as written describes the inverse of the estate's practice. | invariant (of the discipline), claim-scope |
| 3.23 | FRAME-1 at the table is vacuous at the first line and bundles a premise its frame half does not use. | `runP_frame_sound` (`Defun.lean:1965`) takes `hreach : runPFrom H [] pre w = (.done b, w')`. At `pre = []` that is UNSATISFIABLE — the nil clause refuses `"defun: empty program"`. Line 0 *is* covered, by `runPFrom_frame_sound` (`:1944`), which takes no run premise; and the frame conjunct of `runP_frame_sound` is proved by `simpa using runPFrom_frame_sound …`, using `hreach` not at all. `Fragments.lean:200-212` cites it as the whole-table theorem; a consumer instantiating at `pre = []` gets nothing. | claim-scope |
| 3.24 | The envelope's two numberings, and what a wrong consumer does with them. | `PProg.puts` is a `filterMap` (numbers PUTS); `dataflowFrom` counts LINES. On `p = [.load (.lit a), .put 0 0 [] [(t, .ans 0)]]`, `puts p` has one entry at index 0 while `dataflow p = [(1,0)]`. A grant checker reading "put 0 consumes line 0's answer" is describing a put that sits at line 1. Nothing at either definition site says so; `ProgProse.lean:28-31` says it in a different module. Adjacent: `Envelope` records no loads at all, so `envelope p = envelope q` does not determine `runP p = runP q` — correct for a GRANT, exactly wrong for a program summary, and nothing states which reading is licensed. | adequacy |
| 3.25 | `Ast.WF`'s struct clause is justified by a retired revision's rationale. | `Ast.lean:165-169` grounds sortedness in schema canonicality. Under revision 1 a struct's fields are an **array** (`SelfCodec.lean:225-229`) and the module says so itself (`:693-699`): canonicality, the round trip and the census all take **no** `WF` premise. Where the clause *is* load-bearing is the value plane (`encode_canonical`'s struct arm, `Codec/Laws/Render.lean:73-79`). Consequence: `payload_inj`'s `WF` premise is stronger than its proof needs — the struct-sortedness half is never consumed — so a client holding a code that is `WF` except for field order cannot cite `payload_inj` about it although the statement is true of it. | claim-scope |
| 3.26 | `schemaKindTag` is a second spelling of a byte the grammar owns. | `SelfCodec.lean:34` defines `0x53` independently of `Cas/Grammar/Sorts.lean:63`. Edit either and the other does not move; nothing goes red. The estate's own statement of the rule is two files away, at the same grain, for the same kind of byte: `System.lean:3-7` argues the import edge and then does exactly that for the file tag (`def fileKindTag := Ty.file.wireTag` + `#guard`). `exchangeKindTag` and `systemKindTag` are honestly declared working tags with the registry ruling deferred; `0x53` **is** a registry row. | conformance |
| 3.27 | `envelope`/`payload` are total on `Ast`; the door is not, and the boundary is a `#guard`. | `ingest a.envelope = .ok a.repNorm` is stated only under `a.WF`. The converse — a non-`WF` code's own envelope is refused, and refused `illFormed` — is stated nowhere and carried by one point witness per clause in a different module (`Cas/Backend/Admission.lean:427-428`). TypeScript normalizes property-signature order on the *lowering* path and refuses it at the *door*; Lean has the door's half and **no lowering half** (`repNorm` performs the literal-null collapse and nothing else). A Lean caller who builds `Ast.struct` by hand is caught by nothing until the door refuses their own bytes. | contract |
| 3.28 | The designated result is observed by nothing. | `PProg`'s contract is "the designated result is the last answer" (`Defun.lean:12, 186, 213`) and `ObsEq` carries it on the `done` branch. No host observes it: the generated program returns the whole answer array (`EmitProg.lean:126`); `RunOutcome` has `word` and `answers` and no result field; `cas_run`'s reply is `{word}` only. A host returning `answers[0]` instead of `answers[n-1]` passes every gate. Either the contract is load-bearing and a gate is owed, or the prose stops calling it the program's result. | conformance |
| 3.29 | The representation is exported, so the one gate is bypassable — and the estate's own showcase bypasses it. | `stepNodes`, `encodeLine`, `encodeLineBody` and `tableNode` are public and none consults `bounded`. `test/BrainStem.test.ts:295-296` uses exactly that path (`stepNodes` then `tableNode`, put over MCP `cas_put`), so the estate's R7 showcase transcript routes around the program plane's only admission door. Export-closure and representation-leak at once: the byte layout is public, so it can never be replaced, and the invariant `putProgram` establishes is not established by the closure a client actually has. | abstraction, invariant |
| 3.30 | CLI surface defects on the two verbs that carry R7. | (a) `cas put --program --json` prints prose — `putProgramDocument` takes `(file: string)` only and the dispatcher discards `json` (`commands.ts:525, 626-628`); executed against the real CLI, an agent branching on `--json` gets four prose lines. This falsifies the ratified two-register law (`IMPLEMENTATION-PLAN.md:1553-1557`). (b) `decodeLiftDocument` maps every instruction to a `put` line with an `answer` operand, so `load` lines and `literal` operands have no spelling, while the help text claims the whole table. (c) No dataflow check: a program whose line 0 names answer 5 is publishable and permanently unrunnable, and `cas publish` will make it a root. (d) Neither verb appears in `test/Cli.test.ts`. | conformance, contract |
| 3.31 | Three lowerings, one gate, and a generated docstring assembled from two of them. | `Tree.progK` (`TreeProg.lean:40`, into `Prog`), `treeProg` (`EmitProg.lean:85`, into `PProg`), `Tree.table` (`ProgProse.lean:238`, into `PProg`). No theorem relates any pair; `ProgProse.lean:225` says so outright. `EmitPrograms.lean:124` assembles a generated module's docstring from **both** `PProg` walks, so a generated module can carry prose describing table A above code lowered from table B. The byte gate cannot see it: both halves regenerate from the same sources, so the file is self-consistent. The only pin is one `#guard` on one two-node witness comparing put SHAPES only (`ProgProse.lean:298-299`) — reference operands and dataflow are not compared, and no term with a `parent`, `entry`, `manifest` or `file` node is covered. | abstraction, conformance |
| 3.32 | Documentation drift in both directions, including of the ratified law. | **Understating** (four sites): `SelfCodec.lean:342-346` says the revision-1 representation has "no canonicality theorem, no decoder, and no round trip yet" — all four exist 400–1600 lines below in the same file; `Schema.lean:59-63` and `Basis.lean:151-153` say `ofRepresentationJson_repNormal` is unproved (it is `SelfCodec.lean:1969`), and the bloat ledger's arithmetic at `Basis.lean:163` is off by that item; **`EFFECTS-BACKEND.md:75-79` (R4, ratified law)** says revision 1's byte theorem "remains pending" — `payload_renderPlain` (`SelfCodec.lean:942`) is it. **Overstating** (three sites): `Mcp.lean:69-76` and `ProgProse.lean:37-41, 222-225` say the emitter "never builds a `PProg`" (it does, `EmitProg.lean:85`); `Cas.lean:134-137` says wire tags 14/15 "remain RESERVED" (ratified 2026-08-29). Drift *of* the law is the same defect with a bigger blast radius. | claim-scope |
| 3.33 | The ratified rulings are bound to no build artifact. | The estate has the mechanism — the `LAW <id>: <clause>` docstring convention and the `laws` ledger executable (`tools/Laws.lean:1-70`, gated by `check:cas:laws`, `mise.toml:444`). It is wired for `SM-` rulings only. **No `LAW` line exists anywhere in `Cas/Lang/`.** So R1, R2, R10, R12, R14 and R14a are bound to nothing the build reads — precisely the defect `Laws.lean:8-11` names in its own opening. | conformance |
| 3.34 | `Sig` does not enforce the first-order discipline it is credited with. | `def higherOrderSig : Sig := ⟨Unit, fun _ => Prog CasSig Nat⟩` typechecks — an operation whose ANSWER is a program, the exact shape R2's prose excludes. Everything downstream still applies and nothing refuses it. The estate has a named boundary of this kind one rung down and for a different carrier (`PLine.HashDetermined`, `Defun.lean:1480`, with its discharge and its counter-witness); there is no analogue at `Sig`. | adequacy, claim-scope |
| 3.35 | Stratum 1's decidability claim has no instance for any signature. | R14 puts "operations" in stratum 1 and says their equality "is `DecidableEq` — structural, hashable, addressable". `example : DecidableEq CasE := inferInstance` **fails**: `CasE`, `LlmE`, `RootE`, `ByteE`, `Refusal` and `Status` carry no `deriving` clause. The only `deriving DecidableEq` in `Cas/Lang/` are on `PIn`, `PLine`, `PKind`, `PutShape`, `Envelope`. So R14's "operations" row is discharged by `PLine` — a **different** type with a different operation vocabulary (put/load only, no `fail`) — and the two are not in bijection. | claim-scope |
| 3.36 | `decodeProg_encodeProg` is cited without its premises on a ratified, byte-gated surface — and the host discharges one of them by naming an assumption L99 refuses to make. | The theorem carries `hwf` and `hsep` (`Defun.lean:998-1000`); the module triages both honestly at `:907-935` and exhibits `hsep`'s necessity at `:1023`. `Fragments.lean:88-92` restates both correctly. Three surfaces do not: **`REGISTRY.md:35`** — the ratified `cont` sort row, GENERATED from `Manifest.lean:633-640` and byte-gated — says "a table stored as content and recovered from that content is the same table", no premise; **`Cas.lean:122-128`**, the library's own orientation docstring, likewise; and **`Programs.ts:69-77`** names `hsep` and then discharges it: "Under SHA-256 the premise is the collision resistance this host already assumes everywhere else, so it is inherited rather than restated." `hsep` is injectivity of `H` on this table's line encodings — a mathematical premise; "collision resistance" is a computational assumption with no judgment named at that site and no trust statement cited. The estate has a vocabulary for exactly this distinction (`encodeProg_wf` is "Level 0, no injectivity anywhere", `Defun.lean:867-870`; `putTree_correct` takes `Function.Injective H` outright) and this sentence steps outside it. Falsifier: exhibit a reader of `REGISTRY.md:35` who concludes recovery is unconditional, then exhibit the estate's own defeating table (`Defun.lean:1023-1038` — `H` constant, `p = [.load (.ans 0), .load (.ans 1)]`, every line WF, `encodeProg_wf` still true, and `decodeProg` returns a **one**-line table where `p` had two). | claim-scope |

**Counts.** **35 deduplicated holes and inconsistencies** — 12 with
full exhibits (§3.1–§3.12) and 23 in the remaining ledger
(§3.14–§3.36). Eleven of the 35 are cross-carrier: the same object
behaves differently in Lean and on the host, or in two host carriers.
Nine carry a witness that has been executed or kernel-checked rather
than argued.

By obligation class (`CONTRACT.md:109-139`; a finding may carry more
than one): **claim-scope 20**, **adequacy 13**, **conformance 13**,
**abstraction 7**, **contract 4**, **invariant 3**, **domain 3**,
**frame 1**. No finding in this review falls under **termination** —
the estate's fuel discipline is in good order (L50, and the fuel is
produced rather than assumed).

---

## 4. Ruling questions for the operator

Decision 2 binds — no new abstractions, no new sorts, no carriers
minted where a seat exists. Everything below either needs a new
carrier, changes a behaviour, or contradicts a ratified ruling in
R1–R14a. Each is therefore a **question**, never a recommendation. The
options are stated because the operator asked for the shape of the
choice, not because the review prefers one.

### The word

**Q1 — Which counting rule is "the word"?** (§3.1; blocks debt rank 1
and everything downstream of R5.)
Lean's `run`/`referenceHandler` append only on `.fresh`; the host
pushes unconditionally; a registered vector exhibits the divergence and
a green test asserts it. Three shapes of answer are visible:
(i) the word is the **admitted** history — the host drops the push on
`AlreadyResident`, which requires `CasStoreShape.put` to report which
arm fired; (ii) the word is the **emission** history — Lean's `step`
appends on duplicate, which contradicts the stated reason for
`toStore_append_shadowed` and turns `runPFrom_puts_sound`'s `Sublist`
into a prefix; (iii) they are **two objects sharing a name** — the
emission word (`flatten`, the vector, the transfer order) and the
admission word (`run`, the history, what `wf` is a predicate on),
which coincide exactly when the emission has no repeated address.
**Sequencing:** `merge/cas-word` introduces a second word carrier
(`WordSig`/`since`, `WordWire.LogEntry`) and its described field list
(seq/at/address/tag/size) suggests a *summary*, not a binding. Read
that branch before ruling.

**Q2 — Does `put` answer freshness?** (§3.1 consequence.)
`AdmissionVerdict` already draws the `Admit`/`AlreadyResident`
distinction internally (`admission.ts:32-33`) and `Store.ts:258-272`
throws it away. Widening `put`'s answer to a two-field record over
`ContentId` and `boolean` is the only way the model's word becomes
computable through the export set. Is surfacing a distinction the
internal judge already makes a new abstraction under decision 2?

**Q3 — Does `Word.Admitted` carry honesty?** (§3.7.)
Moving `Honest` from `Cas.Grammar` into `Cas/IR/Word.lean` is
consolidation. Adding it as a *field* of `Admitted` changes what every
existing consumer must supply, and adding a fresh-address conjunct to
`wf` makes `Tree.flatten_wf` conditional on the emission having no
repeats — which is exactly the `shared-chunk` case, so this ruling is
downstream of Q1.

### The carrier

**Q4 — What is `replayHandler` for?** (§3.4; blocks debt rank 9.)
Two kernel-checked witnesses defeat R10's replay/record sentence as
written. Three exits are visible: fix the definition (make `load`
resolve against the consumed prefix and `put` tolerate duplicates) and
prove the round trip against `referenceHandler`; narrow the claim to
put-only programs and state that domain; or withdraw `replayHandler`
until the record/replay plane has a consumer. `DESIGN.md:45-56` has
ruled what it is *not*. **Nothing should be built on R10's
replay/record sentence until this is answered.**

**Q5 — `Handler.sum`: law it or lose it?** (§3.2; blocks debt rank 2.)
Zero uses, zero laws, while both live sum-consumers open-code the split
and `merge/cas-word` adds a third. Either the injection laws land and
the open-coded consumers are rewritten through it, or R10's
seam-effects clause names a mechanism the estate does not use.

**Q6 — Does the tower get a bottom, or does `casOverBytes` get
withdrawn?** (§3.6; blocks debt rank 8.)
A `Handler ByteSig M` would be a new *instance*, not a new sort — but
it is new code, so it is a ruling rather than a consolidation. Two
riders travel with it: `ByteE.presence` has no consumer and R2 gates
signature operations on consumers (remove the arm, or name its
consumer); and the owed refinement theorem's statement must settle
whether "agrees word for word" includes refusal **SORTS**, since
`casOverBytes` refuses only through `byteFail : String` and cannot
produce `Refusal.dangling`/`.wrongKind`/`.collision`. As currently
worded the theorem could be discharged while a client branching on the
`Refusal` constructors sees different answers from the two strata.

**Q7 — Does `⊕ₛ` get monoid laws, or is it ruled a bare binary
combinator?** (§3.2, L27/L28.)
Associativity and commutativity are **false as equations** in Lean, so
stating them at all requires a signature-morphism notion the estate
does not have; and a unit needs `Sig.empty`, which is a *value* of an
existing type but a new vocabulary item in a frozen algebra. Either
rule that `⊕ₛ` is a binary combinator with no monoid laws (amending
R2's ITrees analogy, §3.2, and requiring nested sums to be spelled
explicitly), or open a ruling for `SigHom`. `merge/cas-word`'s
`WordSig` makes the three-way sum concrete, so this is live now.

**Q8 — Do R14a's P2 and P3 change, or does the code?** (§3.22.)
Both rules are falsified by the estate's own code today. The review
does not choose: either the rules are restated to match practice, or
the practice is respelled through `Prog.op`/`Prog.inr` (which would
also give `interpret_op` its first subjects, §3.21).

**Q9 — Is `Prog`'s universe narrowed?** (§3.20.)
`A : Type u → A : Type` is a restriction, not a new abstraction, and
nothing in the estate uses the wider form — but it is a breaking
signature edit and wants confirmation before it is made.

### The host

**Q10 — Does `decodeProg` grow `loadProgram`'s clauses, or does
`loadProgram` stop claiming to mirror it?** (§3.9b/c.)
The host adds two clauses (payload exactly four bytes; declared count
equals edge count) that Lean does not have. The clauses are
defensible; the identification is what breaks.

**Q11 — The empty table: does the host refuse it, or is the divergence
recorded as intended?** (§3.9d.)
Lean refuses; the host makes an empty program a publishable, runnable
store citizen. Silence is the current state and is the defect either
way.

**Q12 — Is a new top-level definition over existing sorts "a new
abstraction" under decision 2?** (§3.9b, L114/L115.)
Two owed items turn on the answer: a model for address-keyed recovery
(`Word → Addr32 → Option PProg`, which the SHIPPED door needs and
which has no counterpart at all), and `decodeProg_exact`'s checked
decoder. Neither needs a new sort or a new carrier; both need a new
top-level definition.

**Q13 — Is dataflow closure an admission clause of the program plane,
or is an unrunnable program legitimate content under R7?** (§3.30c.)
The estate has the predicate (`dataflowClosed_eq`, `Defun.lean:1225`)
and the run-side theorem; only the placement is unruled. R7 says
programs are content, and content is not judged for runnability.

**Q14 — Is the roots plane's abstract value a list or a set?** (§3.8.)
R10 says the reference handler is the meaning and it is a grow-only
list in publication order; the host is a set with unspecified order and
is the thing that is deployed. `listRoots`'s answer type differs
between them.

**Q15 — The byte seam's differing-bytes arm: refuse or overwrite?**
(§3.15.)
One stated law, three realizations. Two refuse and one silently
overwrites; the law does not exclude either.

### The schema plane

**Q16 — Does `ingest` become revision-dispatching?** (§3.11a.)
TypeScript reads both revisions from one switch and is documented as
answering exactly what `ingest` answers. Lean refuses revision 0.
Either the Lean door grows the legacy arm (admitting more content — a
behaviour change), or the TypeScript door loses it (retiring read
compatibility for already-addressed rev-0 nodes), or the "same answer"
claim at `CanonicalSchema.ts:110-115` is narrowed in writing to
revision 1.

**Q17 — Does the estate store Effect's `annotations` bag, or strip
it?** (§3.11b; already recorded at `Cas/Backend/Admission.lean:53-60`.)
Until it is answered, `ADMITTED` on three registry rows means "admitted
in the estate's spelling", and the admission map does not say so. What
makes it urgent rather than tidy is that the corpus contains no
Effect-spelled row at exactly the three rows where the estate has
*documented* that Effect's spelling differs.

**Q18 — Does the schema plane get a field-order normalizer, or stay
refusal-only?** (§3.27.)
TypeScript normalizes on the lowering path and refuses at the door;
Lean has the refusal and no normalizer. The schema plane's authoring
door (the deriving handler) already sorts, so the open half is the
hand-built `Ast.struct`. An `Ast` sorter is not a new sort, but it is a
**second emit-path normalizer**, and `payload_eq_iff_repNorm`
(`Basis.lean:589`) makes "the emit-path normalizer set is `{repNorm}`"
a theorem. So the question is whether the plane widens the normalizer
set — breaking F3's minimality claim as stated — or keeps refusing.

**Q19 — The `$link` reserved-key asymmetry.** (Already named at
`Projection.lean:527-535` as wanting a ruling, not a patch: `lower`
refuses `$ref` in plain data, nothing refuses a user field literally
named `$link` on the encode side, and the runtime's `resolveMarkers`
refuses it on read. Repeated here because it is a live cross-carrier
inconsistency, not to re-open it.)

### Sequencing, not substance

Two items are flagged so they are not started early rather than because
they need a decision. The consolidation that defines `step` from
`referenceHandler` (making `step_handle` an `rfl` and deleting the
second spelling of the admission clauses) touches
`Cas/Lang/Interp.lean` and `Cas/Lang/Handler.lean`, which the merge
floor (`CORE-ABSTRACTIONS-PLAN.md:78-81`) puts after `merge/cas-word`
lands. And every sum-law item (Q5, Q7, debt rank 2) should be settled
**before** that merge rather than after, because `WordSig` is a third
hand-rolled sum consumer.

**Count: 19 ruling questions** (Q1–Q19). Three of them — **Q1** and
**Q2** (the word and its computability through the export set) and
**Q5** (`Handler.sum`) — block a top-five debt item; two more (Q4, Q6)
block debt ranks 9 and 8. The other three of the top five —
`treeProg` correctness, the revision-1 decoder's exactness, and
interpretation's universal property — are blocked by **no ruling at
all**. They are proof work over existing carriers, statable today, and
the exhibit files already carry two of them.

---

## 5. What the estate gets right, on the record

Stated so the holes above are weighed against the base, and so a
consolidation does not lose any of it.

- **The monad laws are proved from first principles**, and the
  `LawfulMonad` instance is built from them rather than
  `sorry`-carried (`Representation.lean:39-58`). `interpret_bind`
  (`Handler.lean:53-60`) is proved once for every handler into every
  lawful target — the single strongest statement in the language, and
  the one that makes R10 worth saying.
- **The R10 obligation the ratified document itself named as owed for
  F3 is discharged.** `run_interpretRef_agree` (`Handler.lean:255-272`)
  agrees the fueled small step with the big-step reference, with the
  fuel **produced** rather than assumed (`run_of_interpretRef`,
  `:214-245`).
- **The bridge's triage is honest.** `Handler.lean:100-124` states,
  before the theorems, exactly what cannot be proved — the refusal word
  has no slot in `Except Refusal (A × Word)` — and the asymmetry
  propagates into `ObsEq.run_refused` (`Representation.lean:198-208`)
  instead of being quietly dropped. `Defun.lean:411-425` names the
  shortfall a third time. This is the anti-"technically" behaviour the
  operator is asking for, and it is already the house standard in this
  one place.
- **Meaning really does live in one place, and a theorem says so.**
  `step_handle` (`Handler.lean:131-144`) reconciles the two spellings
  of the put clause clause for clause, and `Defun.lean:244-245` then
  takes the right lesson: `putWord` is *defined as*
  `(referenceHandler H).handle (.put n)` rather than spelled a third
  time.
- **The defun plane's interior is a theorem.** The codec round trip and
  its exactness, the interpreter agreement at exact fuel, Level-0
  answer determination, the envelope sandwich and FRAME-1 are all
  kernel-checked, with their over-approximations **exhibited by
  witnesses** rather than asserted (`Defun.lean:2135`, `:2149`) and
  their necessary premises exhibited too (`:1023-1038`).
- **The schema plane measures its own redundancy and proves the
  measurement.** The carrier's bloat is exactly one collapse
  (`repNorm_the_one_collapse`, `Basis.lean:645`), the emit-path
  normalizer set is exactly `{repNorm}` and minimal
  (`normalizers_are_independent`, `:612`), and both are theorems, not
  claims. The value-plane codec carries exactness with **no premise at
  all** (`decode_exact`) — the discipline §3.10 asks the self-codec to
  match.
- **The hash-hypothesis lattice is the estate's model of claim-scope.**
  Level 0 needs nothing, Level 1 names `hInj` at its use sites, and
  **Level 2 is empty and forced to be** — with the emptiness itself
  exhibited (`Address.lean:75-86`). Every "collision resistance is
  inherited" sentence in the host (§3.36) is measured against a
  standard the estate set for itself.
- **`Fragments.lean` already answers, for an outside consumer, the
  question this document asks of every plane**: what may be assumed at
  each rung, including "assume nothing statically" for `Prog` itself
  (`:187-255`). The sum algebra has no equivalent page; that is the
  gap, not the idea.
- **One cross-host gate is a genuine decidable equality with the
  fixture derived on both sides**: `putProgram(t).address =
  encodeProg`'s cont address, character for character, over the
  registered corpus, byte-identity-gated in `check:cas`. It states an
  equation, the observable is 64 hex characters, and neither side is
  allowed to compute the other's answer. That is the standard the rest
  of the surface is measured against in §3, and it is the estate's own.

---

*Pre-grade. Awaiting the operator's grilling pass.*
