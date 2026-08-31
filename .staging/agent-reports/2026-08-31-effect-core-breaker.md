# Effect Core v1 — the breaker's assurance review

**Stage:** `lean-assurance-review` (`.claude/skills/lean/workflows/lean-assurance-review/SKILL.md`),
its "try to refute each link" section, verdict vocabulary and
`references/report-schema.md`.
**Gate passed:** every in-scope link has evidence or an explicit gap, and the
headline claim below is no stronger than the weakest required link.
**Witness file:** `.staging/effect-core-v1/breaker-exhibits.lean` — 59 theorems,
3 `#guard`s, 40 `#print axioms` receipts, 1049 lines. Elaborates clean.
**Host:** macOS, Lean `leanprover/lean4:v4.33.1`, `library/cas` cache warm.

```
cd library/cas && lake env lean ../../.staging/effect-core-v1/breaker-exhibits.lean
```

Result: no errors, no warnings. Every receipt reads `[propext]` or
`[propext, Quot.sound]`. No `sorryAx`, no `Classical.choice`.

**House fences honoured** (`library/cas/contracts/attacks/PDD-N/Attack.lean`):
outside every lake target (`grep staging library/cas/lakefile.*` → no hits);
elaborated by `lake env lean` from `library/cas`; no `sorry`, no
`native_decide`; no digest computed in any `#guard` or kernel `decide` — every
address function is a toy (`Falsifier.lenAddr`, and a constant `constH`).

**Revisions classified against.** `workshop/exhibits.lean` at 27629 bytes,
sha256 `b31284930eb903ab…`, 653 lines, 17 receipted theorems (it grew twice
during this run — from 538 lines to 586 to 653; the §0 carrier was re-verified
byte-identical against the final read, all fifteen copied declarations).
`PROOF-DAG.md` 42519 bytes. `ALGEBRA.md` 41028 bytes. `CONTRACT-PACKET.md`
48033 bytes. `COUNTEREXAMPLES.md` 15131 bytes.

---

## Claim

**Headline claim under review.** That `workshop/exhibits.lean` settles the five
design questions its own table names: the modality is `wlp` (§1), the
fuel-indexed shape is forced (§2), each approximant is an ordinary `Prog` (§3),
`runCore (injectCas p) = runP p` with `projectCas` its left inverse (§4),
coherence is derived (§5), and scoped bodies need no new handler type (§6).

**Strongest supported wording after this review.** The file proves seventeen
propositions. Four of the six rows in its table are supported at the strength
claimed; **row 4 is supported for `runCore = runP` and NOT for `projectCas`**,
and **row 6 is false for the half that carries it**. Two further rows are true
but narrower than their prose.

**Source intent.** `ALGEBRA.md` §10 (three denotational faces, `EC1-A29`
`FinApprox`, `EC1-A30` `Denotation`, the coherence field) and §12 (CAS as a
protected sublanguage, `EC1-A35 CasEmbedding`, the five boundary laws).
`PROOF-DAG.md` §6 (`EC1-T038`–`T046`) and §12 (`EC1-T100`–`T124`).
`CONTRACT-PACKET.md` `EC1-K05`, `EC1-K14`, `EC1-K16`, `EC1-K22`, `EC1-F79`.

**Required implementation link.** None of the above reaches an implementation.
Every statement in both files is at the model plane, over `Cas.Lang` carriers.
There is no generator, no serializer, no FFI, and no deployment in scope.

---

## Findings

| # | Finding | Class | Severity | Status | Owner |
|---|---|---|---|---|---|
| F1 | `toPProg` is not `projectCas`: it accepts one syntactic normal form, not the CAS-only fragment | `spec-mismatch` | major | confirmed | `workshop/exhibits.lean` §4, `ALGEBRA.md` §12 |
| F2 | `Handler ScopeSig (ReaderT Env (Prog CasSig))` cannot express `catchE`; the exhibit's clause dropping `_hnd` is forced, not lazy | `model-mismatch` | **blocker** | confirmed | `workshop/exhibits.lean` §6, `CONTRACT-PACKET.md` `EC1-K16`, FORK A |
| F3 | The exhibit's `ensuring` clause never runs its finalizer on the branch a finalizer is for | `model-mismatch` | major | confirmed | `workshop/exhibits.lean` §6 |
| F4 | Scoping is exactly one level deep: a scoped op's children are `PProg` blocks and cannot raise, catch, or nest | `model-mismatch` | major | confirmed | `workshop/exhibits.lean` §6, `ALGEBRA.md` §6 |
| F5 | `wlp` inherits `wp_append`'s `pre ≠ []` side condition, so EffHOL's unconditional (Mod-E) is not satisfied | `model-mismatch` | major | confirmed | `workshop/exhibits.lean` §1, `PROOF-DAG.md` `EC1-T123` |
| F6 | (Mod-E) fails again at a NON-empty prefix, read as written: the estate's modality is over (table, history) pairs, not tables | `spec-mismatch` | major | confirmed | `PROOF-DAG.md` `EC1-T123`, `EC1-F79` |
| F7 | `Denotes` determines the answer but NOT the refusal; the packet's `truncate m (prefix n) = prefix m` cannot be read at refusals | `observational-gap` | minor | confirmed | `ALGEBRA.md` §10.3 `EC1-A30` |
| F8 | `exhausted_is_not_a_refusal` is not a schema: its second conjunct is vacuous for any graph that has not halted by fuel 1 | `proof-debt` | minor | confirmed | `workshop/exhibits.lean` §7 |
| F9 | `runCore_runP` quantifies over raw `PProg`, not `CheckedPProg`; `admitCas` / `CasAdmissible` remains entirely untouched | `spec-mismatch` | minor | confirmed | `ALGEBRA.md` §12, `PROOF-DAG.md` `EC1-T100` |
| F10 | §8's semantic equality holds at `runP` and `interpretRef` and fails at fixed fuel; `EC1-A31` must name fuel | `observational-gap` | minor | confirmed | `ALGEBRA.md` §10.3 `EC1-A31` |

Corrections are given per section below.

---

## Claim 1 — `inject_embed` / `runCore_runP` — **SURVIVES**; `project_inject` — **BROKEN**

### 1a. The degenerate tables: SURVIVES

`runCore_runP` is `∀ p`, and its proof is `inject_embed` then `runP_embed_agree`,
neither of which inspects the table. All three probes agree, and what each
agrees ON is recorded because in two cases it is a refusal:

```lean
theorem empty_table_survives (H : Bytes → Addr32) :
    run H (([] : PProg).length + 1) (denoteG (ofPProg []) 1) []
        = runP H ([] : PProg) []
      ∧ runP H ([] : PProg) []
        = (Status.refused (.failed "defun: empty program"), []) :=
  ⟨runCore_runP H [] [], rfl⟩
```

Also `load_last_survives_present` / `load_last_survives_absent` (a table whose
last line is a `load`, at a word that holds the address and at one that does
not) and `dangling_ans_survives` (`.ans 5` against a one-line history).

**F9.** The agreement is over raw `PProg`. `ALGEBRA.md` §12 states the law as
`runCore (injectCas p) = runP p.val` quantified over `p : CheckedPProg`, and
`CasAdmissible` "rejects empty or dangling tables". The exhibit's theorem is
therefore *stronger in quantification* than the packet needs — it is fine — but
it retires nothing of `admitCas`. `(admitCas raw).isSome iff CasAdmissible raw`
is the first of the five boundary laws and no exhibit touches it.
*Correction:* say that §4 discharges `EC1-T102` only, and that `EC1-T100` and
`admitCas` remain open (the anchor lane already classified `EC1-T100` as a
`model-mismatch`; these three witnesses are the reason it cannot be total).

### 1b. `toPProg` is not `projectCas`: BROKEN

`ALGEBRA.md` §12 types the third face as
`projectCas : CasOnly CheckedProgram -> PProg`. Its domain is the CAS-only
FRAGMENT. `toPProg` matches a single literal normal form — a one-element block
list whose sole block terminates `.ret`, at entry `0` — and refuses every other
CAS-only graph regardless of what it denotes. Two witnesses, both CAS-only (no
`jump`, no `brTag`, so no cycle and no branch):

```lean
def unreachableTail (p : PProg) : GProg := ⟨[⟨p, .ret⟩, ⟨p, .ret⟩], 0⟩
def entryNotZero    (p : PProg) : GProg := ⟨[⟨[], .ret⟩, ⟨p, .ret⟩], 1⟩

theorem toPProg_is_not_semantic :
    ∃ (g g' : GProg) (p : PProg),
      (∀ fuel, denoteG g (fuel + 1) = denoteG g' (fuel + 1))
        ∧ toPProg g' = some p
        ∧ toPProg g = none := by
  refine ⟨unreachableTail Falsifier.onePut, ofPProg Falsifier.onePut,
    Falsifier.onePut, fun fuel => ?_, rfl, rfl⟩
  rw [unreachableTail_denotes, inject_embed]
```

`toPProg_is_not_entry_stable` is the same for `entryNotZero`. Both shapes are
what an ordinary pass leaves behind: dead-code elimination leaves an unreachable
block; block relabelling moves the entry off zero. `project_inject` is true and
retires `EC1-T101` as PROOF-DAG writes it, because that row is also stated only
on the image of the injection — but it does not give the packet the `projectCas`
its own §12 types.

The defect is incompleteness, not unsoundness. The sound half is kept:

```lean
theorem toPProg_sound (g : GProg) (p : PProg) (fuel : Nat)
    (h : toPProg g = some p) : denoteG g (fuel + 1) = embed p
```

*Correction.* Either (i) restate `EC1-T101`/§12 face 3 as a left inverse on the
image of `injectCas` — which is what is proved — and delete the `CasOnly`
domain; or (ii) write the real projection: walk the reachable subgraph from
`entry`, require every reachable terminator to be `.ret`, and return the entry
block's body. (ii) is the one the packet's prose promises.

---

## Claim 2 — `coherent` / `coherent_le` / `denotes_unique` — **SURVIVES**, narrowed

All three attacks named in the brief fail, and they fail to ONE theorem that is
stronger than the exhibit's. The exhibit's `Refines` quantifies over `.ok`
outcomes only. Everything except the fuel-exhausted leaf is stable — refusals
included — and proving that costs the same single induction:

```lean
def exhausted : Refusal := .failed "graph: fuel exhausted"

def Stable (rec rec' : BlockId → List Addr32 → Prog CasSig Addr32) : Prop :=
  ∀ b env w, interpretRef H (rec b env) w ≠ .error exhausted →
    interpretRef H (rec' b env) w = interpretRef H (rec b env) w

theorem blockBody_stable (g : GProg) {rec rec'} (hr : Stable H rec rec') :
    Stable H (blockBody g rec) (blockBody g rec')
theorem stable_succ : ∀ n g, Stable H (runBlocks g n) (runBlocks g (n + 1))
theorem stable_le   : ∀ m n g, n ≤ m → Stable H (runBlocks g n) (runBlocks g m)
```

`coherent` and `denotes_unique` are re-derived from `stable_le` in this file,
independently of the exhibit's proofs.

- **Out-of-range block lookup MID-RUN** (after the entry block has already
  succeeded): `offEndGraph := ⟨[⟨okBody, .jump 7⟩], 0⟩`. Fuel 1 gives the
  exhausted leaf, every fuel ≥ 2 gives `.failed "graph: no such block"`, both by
  `rfl` at every `H`. `offEnd_never_denotes` shows `Denotes` is empty there, so
  `denotes_unique` is not even reached.
- **A `load` whose answer index exists only because an earlier block ran**:
  `chainGraph`, block 1 body `[.load (.ans 0)]`, resolving against the history
  block 0 contributed. `chain_stable_from_2 : ∀ n, interpretRef H (denoteG
  chainGraph (n+2)) wZ = .ok (zeroAddr, wZ)` — by `rfl`, for every `n` and every
  `H`. The history a block sees is fixed by the PATH; fuel never enters it.
- **Two fuels, different `.ok` answers**: impossible —
  `no_two_fuels_disagree`, a corollary of `denotes_unique`.

**F7, the narrowing.** What the family determines is the ANSWER, not the
outcome:

```lean
theorem denotes_does_not_determine_the_refusal :
    ∃ (g : GProg) (w : Word) (m n : Nat) (r₁ r₂ : Refusal),
      r₁ ≠ r₂
        ∧ ∀ H : Bytes → Addr32,
            interpretRef H (denoteG g n) w = .error r₁
              ∧ interpretRef H (denoteG g m) w = .error r₂
```

*Correction.* `ALGEBRA.md` §10.3's coherence field
`m <= n -> truncate m (prefix n) = prefix m` is sound at answers and at every
refusal EXCEPT the exhausted leaf, and unsound if the leaf is spelled as one.
That is exactly §7's finding — now with the boundary (below) rather than a
single witness.

---

## Claim 3 — `exhausted_is_not_a_refusal` — **NARROWED**

The theorem is true of `onePutGraph`. It is not a schema. Its second conjunct
is vacuous for any graph that has not halted by fuel 1, which is most graphs
with a cycle:

```lean
def loopGraph : GProg := ⟨[⟨okBody, .jump 0⟩], 0⟩

theorem loop_exhausts_at_0_1_2 (H : Bytes → Addr32) :
    interpretRef H (denoteG loopGraph 0) wZ = .error exhausted
      ∧ interpretRef H (denoteG loopGraph 1) wZ = .error exhausted
      ∧ interpretRef H (denoteG loopGraph 2) wZ = .error exhausted :=
  ⟨rfl, rfl, rfl⟩
```

and at the exhibit's own `run` face:
`loop_run_exhausts : run H 4 (denoteG loopGraph 0) wZ = (.refused exhausted, wZ)
∧ run H 4 (denoteG loopGraph 1) wZ = (.refused exhausted, wZ)`.

**The boundary, which is the useful output.** Conflating `live` with `halt` is
harmless precisely on the outcomes that are NOT the exhausted leaf:

```lean
theorem exhausted_is_the_only_unstable_leaf (H : Bytes → Addr32) (g : GProg)
    (w : Word) (m n : Nat) (hnm : n ≤ m)
    (h : interpretRef H (denoteG g n) w ≠ .error exhausted) :
    interpretRef H (denoteG g m) w = interpretRef H (denoteG g n) w :=
  stable_le H m n g hnm g.entry [] w h
```

Sharp in both directions:

- `fuel_zero_is_contentless : ∀ H g w, interpretRef H (denoteG g 0) w = .error
  exhausted` — by `rfl`, for EVERY graph, word and `H`. Fuel 0 distinguishes
  nothing, which is why the leaf must be distinguished in the TYPE and never by
  its string.
- `exhausted_leaf_is_unstable` — the leaf really does change under more fuel.

*Correction.* Replace `exhausted_is_not_a_refusal` in the packet's evidence
column with the pair `exhausted_is_the_only_unstable_leaf` +
`fuel_zero_is_contentless`. The first is the invariant `EC1-A29` wants; the
second is why `live` cannot be a `Refusal` value. The existing witness stays as
the minimal illustration, but it should not be cited as the general statement.

---

## Claim 4 — the `Scoped` section — **BROKEN** in its load-bearing half

This is the finding that decides **FORK A** rather than a row.

### 4a. The structural half — F4

Every child of a scoped operation is a `BlockId` into a `GProg`; a `GBlock`
body is a `PProg`, a table of `put` and `load` lines. There is no constructor
by which a block performs a scoped operation. The type is the ceiling:

```lean
example (op : ScopeSig.Op) (e : Env) : Prog CasSig (ScopeSig.Ans op) :=
  scopeHandler.handle op e
```

A scoped op's meaning is a STORE program. So `catchE`'s body cannot raise,
cannot be `ensuring`, and cannot be another `catchE`. Nesting is not a missing
clause; it is inexpressible. The defunctionalization that "keeps the signature
first-order" bought that by downgrading the children to a sublanguage that
cannot contain the effects being scoped.

### 4b. The semantic half — F2, the blocker

A `Handler ScopeSig ScopeM` clause for `.catchE b h` is exactly a function
`Env → BlockId → BlockId → Prog CasSig Addr32`. The law such a clause must
satisfy for the operation to deserve its name, stated against the estate's own
reference semantics:

```lean
def ScopeCatchLaw (k : Env → BlockId → BlockId → Prog CasSig Addr32) : Prop :=
  ∀ (H : Bytes → Addr32) (e : Env) (b h : BlockId) (w : Word),
    interpretRef H (k e b h) w
      = match interpretRef H (runBlocks e.1 e.2 b []) w with
        | .ok r => .ok r
        | .error _ => interpretRef H (runBlocks e.1 e.2 h []) w

theorem no_scoped_catch_clause : ¬ ∃ k, ScopeCatchLaw k

theorem no_handler_into_ScopeM_catches :
    ¬ ∃ hh : Handler ScopeSig ScopeM,
        ScopeCatchLaw (fun e b h => hh.handle (.catchE b h) e)
```

The engine is a separation lemma with no induction in it:

```lean
theorem constH_no_separator (c : Prog CasSig Addr32)
    (h1 : interpretRef constH c [] = .ok (zeroAddr, [Binding.mk zeroAddr nB]))
    (h2 : interpretRef constH c wZ = .ok (zeroAddr, wZ)) : False
```

At the empty word the only operation that can succeed is a fresh put; under a
constant address function that put addresses to `zeroAddr`; at `wZ` the same put
either CONFLICTS — refusing, which `h2` forbids — or DUPLICATES, at which point
the two words coincide and the two runs are the same run. A store program cannot
test for absence: `load` of an absent address is itself a refusal, and a put's
answer is a function of the node, never of the word. `Cas.put_duplicate_spec`
and `Cas.put_fresh_spec` do the work; `constH` is Level 0, the degenerate
address function `Cas/Core/Address.lean` already exhibits.

Both children are ordinary block denotations, by `rfl`:

```lean
def catchGraph : GProg :=
  ⟨[⟨[.load (.lit zeroAddr)], .ret⟩, ⟨[.put 0 1 [] []], .ret⟩], 0⟩
theorem catchGraph_body : runBlocks catchGraph 1 0 [] = probe := rfl
theorem catchGraph_hnd  : runBlocks catchGraph 1 1 [] = hndB  := rfl
```

so the counterexample lives entirely inside the packet's own carrier, and the
exhibit's handler fails the law concretely, not only abstractly
(`scopeHandler_does_not_catch`).

**The result is immune to the rollback question.** `interpretRef`'s error branch
carries no word, so the big-step law can only restart the handler at the word the
body started from. `probe` refuses having changed nothing, and the small-step run
says so:
`probe_refuses_without_touching_the_word : run constH 1 probe [] = (.refused
(.noObject zeroAddr), [])`. A "no-rollback" law demands the same outcome on this
witness, so the impossibility is not an artefact of demanding rollback.

**And a `try` operation does not escape it.** Adding `Prog (CasSig ⊕ₛ TrySig)`
with `TryE.tryE (b h : BlockId)` moves the obligation to `TrySig`'s handler,
whose clause is *literally* a `k : Env → BlockId → BlockId → Prog CasSig Addr32`
— the object `no_scoped_catch_clause` refutes. The theorem already covers that
design.

### 4c. `ensuring` — F3 — implemented, and wrong

`catchE` at least announces itself by dropping `_hnd`. `ensuring` does not: its
clause is written with `bind`, which looks like sequencing. `interpretRef_bind`
is error-strict, so the finalizer runs exactly when the body SUCCEEDS:

```lean
theorem ensuring_never_finalises_a_refusal
    (H : Bytes → Addr32) (g : GProg) (fuel : Nat) (b f : BlockId) (w : Word)
    (e : Refusal) (hb : interpretRef H (runBlocks g fuel b []) w = .error e) :
    interpretRef H (scopeHandler.handle (.ensuring b f) (g, fuel)) w
      = .error e := by
  show interpretRef H ((runBlocks g fuel b []).bind _) w = _
  rw [interpretRef_bind, hb]
```

with `ensuring_witness` the concrete instance. A finalizer that only runs on
success is not a finalizer.

### 4d. The minimum target monad — the FORK A answer

`Handler`, `Sig`, `interpret`, `interpret_bind` and `Handler.sum` are all
untouched: **"no new handler type" survives**. What fails is "elaboration is the
EXISTING `interpret`; a scoped program becomes a plain store program under a
table and a fuel". The obstruction is the TARGET.

The smallest target in which the clause is writable, exhibited and proved:

```lean
abbrev EnvR   := GProg × Nat × (Bytes → Addr32)
abbrev ScopeR := ReaderT EnvR (StateT Word (Except Refusal))   -- = ReaderT EnvR RefM

def scopeHandlerR : Handler ScopeSig ScopeR where
  handle
    | .catchE body hnd => fun e w =>
        match interpretRef e.2.2 (runBlocks e.1 e.2.1 body []) w with
        | .ok r => .ok r
        | .error _ => interpretRef e.2.2 (runBlocks e.1 e.2.1 hnd []) w
    ...

theorem scopeHandlerR_catches (e : EnvR) (b h : BlockId) (w : Word) :
    scopeHandlerR.handle (.catchE b h) e w
      = match interpretRef e.2.2 (runBlocks e.1 e.2.1 b []) w with
        | .ok r => .ok r
        | .error _ => interpretRef e.2.2 (runBlocks e.1 e.2.1 h []) w := rfl

theorem scopeHandlerR_recovers :
    scopeHandlerR.handle (.catchE 0 1) (catchGraph, 1, constH) []
      = .ok (zeroAddr, [Binding.mk zeroAddr nB]) := rfl
```

Stated exactly: **the minimum target is `ReaderT E (StateT Word (Except
Refusal))` — the estate's own `RefM` under a reader carrying the block table,
the fuel, and the address function `H`.** Three properties of that answer matter
for the fork:

1. It is not `ReaderT Env (Prog (CasSig ⊕ₛ ErrSig))`. Summing a signature does
   not help, because a summed signature's handler faces the same clause type
   (§4b). Any `Prog`-valued target has the obstruction.
2. `H` must move into the reader. A catch must INTERPRET its children, and
   `interpretRef` needs `H`. This is the concrete cost: the scoped handler stops
   being `H`-parametric and becomes `H`-indexed, so every `H`-quantified theorem
   downstream acquires the parameter.
3. It is a SEMANTICS, not a syntax. `elaborate` no longer produces a
   `Prog CasSig`, so nothing downstream of `catchE` can be re-handled,
   replayed (`replayHandler`), proved (`proveHandler`/`verifyHandler`), stored,
   or addressed. `scoped`, `provide` and the SUCCESS path of `ensuring` still
   elaborate into `Prog CasSig`; `catchE`, the failure path of `ensuring`, and
   any observation of `raise` do not.

**FORK A consequence.** The embedding branch — "`Flow` is an embedding into
`Prog`, inheriting five theorem rows" — is available for the store-shaped and
control-shaped operations and is NOT available for any operation that observes a
child's OUTCOME: catch, finalize-on-failure, timeout, race, interrupt,
supervise. Those require either the error-channel target above, or a residual
language that is no longer `Prog CasSig` — in which case
`runCore (injectCas p) = runP p` still holds on CAS-only programs but the scoped
layer does not elaborate away, and `ALGEBRA.md` §12's "uses the existing direct
reference handler … adds no scope" no longer describes the composite. The fork
is therefore not "embedding vs. evaluator" as a single choice; it is a SPLIT,
and the packet needs to say which operations sit on which side.

---

## Claim 5 — `wlp` as EffHOL's modality — **NARROWED**, twice

The rule under test, on the estate's carrier (computation = `PProg`,
sequencing = `++`, modality = `wlp H · Q`):

```
    ⟨x ← p⟩ φ      φ ⊢ ⟨y ← q⟩ ψ
    ─────────────────────────────  (Mod-E)
        ⟨y ← (x ← p; q)⟩ ψ
```

**What survives.** (Mon) is `wlp_mono`, unconditional. The introduction shape is
`wlp_of_done`, unconditional. And the composition law itself holds — WITH the
side condition, for one line, because `wpAux_append` is already stated at the
fold:

```lean
theorem wlp_append (pre post : PProg) (Q : WPost) (w : Word) (hpre : pre ≠ []) :
    wlp H (pre ++ post) Q w
      ↔ wlp H pre
          (fun _ w' => wpAux H True (PProg.answersFrom H [] pre) post Q w') w := by
  have h := wpAux_append H True [] pre post Q w (Or.inr hpre)
  simpa [wlp] using h
```

**F5 — `wlp` inherits `pre ≠ []`.** The exhibit reads that side condition as a
`wp` peculiarity ("`wp_append`, whose `pre ≠ []` side condition is not a
hedge"). It binds `wlp` identically:

```lean
theorem wlp_falsifier_empty_prefix :
    ∃ (H : Bytes → Addr32) (post : PProg) (Q : WPost) (w : Word),
      wpAux H True [] [] (fun _ w' =>
            wpAux H True (PProg.answersFrom H [] []) post Q w') w
        ∧ ¬ wlp H ([] ++ post) Q w := by
  refine ⟨lenAddr, onePut, WPost.bot, [], trivial, ?_⟩
  intro h
  exact h
```

and as the rule:

```lean
theorem modE_unsound_at_the_empty_prefix :
    ∃ (H : Bytes → Addr32) (p q : PProg) (φ ψ : WPost) (w : Word),
      wlp H p φ w
        ∧ (∀ a w', φ a w' → wlp H q ψ w')
        ∧ ¬ wlp H (p ++ q) ψ w := by
  refine ⟨lenAddr, [], onePut, WPost.bot, WPost.bot, [], trivial,
    fun _ _ hφ => hφ.elim, ?_⟩
  intro h
  exact h
```

Note what defeats it: the empty table refuses, so `⟨x ← []⟩ ⊥` is derivable —
which is *the exhibit's own discriminator*, the sentence it uses to pick `wlp`
over `wp`. The property that selects `wlp` is the property that breaks
unconditional (Mod-E).

**F6 — and it fails again at a NON-EMPTY prefix.** `pre ≠ []` repairs the law
only in the history-threaded form. Read (Mod-E)'s second premise the way the
rule is written — `⟨y ← q⟩ ψ`, the suffix's own modality — and it fails at
`pre = [putA]`, `post = [putB]`:

```lean
theorem modE_unsound_at_a_restarted_history :
    ∃ (H : Bytes → Addr32) (p q : PProg) (φ ψ : WPost) (w : Word),
      wlp H p (fun a w' => φ a w') w
        ∧ (∀ a w', φ a w' → wlp H q ψ w')
        ∧ ¬ wlp H (p ++ q) ψ w
```

On a table the suffix's answer indices are ABSOLUTE, so `q` alone dangles where
`pre ++ q` resolves; a dangling operand refuses; and `wlp` of a refusal is
everything. This is the `wlp` twin of `falsifier_append_needs_history`, and it
is the harder half: **the estate's `wlp` is a modality over (table, history)
pairs, not over tables.** EffHOL's (Mod-E) quantifies over the wrong thing.

**The root, named.** Both cracks are one fact:

```lean
theorem embed_empty_is_not_a_unit (a : Addr32) :
    interpretRef H (embed ([] : PProg)) []
      ≠ interpretRef H (Prog.pure a : Prog CasSig Addr32) []
```

`embed` is not a monoid homomorphism from (`PProg`, `++`, `[]`) to (`Prog`,
`bind`, `pure`): the unit of `++` denotes a refusal, not `pure`. A modality over
tables inherits that; a modality over `Prog` would not.

*Correction.* The identification "the EffHOL-style modality is `wlp` on this
sublanguage" (`ALGEBRA.md` §12, `CONTRACT-PACKET.md`, `EC1-F79`) is sound for
(Mon), (Mod-I) and the discriminator, and PARTIAL for (Mod-E): satisfied only in
the form `wlp_append` states, with `pre ≠ []` and the determined history. The
packet should record (Mod-E) as conditionally satisfied and name both
conditions, or state the modality on `Prog` where `bind` is a real unit-and-
associativity structure and both conditions vanish. `EC1-T123`
(`cas_partial_correctness_bridge`) is unaffected — it is an anchor, not a
sequencing law — and the exhibits' new §9 `wlp_iff_interpretRef` supplies its
missing half correctly.

---

## Claim 6 (out of remit) — `classifier_finer_than_semantics` — **SURVIVES**, narrowed

Added when the exhibits grew a §8 mid-run. Both halves re-derived independently,
and lifted one rung further than the exhibit takes them:

```lean
theorem load12_runP_agree (H : Bytes → Addr32) (w : Word) :
    runP H load1 w = runP H load2 w
theorem load12_ObsEq (H : Bytes → Addr32) : ObsEq H (embed load1) (embed load2) :=
  ObsEq_embed_of_runP H (load12_runP_agree H)
theorem load12_dataflow_differs : PProg.dataflow load1 ≠ PProg.dataflow load2 := by
  decide
```

The equality holds at STRATUM 3, the estate's own program equality, not merely
at the direct run — so `EC1-T088`'s antecedent really is met under the CAS mask.
Both tables are also inside the checked injection boundary (`#guard` on
non-emptiness and `dataflowClosed`), so the counterexample is not smuggled in
through a table `admitCas` would refuse. §8 stands.

**F10, the narrowing.** The two tables differ at fixed fuel:

```lean
theorem load12_differ_at_fixed_fuel (H : Bytes → Addr32) :
    (run H 2 (embed load1) wZ).1.isDone = true
      ∧ (run H 2 (embed load2) wZ).1.isRunning = true := ⟨rfl, rfl⟩
```

The estate rules that status out as an observation — `Status.isRunning` is
documented as "the only status a fuelled run reports that says nothing about the
program" — so §8 survives. But `EC1-A31 ObservationMask` must name fuel
explicitly: a mask that forgot to exclude fixed-fuel status would make these
tables semantically DISTINCT and §8's counterexample would evaporate, not
because the classifier got coarser but because the semantics got finer than the
estate allows. `falsifier_fuel_bound_is_tight` is the library's own statement of
the same hazard.

---

## Candidate `COUNTEREXAMPLES.md` rows

Highest existing ID read: `EC1-CE044`. Proposed, all `VERIFIED-KERNEL`, all in
`.staging/effect-core-v1/breaker-exhibits.lean`, command
`cd library/cas && lake env lean ../../.staging/effect-core-v1/breaker-exhibits.lean`:

| Proposed ID | Exact statement defeated | Witness |
|---|---|---|
| `EC1-CE045` | `projectCas` is a projection out of the CAS-only fragment | `toPProg_is_not_semantic`, `toPProg_is_not_entry_stable` |
| `EC1-CE046` | Scoped operations need no new handler TARGET; `catchE` elaborates into `Prog CasSig` | `no_scoped_catch_clause`, `no_handler_into_ScopeM_catches`, `constH_no_separator` |
| `EC1-CE047` | The exhibited `ensuring` clause finalizes | `ensuring_never_finalises_a_refusal`, `ensuring_witness` |
| `EC1-CE048` | EffHOL's (Mod-E) is unconditionally satisfied by `wlp` | `modE_unsound_at_the_empty_prefix`, `wlp_falsifier_empty_prefix` |
| `EC1-CE049` | The suffix's own modality composes (Mod-E) at a non-empty prefix | `modE_unsound_at_a_restarted_history`, `embed_empty_is_not_a_unit` |
| `EC1-CE050` | The graph's fuel family determines its refusal | `denotes_does_not_determine_the_refusal` |
| `EC1-CE051` | `exhausted_is_not_a_refusal`'s second conjunct holds generally | `loop_exhausts_at_0_1_2`, `loop_run_exhausts` |
| `EC1-CE052` | `SemEq` under the CAS mask may be read at a fuel the mask has not fixed | `load12_differ_at_fixed_fuel` |

Boundary witnesses (not refutations, but the invariants the rows above force):
`exhausted_is_the_only_unstable_leaf`, `fuel_zero_is_contentless`,
`stable_le`, `toPProg_sound`, `scopeHandlerR_catches`.

---

## Evidence bundle

```text
proved       : 59 theorems in .staging/effect-core-v1/breaker-exhibits.lean;
               40 receipted by #print axioms, every one [propext] or
               [propext, Quot.sound]. No sorryAx, no Classical.choice.
               Checker policy: Lean 4.33.1 kernel, no native_decide, no
               #eval-derived fact used as a premise.
modelChecked : 3 #guard assertions (both §6 witnesses non-empty and
               dataflow-closed), decided in the kernel at no address function.
               PProg.dataflow inequality by `decide`.
tested       : none. This is a model-plane review; no executable was exercised.
measured     : none.
monitored    : none.
assumed      : (a) the copied §0 carrier is the exhibits' carrier — verified
               byte-identical for all 15 copied declarations against the final
               read; (b) EffHOL's (Mod-E) has the sequencing shape stated in
               Claim 5 — the paper (arXiv:2506.09458 Fig. 5) was NOT read; the
               shape is spelled out in the file so the reading is checkable and
               refutable; (c) `constH` is an admissible address function —
               Level 0, and Cas/Core/Address.lean exhibits the same degenerate
               family.
unknown      : whether the packet's `SemEq full` / `concreteClass` / `Denotation`
               (which have no Lean definitions yet) behave as their CAS-fragment
               analogues do. Every §6 statement is about the analogues.
               Consequence: Claim 6's verdict transfers to the full core only if
               the mask excludes fixed-fuel status.
```

---

## Per-axis verdict

| Axis | Verdict |
|---|---|
| 1. source intent | Two rows of the exhibits' own summary table overstate what the file proves (§4's `projectCas`, §6's scoped claim). Intent for `admitCas`/`CasAdmissible` is unrepresented in any exhibit. |
| 2. formal model | Two `model-mismatch` findings at blocker/major (F2, F4) and three more at major (F3, F5, F6). The graph carrier itself is sound: coherence strengthens rather than breaks. |
| 3. proof acceptance | Clean. Both files elaborate; all axioms standard; no holes, no `native_decide`, no unsafe options. The exhibits' fifteen-then-seventeen propositions are all true as stated. |
| 4. implementation / refinement | Out of scope — nothing here reaches a generator, serializer or FFI. Explicitly NOT reviewed. |
| 5. deployment / receipts | Out of scope. No monitor, no measurement, no runtime assumption in either file. |

**End to end.** `workshop/exhibits.lean` is a sound file: every theorem in it is
true. Its SUMMARY TABLE is not sound at rows 4 and 6. The strongest claim the
file supports is: *seventeen propositions about a prototype block-graph carrier
hold, of which the ones bearing on the CAS seam establish `runCore = runP` on
raw tables and a left inverse on the image of the injection, and the ones
bearing on scoped effects establish that a first-order signature and an ordinary
`Handler` suffice while an elaboration target of `Prog CasSig` does not.* It is
not model assurance for the graph rung, not implementation assurance, and not
deployment assurance.

---

## Handoff

**Checks performed.** Read `workshop/exhibits.lean` at three successive
revisions and re-verified the copied carrier byte-identical at the last. Read
`ALGEBRA.md` §10/§12, `PROOF-DAG.md` §6/§12, `CONTRACT-PACKET.md` §12 anchors,
`COUNTEREXAMPLES.md` §1–§3, the coordination note. Read the library sources the
claims rest on: `Cas/Lang/Wp.lean`, `Defun.lean`, `Handler.lean`, `Interp.lean`,
`Ops.lean`, `Prog.lean`, `Sig.lean`, `Core/Admission.lean`, `Core/Store.lean`,
`Core/Address.lean`, `IR/Word.lean`. Elaborated both Lean files, repeatedly,
from `library/cas`. Verified the fences by grep.

**Assumptions made.** Listed in the evidence bundle. The load-bearing one is
(b): EffHOL's (Mod-E) shape was taken from the exhibits' own citation and
spelled out explicitly rather than read from the paper. If the paper's rule has
a different shape, Claim 5's *classification* changes but not its content — the
`wlp` composition law demonstrably needs both side conditions either way, and
`wlp_falsifier_empty_prefix` / `modE_unsound_at_a_restarted_history` stand on
their own as facts about the estate's transformer.

**Checks OMITTED.**

- `mise` gates and `lake build` were not run — the brief forbade them. Only
  `lake env lean` on the two files.
- No attack on exhibits §2 (the `unfoldBad` termination argument): it is a
  commented-out block, so there is nothing to elaborate against.
- No attack on §3's four `example`s (they are type ascriptions and cannot fail
  except by not typechecking), nor on §6's `interpret_bind` / `interpret_through`
  reuses (both are library theorems applied at the right types).
- No attack on the new §9 (`wlp_iff_interpretRef`,
  `PartialTriple_iff_interpretRef`); it arrived after the analysis and was read
  but not probed. It is consistent with Claim 5's findings.
- I did NOT rebuild the three anchor-lane counterexamples (`EC1-T015`,
  `EC1-T100`, `EC1-T002`) that ask #2 of the coordination note requests. Out of
  this brief's scope; F9 above is adjacent evidence for `EC1-T100` but not a
  rebuild.
- FORK B (block body = `PProg` vs. a new straight-line form) was not settled.
  F4 is evidence that bears on it — a `PProg` body cannot host a scoped
  operation — but that is an argument, not the decision.
- No independent reference implementation was consulted for any statement.

**External mutations.** Two files created, both mine:
`.staging/effect-core-v1/breaker-exhibits.lean` and this report. The reviewed
tree was NOT mutated: `workshop/exhibits.lean`, the packet `.md` files, and
`library/cas` are untouched by this run.
