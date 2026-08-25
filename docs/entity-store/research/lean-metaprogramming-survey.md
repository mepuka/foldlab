# Lean 4 metaprogramming surface for the Schema Core carrier — survey

Status: staged material, pre-grade — 2026-08-25, Mac coordinator. This document surveys; the
operator rules. Highest satisfied gate: none.

Target toolchain: `leanprover/lean4:v4.33.1` (commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`).
Everything marked **measured** was run against that toolchain on this Mac; the scratch files are
disposable and were not committed. Everything marked **judgment** is mine and is not evidence.

## Result first

Four things decide the architecture, and three of them are bad news that only shows up when you
run the toolchain rather than read about it:

1. **`deriving DecidableEq` refuses nested inductives outright** at v4.33.1
   (`Lean/Elab/Deriving/DecEq.lean:211`). The `SchemaCore` sketched in the kickoff §5 nests
   `List (String × SchemaCore × Bool)` and `List SchemaCore` in four constructors, so it is
   nested, and `deriving DecidableEq` is a hard error on it. **Measured.**
2. **Every other core deriving handler silently emits `partial def` for nested inductives**, which
   elaborates to an `opaque` constant. Opaque constants are invisible to `#print axioms` and
   unreducible by the kernel. The axiom report stays clean while `rfl` and `decide` stop working.
   **Measured.** This is the single most dangerous interaction between metaprogramming and the
   estate's pure-kernel posture.
3. **`decide`/`rfl` over `String`-valued canonicalisation does not scale.** `String` is not
   kernel-accelerated; `Nat` is. Measured on the same corpus: a `Nat`-valued fold over ~147,000
   nodes decides in 16 s, while a `String`-valued encode of ~2,000 characters exhausts the default
   200,000-heartbeat budget. Roughly two orders of magnitude apart. The fips202 Keccak calibration
   (26–40 s by `rfl`) is a `UInt64`/`Nat` workload and **does not transfer** to string work.
4. **Lake does not track non-`.lean` inputs.** Editing a JSON file that an elaboration-time
   command reads does not invalidate the olean; `lake build` reports success while the olean holds
   a now-false theorem. **Measured** — see §3 P1. This alone settles the P1 architecture question.

Recommendation in one line: **generate `.lean` text from the extractor, commit it, let the kernel
check all of it, and never read the inventory at elaboration time.** Full statement in §6.

---

## 1. TOOLBOX MAP

All source paths below are relative to
`~/.elan/toolchains/leanprover--lean4---v4.33.1/src/lean/` unless marked otherwise. A checkout of
`leanprover/lean4` at tag `v4.33.1` matches the toolchain commit exactly, so line numbers in the
C++ kernel (`src/kernel/…`) are citable too.

### 1.1 Documentation pins (read this before citing anything)

| Resource | Pin to use | Caveat |
|---|---|---|
| Lean Language Reference | `https://lean-lang.org/doc/reference/4.33.0/` | `/latest/` serves 4.34.0-rc2. `/4.33.1/` returns HTTP 200 but declares it covers **4.34.0-rc1** — it is mislabeled. Cite `/4.33.0/`. |
| Release notes | `https://lean-lang.org/doc/reference/latest/releases/` | `RELEASES.md` in the lean4 repo is now a 565-byte stub; GitHub release bodies for v4.20–v4.23 are empty. The manual is the only canonical changelog. |
| Metaprogramming in Lean 4 | `https://leanprover-community.github.io/lean4-metaprogramming-book/` | Code compiles (daily toolchain bump, currently v4.34.0-rc2); prose is 1–4 years stale in places. **No `deriving` chapter, no Attributes chapter, no `Lean.Elab.Command` beyond ch. 7, no module-system coverage.** Depends on Batteries. |
| API docs | `https://lean-lang.org/doc/api/` | The only prose for the custom-attribute API, which the manual does not document at all. |

**Judgment:** for this project the book is a conceptual primer only. The load-bearing reference is
the core source tree you already have on disk, and the two worked examples in §2.

### 1.2 The layers, and when each is right

**`notation` / `macro_rules` / `macro`** — `Lean/Parser/Command.lean`, reference §23.5. Pure
syntax→syntax. Zero contribution to the TCB: the expansion is elaborated and kernel-checked like
hand-written text. Right tool for sugar over an already-defined carrier (a `schema% …` literal
notation). Wrong tool for anything that must consult the environment. Note: later `macro_rules`
registrations take priority, which is a real footgun in a generated file.

**`syntax` + `elab` (term/command elaborators)** — reference §23.4/§23.6;
`Lean/Elab/Command.lean:486` (`elabCommand`), `:731` (`liftTermElabM`), `:774` (`runTermElabM`).
`elab "#foo" : command => …` desugars to a `syntax` declaration plus a `@[command_elab foo]`
handler. This is the layer where you can read the environment, build `Expr`s, and call `addDecl`.
Right tool for the P2 correspondence emitter (§3). Trust contribution: whatever it *adds* to the
environment is kernel-checked, but *what it chooses to add* is not — that is the residual trust
surface, and §3 P2 shows how to shrink it to nothing.

**`Lean.Elab.Command`** — `CommandElabM` is the monad with `Environment` access and the ability to
elaborate further commands. Key operations: `getEnv`, `elabCommand`, `liftTermElabM`,
`runTermElabM`, `withScope`, `logInfo`. The core deriving handlers live entirely in this monad and
work by *building `Syntax` and re-elaborating it*, never by constructing `Expr` — see §2.

**Deriving handlers** — `Lean/Elab/Deriving/Basic.lean:276–292`, verbatim:

```lean
@[expose] def DerivingHandler := (typeNames : Array Name) → CommandElabM Bool

def registerDerivingHandler (className : Name) (handler : DerivingHandler) : IO Unit := do
  unless (← initializing) do
    throw (IO.userError "failed to register deriving handler, it can only be registered during initialization")
  Term.registerDerivableClass className
  derivingHandlersRef.modify fun m => …
```

Handlers must be registered in an `initialize` block. `applyDerivingHandlers`
(`Basic.lean:294–310`) runs registered handlers in order; the **first to return `true` wins**, and
if none returns `true` you get `None of the deriving handlers for class C applied to …`.

Core's registrations, all under `Lean/Elab/Deriving/` at v4.33.1: `BEq.lean` (`BEq`),
`DecEq.lean` (`DecidableEq`), `FromToJson.lean` (`ToJson` **and** `FromJson`), `Hashable.lean`,
`Inhabited.lean`, `LawfulBEq.lean`, `Nonempty.lean`, `Ord.lean`, `ReflBEq.lean`, `Repr.lean`,
`SizeOf.lean`, `ToExpr.lean`, `TypeName.lean`; plus `Lean/Server/Rpc/Deriving.lean`
(`RpcEncodable`). **The reference manual's list omits `ToExpr`, `ToJson`, and `FromJson`** — they
are in core and undocumented there.

The undocumented helper library every core handler actually uses is
`Lean/Elab/Deriving/Util.lean` (198 lines): `mkContext`, `mkHeader`, `mkInductArgNames`,
`mkInductiveApp`, `mkImplicitBinders`, `mkInstImplicitBinders`, `mkInstanceCmds`, `mkDiscrs`,
`mkLocalInstanceLetDecls`, `mkLet`, `withoutExposeFromCtors`. It appears in neither the book nor
the manual. Read it before writing a handler.

API stability: `registerDerivingHandler` appears exactly once in the v4.20→v4.33.1 release notes
(a docstring fix, PR #9152). The last signature break was **v4.14.0**, which removed
`registerDerivingHandlerWithArgs` and `DerivingHandlerNoArgs`. Nineteen releases of stability.

**Attributes and environment extensions** — `Lean/Attributes.lean` (519 lines),
`Lean/Environment.lean:1516` (`registerEnvExtension`), `:1740`
(`registerPersistentEnvExtensionUnsafe`). The reference manual §9 documents attributes *as a user
feature* and does **not** document `registerBuiltinAttribute` / `AttributeImpl` /
`ParametricAttribute` / `TagAttribute` at all; the book's Attributes chapter is an empty file with
its `SUMMARY.md` entry commented out. If the lab needs a custom attribute, the only documentation
is `lean-lang.org/doc/api/Lean/Attributes.html` and the source. **Judgment: avoid custom
attributes for v1.** Nothing in P1–P4 needs one.

**`initialize`** — `Lean/Parser/Command.lean:859–862`. Contents are an `IO` `do` block run at
import time. `builtin_initialize` is reserved for the bootstrap. Relevant change: **v4.24.0
(#10217)** made `@[init]` declarations run in *declaration order* on import. Also **v4.33.0
(#14372)** moved `Lean.initializing`, `enableInitializersExecution`, and
`isInitializerExecutionEnabled` from `IO` to `BaseIO` — a signature break if you copy older code.

**`Lean.Meta` declaration construction** — `addDecl`, `addAndCompile`,
`Declaration.{defnDecl,thmDecl,opaqueDecl,inductDecl,mutualDefnDecl}`. Two facts that matter:

- **Constructing an inductive with raw `addDecl (.inductDecl …)` gives you a kernel-valid type
  with none of the elaborator's furniture.** **Measured:** the type and its `.rec` appear, but
  `casesOn`, `noConfusion`, `below`, `brecOn`, `ctorIdx`, and `ctorElim` do not, so the equation
  compiler cannot pattern-match on it and `deriving DecidableEq` fails inside `cases`. You must
  call the constructions yourself. `mkAuxConstructions` is `private`
  (`Lean/Elab/MutualInductive.lean:1542`) but its body tells you the exact list:

  ```lean
  mkRecOn n; mkCasesOn n; mkCtorIdx n; mkCtorElim n; mkNoConfusion n; mkBelow n
  -- then, in a second pass over all names:  mkBRecOn n
  ```

  **Measured:** after adding those, `deriving DecidableEq, Repr` succeeds and a `by decide` proof
  over the generated type reports *"does not depend on any axioms"* — but the compiler then errors
  with `` `Gen.SchemaCore` was not compiled; `compileDecls` must run on inductive types first ``,
  so `#eval` and any executable use are broken until you also compile it. **Judgment: this path
  reimplements `elabInductive` badly. Do not take it.**
- **v4.30.0 (#13005)** is a live hazard here: *"Metaprograms that call `compileDecl` directly may
  now need to call `markMeta` first… `addAndCompile` should be split into `addDecl` and
  `compileDecl`."* And **v4.33.0 (#14607)** hardened the kernel against metaprograms sneaking
  nested inductive declarations containing free variables or metavariables — i.e. this is exactly
  the surface where the kernel-soundness team has been finding bugs.

**`ToExpr` / quotation** — `Lean/ToExpr.lean` (278 lines):

```lean
class ToExpr (α : Type u) where
  toExpr     : α → Expr
  toTypeExpr : Expr
```

Core instances for `Nat`, `Int`, `Bool`, `Char`, `String`, `Name`, `List`, `Array`, `Prod`,
`Option`, … Universe polymorphism is handled by `Lean.ToLevel`, with the documented caveat that
*"the `ToLevel` mechanism does not support `max` or `imax` expressions"*. Two entries in 21
releases (#8687, #10682) — extremely stable. `deriving ToExpr` exists in core
(`Lean/Elab/Deriving/ToExpr.lean`) and supports mutual inductives.

Syntax quotation `` `(…) `` is the *other* construction route and is what core's deriving handlers
use exclusively. **Judgment: for generated carriers, `ToExpr` is the right tool for emitting
*values* (P4) and syntax quotation is the right tool for emitting *declarations*.**

**Qq (quote4)** — `https://github.com/leanprover-community/quote4`. Type-safe `Expr` quotation:
`Q(α)` and `q(…)`, with `~q()` matching. **Zero dependencies** — `lake-manifest.json` at tag
`v4.33.0` is literally `"packages": []`, so it pulls in neither Mathlib nor Batteries. Healthy:
last commit 2026-08-21, tracking each Lean release within hours. One tag per Lean *minor*
release — there is **no `v4.33.1` tag**, so the correct pin for this estate is
`require Qq @ git "v4.33.0"`.

Cost/benefit under the no-extra-deps posture: **not worth it for this project.** Core's own
deriving handlers use no `Expr` construction at all — they build `Syntax` and call `elabCommand`.
Qq pays off in `MetaM`-level tactic and simproc work where you manipulate `Expr` directly, which
is not what P1–P4 need. Against it: +1 dependency to pin and re-pin, elaboration-time overhead
(open issue #37, "poor elaboration performance on structure matches"), and its own README is
candid that the `QQ` invariant is *unenforced* — `Q(α)` is definitionally `Expr` and type-safety
holds only *"under the assumption that the values of `α`, `f`, etc. really have their declared
types"*. **Judgment: decline Qq for v1.** Revisit only if the lab writes a real tactic.

**Batteries** — admissible under the estate rule but **buys nothing here**: a repo-wide search for
`registerDerivingHandler` returns zero hits and there is no `Deriving` directory. Its useful
pieces for metaprogramming are `Batteries/Lean/NameMapAttribute.lean`, `Expr.lean`
(`Lean.Expr.toSyntax`), and `Tactic/OpenPrivate.lean`. Zero dependencies, tag-per-release, no
`v4.33.1` tag (pin `v4.33.0`). **Judgment: decline for v1**; nothing in P1–P4 needs it. Note that
if you copy code from the metaprogramming book you inherit this dependency, because the book's
`lakefile.lean` requires `batteries @ git "main"`.

**Reading files / IO at elaboration time** — feasible and easy: a `CommandElab` can call
`IO.FS.readFile`, `Json.parse`, and `addAndCompile`. **Measured:** a 20-line command reads
`inv.json`, parses it, emits `def loaded : List String`, and `theorem loadedOk : loaded = […] := by
decide` proves with no axioms. Two reproducibility hazards, both **measured**:

1. **The path resolves against the process CWD, not the source file.** Running
   `lean lab/TB.lean` from the parent directory gives
   `no such file or directory (error code: 4294967294)  file: inv.json`.
2. **Lake does not treat the JSON as an input.** See §3 P1 for the full experiment; the summary is
   that a drifted JSON leaves a stale, wrong olean and `lake build` says *"Build completed
   successfully"*.

---

## 2. PRECEDENT STUDIES

### 2.a Core's `DecidableEq` and `ToJson`/`FromJson` — what they generate

**`DecidableEq`** (`Lean/Elab/Deriving/DecEq.lean`, 295 lines). Two strategies, selected by
`deriving.decEq.linear_construction_threshold` (default 10, `DecEq.lean:23`):

- Under threshold, `mkMatchOld` emits a quadratic `match` over all constructor pairs. Same-ctor
  fields become `if h : @a = @b then by subst h; exact … else isFalse (by intro n; injection n; …)`;
  cross-ctor pairs become `isFalse (by intro h; injection h)`.
- At or above threshold, `mkMatchNew` compares `ctorIdx` first via `Nat.decEq`, then uses a
  generated `casesOnSameCtor`. The comment at `#10152` explains why: *"Otherwise, the 'smart
  unfolding' machinery will not let `rfl` decide"*.

Parameters: `mkHeader` (`Util.lean:175`) binds every parameter and index implicitly and adds
`[DecidableEq α]` instance binders for each parameter where that is type-correct
(`mkInstImplicitBinders`, `Util.lean:53` — note it *tries* and silently skips on failure).
Constructor fields whose type the result type depends on are matched with inaccessible patterns
rather than compared (`DecEq.lean:78–85`).

The generated functions are always plain `def` with `termination_by structural x₁`
(`DecEq.lean:186–191`) — `DecEq` never consults `ctx.usePartial`. Enums get a separate path
(`mkDecEqEnum`) building `ofNat` and `ofNat_ctorIdx` via `addAndCompile` in `MetaM`.

**Nested handling: it refuses.** `DecEq.lean:209–212`:

```lean
def mkDecEq (declName : Name) : CommandElabM Bool := do
  let indVal ← getConstInfoInduct declName
  if indVal.isNested then
    return false -- nested inductive types are not supported yet
```

Returning `false` means "no handler applied", so the user sees a hard error. **Measured** on
`inductive SchemaCore | scstring | scobject (fields : List (String × SchemaCore))`:

```
error: None of the deriving handlers for class `DecidableEq` applied to `SchemaCore`
```

`LawfulBEq` (`LawfulBEq.lean:23`) and `ReflBEq` (`ReflBEq.lean:23`) refuse the same way.

**`ToJson`/`FromJson`** (`FromToJson.lean`, 258 lines). Structures serialize field-by-field with
`?`-suffixed field names becoming optional (`mkJsonField`, line 29). Inductives serialize as
`{"CtorName": …}`: nullary → a bare string tag, one field → the value, several unnamed → a
`Json.arr`, several named → a nested object. Decoding matches on `Json.getTag?` and sorts
alternatives by field count so cheap cases run first (line 158).

**Nested and recursive handling: it goes `partial`.** `ToJson` follows `ctx.usePartial`
(line 175); `FromJson` is worse — line 197 is `if ctx.usePartial || indval.isRec`, so
**`deriving FromJson` produces a `partial def` for *any* recursive inductive, nested or not**.

### 2.a′ The `partial` trap, in full — the most important finding in this survey

`mkContext` (`Util.lean:116`) computes:

```lean
let usePartial := indVal.isNested || typeInfos.size > 1 || (indVal.isRec && !supportsRec)
```

and every handler except `DecEq` branches on it to emit `partial def` instead of `def`
(`Repr.lean:103`, `BEq.lean:196`, `Ord.lean:152`, `Hashable.lean:73`, `ToExpr.lean:170`,
`FromToJson.lean:178,200`).

`partial def` is not a proof-irrelevant convenience. `Lean/Elab/PreDefinition/Main.lean:20–36`:

```lean
private def addAndCompilePartial (docCtx) (preDefs) (useSorry := false) : TermElabM Unit := do
  for preDef in preDefs do
    forallTelescope preDef.type fun xs type => do
      let value ← … liftM <| mkInhabitantFor msg xs type
      addNonRec docCtx { preDef with kind := DefKind.«opaque», value } (all := all)
  addAndCompilePartialRec docCtx preDefs
```

The logical content of `partial def f : T := body` is **`opaque f : T := <some arbitrary
inhabitant of T>`**. The real recursion survives only as `f._unsafe_rec`, an `unsafe` definition
the code generator uses. The kernel cannot unfold `f`.

And `#print axioms` does not tell you. `Lean/Util/CollectAxioms.lean` adds a name to the axiom set
only in the `.axiomInfo` branch; the `.opaqueInfo` branch walks the type and value and reports
nothing:

```lean
  | some (.axiomInfo v)  => modify fun s => { s with axioms := s.axioms.insert c }; collectExpr v.type
  | some (.opaqueInfo v) => collectExpr v.type *> collectExpr v.value
```

**Measured**, on `inductive Nested | a | b (fields : List (String × Nested))` versus
`inductive Plain | a | b (x : Plain)`, dumping `ConstantInfo` kinds:

```
instBEqPlain.beq    : def        instBEqNested.beq    : OPAQUE
instReprPlain.repr  : def        instReprNested.repr  : OPAQUE
```

and yet `#print axioms` on a theorem mentioning the opaque one still reports *"does not depend on
any axioms"*. **Measured** consequence:

```
example : (ex == ex) = true := by rfl
-- error: Tactic `rfl` failed: The left-hand side
--   ex == ex
-- is not definitionally equal to the right-hand side
--   true
```

Full **measured** table at v4.33.1 (`def` = kernel-reducible; `OPAQUE` = `partial`, unreducible;
`REFUSED` = hard error):

| deriving | plain recursive | mutual | nested |
|---|---|---|---|
| `DecidableEq` | `def` | `def` | **REFUSED** |
| `Repr` | `def` | OPAQUE | OPAQUE |
| `BEq` | `def` | OPAQUE | OPAQUE |
| `Hashable` | `def` | OPAQUE | OPAQUE |
| `ToJson` | `def` | OPAQUE | OPAQUE |
| `ToExpr` | `def` | OPAQUE | OPAQUE |
| **`Ord`** | **OPAQUE** | OPAQUE | OPAQUE |
| **`FromJson`** | **OPAQUE** | OPAQUE | OPAQUE |
| `LawfulBEq`, `ReflBEq` | `def` | — | **REFUSED** |

`Ord` is opaque even for a plain recursive type because `Ord.lean:166` passes
`(supportsRec := false)`. `FromJson` because of the extra `|| indval.isRec`.

**Judgment: the estate should treat `partial` in generated code as a gate violation on the same
footing as `native_decide`, and should assert its absence mechanically.** `#print axioms` will
never catch it. A cheap check: after `lake build`, walk the environment and assert no constant in
the artifact's namespaces is `ConstantInfo.opaqueInfo` (and none is `unsafe`). That is a ~15-line
`run_cmd` and it belongs in the gate, not in a reviewer's head.

### 2.b Proof by reflection: `decide`, `decide +kernel`, `rfl` — and the scaling truth

The estate's calibration point is Keccak-f[1600] by `rfl` in 26–40 s
(`formal/fips202/Sha3/Kats.lean`, which sets `maxRecDepth 8000000` and `maxHeartbeats 8000000` and
expects `[propext, Quot.sound]`). **That calibration does not transfer to Schema Core work**, and
the reason is mechanical.

The kernel accelerates `Nat` and nothing else. `src/kernel/type_checker.cpp:702–732`
(`type_checker::reduce_nat`) special-cases exactly: `Nat.succ`, `Nat.add`, `Nat.sub`, `Nat.mul`,
`Nat.pow`, `Nat.gcd`, `Nat.mod`, `Nat.div`, `Nat.beq`, `Nat.ble`, `Nat.land`, `Nat.lor`,
`Nat.xor`, `Nat.shiftLeft`, `Nat.shiftRight`. `Lean/Meta/WHNF.lean:1054–1076` mirrors this in the
elaborator. Keccak is `UInt64` arithmetic over `Nat` — squarely on the fast path.

`String` is not. At v4.33.1 `Init/Prelude.lean:3537` declares

```lean
structure String where ofByteArray ::
  toByteArray : ByteArray
  isValidUTF8 : ByteArray.IsValidUTF8 toByteArray
```

so `String.decEq` bottoms out in structural comparison of `List UInt8`, and a string literal
entering the kernel expands to a full spine.

**Measured**, same generated corpus, 8 fixtures, a binary-tree schema of the given depth,
`maxRecDepth 4000000`, wall-clock for the whole `lean` invocation:

*String-valued encode, forcing full traversal (`Σ (enc s).length`):*

| depth | encoded chars | `decide` | `decide +kernel` | `rfl` | `decide_cbv` |
|---|---|---|---|---|---|
| 2 | 358 | 1.5 s | 0.9 s | 1.6 s | 2.0 s |
| 3 | 868 | 7.2 s | 4.0 s | 7.5 s | 8.2 s |
| 4 | 1,987 | **fails** | **> 45 s timeout** | **fails** | **> 90 s timeout** |

The depth-4 failure is `(deterministic) timeout at whnf, maximum number of heartbeats (200000)`.

*`Nat`-valued fold over the same trees:*

| depth | nodes summed | `decide` |
|---|---|---|
| 4 | 552 | 0.24 s |
| 8 | 9,192 | 0.96 s |
| 12 | 147,432 | 16.2 s |

**Two orders of magnitude.** Roughly 2,000 characters of string reduction is the wall; roughly
150,000 units of `Nat` reduction is comfortable.

A related **measured** trap: an earlier version of the same benchmark asserted that 16 encoded
fixtures were pairwise distinct and finished in 0.5 s at depth 4 and 0.7 s at depth 10. That is
not fast string reduction — `List UInt8` equality short-circuits on the first differing byte, and
the fixtures differ in their first field name. **Any benchmark of kernel string work that compares
*unequal* strings measures nothing.**

Relevant limits, all kernel-side (`type_checker.cpp`, `kernel_exception.h`): `maxHeartbeats`
default 200,000 (`deterministicTimeout`); `maxRecDepth` default 512 (`deepRecursion`);
`LEAN_NAT_MAX_SIZE` default 128 MB. **v4.33.0 (#13956) is a breaking change here**: kernel type
checking is now bounded by `maxRecDepth` (at 16× the option value) instead of physical stack size,
making the error deterministic — *"Deeply recursive code may need a `set_option maxRecDepth`
bump."* Generated files should set it explicitly rather than inherit it.

**`decide +kernel`** reduces once (kernel only) instead of twice, ignores transparency, and can
unfold everything. **Measured:** ~1.8× faster than plain `decide` at depth 2–3, then dies at
depth 4 like everything else. Documented limitation, verbatim from `Init/Tactics.lean:1426`:
*"`Decidable` instances defined by well-founded recursion might not work because evaluating them
requires reducing proofs. Reduction can also get stuck on `Decidable` instances with `Eq.rec`
terms."*

**`cbv` / `decide_cbv`** (new in v4.29.0, present in v4.33.1 at `Init/Tactics.lean:2391,2408`) is
a genuinely different mechanism — *propositional* unfolding via defining equations rather than
kernel whnf — and the docstring makes the trust claim explicitly: *"The proofs produced by
`decide_cbv` only use the three standard axioms. In particular, they do not require trust in the
correctness of the code generator."* **Measured** axiom profile:
`[propext, Classical.choice, Quot.sound]` — three axioms, all on the allowlist, but **not zero**,
unlike plain `decide`.

**Judgment: `decide_cbv` is not a performance escape hatch for this workload** — measured, it is
slightly *slower* than `decide` here and hits the same wall. Its value is *reach*: it works on
functions defined by well-founded recursion and partial fixpoints, where `decide` and `rfl` cannot
reduce at all. Keep it in the toolbox for §4's fallback case, not as the default.

**Axiom cost of each tactic** (**measured**, same obligation family):

| tactic | `#print axioms` |
|---|---|
| `injection`, `noConfusion`, explicit terms | *does not depend on any axioms* |
| `decide`, `decide +kernel`, `rfl` | *does not depend on any axioms* (`of_decide_eq_true` is a theorem, not an axiom) |
| `simp` | `[propext]` |
| `decide_cbv` | `[propext, Classical.choice, Quot.sound]` |
| `grind` | `[propext, Classical.choice, Quot.sound]` |
| `native_decide` | allowlist **+ one fresh axiom per computation** — see §5 |

Note `decide` over `String` data picks up `[propext]` transitively via `List`/`String` lemmas; the
zero-axiom result is for `Nat`- and constructor-shaped goals.

### 2.c `grind` and `simp` at v4.33.1

**`grind` is in core, not Mathlib.** ~44k LOC across `src/Init/Grind/` (41 files),
`src/Lean/Meta/Tactic/Grind/` (158 files), `src/Lean/Elab/Tactic/Grind/` (24 files). Released as a
headline feature in **v4.22.0** (2025-08-14). Core carries 5,783 `@[grind …]` annotations, so a
zero-import file gets useful behaviour. Engines: congruence closure, constraint propagation,
E-matching, guided case analysis, plus `lia` (cutsat, complete for linear integer arithmetic),
`ring` (Gröbner), `linarith`, `ac`, `order`, `inj`.

**It produces kernel-checkable proof terms.** Manual: *"Like other tactics, `grind` produces
ordinary Lean proof terms for every fact it adds."* Morrison & de Moura, IJCAR 2026
(DOI `10.1007/978-3-032-32589-1_7`): *"producing kernel-checkable proof terms without any
soundness compromises… There is no translation step and no external tool."* Corroborating
behavioural signature: grind bugs surface as *kernel rejections* — v4.33.0 fixed *"`grind`
produced invalid proofs rejected by the kernel"* (#14371/#14370/#14379), v4.32.0 fixed two more.
That is the right failure mode.

**Measured** on the constructor-obligation family (`injectivity`, `disjointness`, `iff`):

```
'inj_scarray' depends on axioms: [propext, Classical.choice, Quot.sound]
'disj'        depends on axioms: [propext, Classical.choice, Quot.sound]
'lit_inj'     depends on axioms: [propext, Classical.choice, Quot.sound]
```

Exactly the allowlist. Contrast `bv_decide`, whose own core test expects
`[…, bv_axiomCheck._native.bv_decide.ax_1_5]`.

**But there is an explicit stability disclaimer in core**, at
`Lean/Elab/Tactic/Grind/Main.lean:292`:

> The `grind` tactic is new and its behavior may change in the future. This project has used
> `set_option grind.warning true` to discourage its use.

`grind.warning` is a registered builtin option defaulting to `false`, and it exists precisely so a
downstream project can ban `grind` on stability grounds. There is also no upstream `#print axioms`
regression test for `grind` (there is one for `bv_decide`), so the three-axiom result above is an
empirical measurement, not a CI-enforced contract.

Documented limitations worth knowing: no nonlinear integer arithmetic; combinatorial blowup is
explicitly out of scope (*"For bit-level or pure Boolean combinatorial problems, use `bv_decide`"*);
`+qlia` is incomplete; AC does not apply to `And`/`Or`/`Iff`; plain `def` is not unfolded (`abbrev`
is). The manual's §16.9.2 contains a "does support"/"does not support" typo — do not quote it.

**`simp`** is mature and costs only `[propext]`. **Measured:** `simp` closes
`scarray a = scarray b ↔ a = b` from the auto-generated injectivity simp lemmas with no setup.

**Judgment for the estate:** use `grind?` to obtain an explicit `grind only [...]` script and
commit *that*, per the manual's own §16.2 advice — *"The generated script does not depend on the
annotations from the environment, improving proof stability across library updates."* Treat bare
`grind` in a promoted artifact as a review finding. Prefer, in order: explicit terms /
`injection` / `noConfusion` (0 axioms) → `decide` (0) → `simp` (`propext`) → `grind only [...]`
(allowlist) → hand proof.

### 2.d Precedent for generating `.lean` from an external inventory

The pattern is real and in two places standardised.

**Aeneas** (`https://github.com/AeneasVerif/aeneas`) is the strongest precedent: Rust → charon →
`.llbc` → generated `.lean` (`Types.lean`, `Funs.lean`, `Specs.lean`, `ProofObligations.lean`,
plus `*_Template.lean` files humans copy and fill). Every generated file's first line is exactly
`-- THIS FILE WAS AUTOMATICALLY GENERATED BY AENEAS`, and that banner doubles as the cleanup key
(`grep -lR '<banner>' | xargs rm`). Generated files emit `set_option maxHeartbeats 1000000` and
`set_option maxRecDepth 2048`. `tests/README.md`: *"CI does both of these things; it also checks
that we committed all the generated files."* The check is a Nix derivation: copy `tests` →
regenerate in parallel → `diff -rq tests tests-copy`. `.llbc` is not committed.

**Mathlib4** ships `scripts/mk_all.lean` with a `--check` mode (*"Only check if the files are
up-to-date; print an error if not"*), and CI runs `lake exe mk_all --check`.

**`lean-action`**, the official Lean CI action, has this as first-class inputs: `mk_all-check`,
plus `leanchecker`, `axiom-audit` (with `axiom-audit-allow`), and `nanoda` (with
`nanoda-allow-sorry`).

**Charon** contributes two refinements worth stealing: it runs `ocamlformat --inplace` on *both*
sides before `diff -rq`, so the generator need only be semantically deterministic, not
formatting-canonical; and its snapshot harness picks `Verify` when `IN_CI == "1"` and `Overwrite`
otherwise, so a local run blesses and CI verifies.

**lean4 itself does not generate any `.lean`** — the only `.lean`-emitting path in `script/` is
dead Lean 3 code. But it does commit generated C (`stage0/`) with a rebootstrap-and-diff check and
a separate "Check Source Tree Clean" step.

**Instructive negatives.** `cedar-policy/cedar-spec` hand-writes its Lean protobuf decoders and
reconciles by *runtime differential testing*, not codegen. `lean-mlir` generates `.lean` from
`.lean` and commits it but has **no check mode**. The `LeanProject` template's check is
`lake exe mk_all --check || echo "ERROR..."` — the `|| echo` swallows the exit code, so the check
*cannot fail CI*, and every scaffolded project inherits that. `hax`'s `git diff --exit-code`
enumerates six literal paths, two of which no longer exist and two of which are gitignored —
the canonical failure mode of path lists versus whole-tree diffs.

**Judgment:** the estate's `mise run gen` + `git diff --exit-code` in `mise run check` is already
the Aeneas/Mathlib pattern and is correct. Two adjustments: diff the whole generated directory
rather than a path list, and put the banner on line 1 of every generated file.

---

## 3. THE FOUR PATTERNS

### P1 — Inventory-driven carrier generation

**Recommendation: architecture (i), deterministic text generation into committed `.lean` files.**

**Mechanism.** `mise run gen` runs a TypeScript/bun extractor over the pinned Effect source in
`.staging/e2/src-cache/`, emits `inventory.json` (committed), then a generator emits
`formal/<artifact>/Schema/Core.lean` and `Schema/Correspondence.lean` (committed). CI runs
`mise run gen` then `git diff --exit-code`, exactly as `mise.toml` already does.

Shape of the generated carrier (this is a real, buildable file — **measured**, it compiles and the
proofs below all report clean axiom sets):

```lean
-- GENERATED BY foldlab schema-gen FROM inventory.json — DO NOT EDIT
set_option maxRecDepth 8192

mutual
inductive SchemaCore where
  | prim    (p : Prim)
  | lit     (v : Value)
  | object  (fields : FieldList)
  | tuple   (elems : SchemaList)
  | array   (elem : SchemaCore)
  | union   (members : SchemaList)
  | refine  (s : SchemaCore) (c : Check)
  | ref     (a : Address)
  | var     (i : Nat)
  | mu      (discriminator : String) (body : SchemaCore)
deriving DecidableEq

inductive FieldList where
  | nil
  | cons (key : String) (val : SchemaCore) (optional : Bool) (rest : FieldList)
deriving DecidableEq

inductive SchemaList where
  | nil
  | cons (hd : SchemaCore) (tl : SchemaList)
deriving DecidableEq
end

-- BEq from DecidableEq is a real `def`; the derived one would be `partial`.  See §4.
instance : BEq SchemaCore  := instBEqOfDecidableEq
instance : BEq FieldList   := instBEqOfDecidableEq
instance : BEq SchemaList  := instBEqOfDecidableEq
```

`Repr` and the canonical serializer are generated as explicit mutual `def`s with
`termination_by structural`, **not** derived — see §4 for why.

**Comparison.**

| | (i) generated text, committed | (ii) elaboration-time read of the JSON |
|---|---|---|
| Lake sees the input change | **yes** (the `.lean` content changes) | **no — measured** |
| Reviewable in a PR diff | yes; the diff *is* the review artifact | no; the diff is invisible |
| Kernel checks it | everything, on every build | everything *that gets built* |
| Reproducible from a different CWD | yes | **no — measured** |
| `mise run gen` / clean-tree assertion | fits exactly | does not apply |
| Metaprogram in the build | none | a `CommandElab` doing file IO |
| Extra machinery | a generator (any language) | a Lean elaborator + `ToExpr` plumbing |

The decisive item is the first. **Measured**, in a real Lake project:

```
$ printf '["a","b"]' > inv.json && lake build       # theorem ok : loaded = ["a","b"]
✔ [2/3] Built Demo (1.3s)
Build completed successfully (3 jobs).

$ printf '["a","XXX"]' > inv.json && lake build     # the theorem is now FALSE
Build completed successfully (3 jobs).

$ touch Demo.lean && lake build
Build completed successfully (3 jobs).

$ lake clean && lake build
error: Demo.lean:15:38: Tactic `decide` proved that the proposition
  loaded = ["a", "b"]
is false
```

Lake's trace model covers source files and the toolchain, not arbitrary IO. A drifted inventory
leaves a stale olean whose theorem is false, and `mise run check` goes green. That is a
soundness-relevant hole in the *gate*, not in the kernel — the kernel never re-ran. Architecture
(ii) is disqualified for anything the estate gates on.

**Trust analysis for (i).** Trusted: the extractor (that `inventory.json` faithfully describes the
pinned TypeScript) and the generator (that the `.lean` text says what the JSON says). Checked by
the kernel: the inductive is well-formed and strictly positive; every instance is well-typed;
every theorem holds. Checked by CI: the committed text is exactly what the generator produces from
the committed JSON (`git diff --exit-code`), and the committed JSON matches the pinned source
digest. Checked by review: the generated text is human-readable and appears in the PR diff.
§3 P2 then removes the *generator* from the trusted set for the carrier's shape specifically.

`#print axioms` on the whole file: nothing beyond the allowlist. **Measured** — the sketch above
plus its `decide` proofs reports *"does not depend on any axioms"* throughout.

**Failure modes.** (a) Non-deterministic generation — key ordering from a hash map, timestamps in
the banner, locale-dependent sorting — turns `git diff --exit-code` into a flake. Mitigation: sort
every collection explicitly, no timestamps, and normalise formatting on both sides before diffing
(Charon's `ocamlformat` trick). (b) A path-list diff that drifts (hax). Mitigation: diff the whole
generated directory. (c) Hand edits to generated files. Mitigation: banner on line 1 plus a
generated-path check. (d) A generator bug producing *valid but wrong* Lean — this is what P2 is
for.

Architecture (iii), constructing the inductive with `addDecl (.inductDecl …)`, is rejected: see
§1.2. **Measured**, it needs seven explicit `mkAuxConstructions` calls plus `compileDecls` and
still leaves the type uncompiled; it is a reimplementation of `elabInductive`.

### P2 — Correspondence checking as a build-time theorem

**Verdict: feasible, cheap, and there are two shapes. Take the second.**

**Shape A — environment walk emitting a literal, then prove equality.** **Measured**, end to end,
in ~50 lines:

```lean
syntax (name := emitInv) "#emit_inventory " ident " as " ident : command

@[command_elab emitInv] def elabEmitInv : CommandElab := fun stx => do
  let indName := stx[1].getId
  let outName := stx[3].getId
  liftTermElabM do
    let iv ← getConstInfoInduct indName
    let vs ← iv.ctors.toArray.mapM fun c => do
      let cv ← getConstInfoCtor c
      let fs ← forallTelescopeReducing cv.type fun xs _ => do
        let mut acc : Array (String × String) := #[]
        for x in xs[iv.numParams...*] do
          let d ← x.fvarId!.getDecl
          acc := acc.push (d.userName.toString, toString (← ppExpr d.type))
        pure acc.toList
      pure (Variant.mk c.getString! fs)
    let ty := mkApp (mkConst ``List [0]) (mkConst ``Variant)
    addAndCompile <| .defnDecl
      { name := outName, levelParams := [], type := ty, value := toExpr vs.toList
        hints := .abbrev, safety := .safe }

#emit_inventory SchemaCore as inventoryLean

def inventoryTS : List Variant := [ … generated literal from inventory.json … ]

theorem correspondence : inventoryTS = inventoryLean := by decide
```

Results: `'correspondence' does not depend on any axioms`. Drift detection **measured** — adding
a constructor gives

```
error: Tactic `decide` proved that the proposition
  inventoryTS = inventoryLean
is false
```

Timing **measured** at a realistic size: a 27-variant inventory with two fields each decides in
0.42 s wall clock including process startup. Effect Schema v3's AST has 22 union members, v4's has
21, so this is comfortably within budget.

The residual trust: the *elaborator* is trusted to walk the environment faithfully. If
`elabEmitInv` has a bug — skips a constructor, mis-renders a type — the theorem still passes. That
is a real metaprogram in the TCB, and the operator's framing ("checkable from a walk over the
typescript representation") deserves better.

**Shape B — the same gate with no metaprogram at all.** All three parts are ordinary generated
text; the kernel checks everything; nothing is trusted but the extractor.

```lean
namespace Correspondence
-- (1) SOUNDNESS: every TS variant exists in Lean with exactly this signature.
--     A type ascription is a kernel-checked claim about a constructor's type.
def «scliteral» : String    → SchemaCore := SchemaCore.scliteral
def «scarray»   : SchemaCore → SchemaCore := SchemaCore.scarray
def «scobject»  : FieldList  → SchemaCore := SchemaCore.scobject

-- (2) COMPLETENESS: no EXTRA Lean variants. Match exhaustiveness is kernel-checked
--     (it compiles to casesOn); a new constructor breaks this match.
def tag : SchemaCore → Nat
  | .scstring    => 0
  | .scnumber    => 1
  | .scliteral _ => 2
  | .scarray _   => 3
  | .scobject _  => 4

-- (3) DISTINCTNESS: the tag assignment is injective (no two variants aliased).
theorem tags_distinct : ([0,1,2,3,4] : List Nat).eraseDups.length = 5 := by decide
end Correspondence
```

**Measured**, both drift kinds are caught with better error messages than Shape A:

```
# extra constructor added to SchemaCore
error: Missing cases:
SchemaCore.scboolean

# scliteral's field type changed String -> Nat
error: Type mismatch
  SchemaCore.scliteral
has type
  Nat → SchemaCore
but is expected to have type
  String → SchemaCore
```

Axioms: `'Correspondence.tag' does not depend on any axioms`,
`'Correspondence.tags_distinct' does not depend on any axioms`.

**Judgment: adopt Shape B as the gate and keep Shape A as a diagnostic.** Shape B removes the
metaprogram from the TCB entirely — the correspondence claim is carried by type ascriptions and
match exhaustiveness, both of which the kernel already checks on every build, and both of which
appear as reviewable text in the PR diff. Shape A remains useful as a `#emit_inventory` command
you run by hand to *produce* the JSON side when bootstrapping, and as a cross-check that Shape B
did not go stale — but it should not be what the build gates on.

**Failure modes.** Shape B (1) does not catch a *reordered* constructor list if you only ascribe
types; use (2)'s explicit tag map to pin order. Shape B (2) does not catch a constructor whose
*field names* changed while types stayed the same — Lean does not check binder names in a type
ascription. If field names are load-bearing (they are, for the canonical encoding) add a third
generated artifact: the serializer itself, whose per-constructor `match` arms name every field and
therefore fails to elaborate if a name moves. Shape A's `ppExpr`-rendered type strings are
pretty-printer output and can change across Lean versions without the type changing — a
false-positive source. Use `Expr` structure or constructor arity/head-symbol, not
`toString (← ppExpr …)`, if you keep Shape A in the gate.

### P3 — Obligation generation

**Mechanism.** Per-constructor lemma statements are generated text, one per constructor per
family, from the same inventory. Nothing here needs a metaprogram: a lemma statement is text, and
a generator that already emits the inductive can emit the lemmas.

Three families, with **measured** costs on the constructor-obligation shapes:

*Injectivity / disjointness* — mechanical, and free:

```lean
theorem scarray_inj (a b : SchemaCore) : .scarray a = .scarray b → a = b := by
  intro h; injection h
theorem scarray_ne_scstring (a : SchemaCore) : .scarray a ≠ .scstring := by
  intro h; exact SchemaCore.noConfusion h
```

Both report *does not depend on any axioms*. `simp` also closes the `↔` form at cost `[propext]`;
`grind` closes all of them at cost `[propext, Classical.choice, Quot.sound]`. **Judgment: generate
the `injection`/`noConfusion` scripts.** They are shorter than the `grind` call, cost zero axioms,
and cannot regress when `grind`'s annotation set changes. Note that Lean already generates
`SchemaCore.scarray.injEq` simp lemmas for you, so this family may be redundant with `simp` —
worth checking before generating hundreds of them.

*Framing* (the constructor is determined by its fields; the encoding of a node depends only on the
node) — these are `rfl` or `simp` over the generated serializer, and scale with the constructor
set. Automation should hold.

*Canonicalisation* (`canonS` is idempotent, `canonS` respects declared equivalence, `encodeS ∘
canonS` is injective) — these are **not** mechanical. They are inductions over the carrier, and
§4 explains why the induction is the hard part for a nested carrier. **Judgment: budget hand
proofs for the canonicalisation family and generated statements only.** The generator's job is to
guarantee that the *statement set* is complete with respect to the constructor set — that no
constructor is silently missing an obligation — not to discharge them.

**Trust analysis.** Generated statements plus generated tactic scripts are ordinary text; the
kernel checks the resulting proof terms; `#print axioms` reports per theorem. The estate's
existing per-theorem allowlist gate applies unchanged. The one new risk is **a generated
obligation that is vacuously true** — e.g. an injectivity lemma generated for a nullary
constructor, or a framing lemma whose hypothesis is unsatisfiable. Mitigation: the generator emits
obligations from a typed description of the constructor (arity, field kinds), and the *count* of
obligations per family is itself asserted (`theorem obligation_count : … = 10 := by decide`), so a
family that silently generates nothing fails the build.

**Failure mode worth naming:** bare `grind` in generated code. Core carries an explicit stability
disclaimer and a `grind.warning` option that exists to let downstream projects ban it. If the
generator emits `grind`, a Lean upgrade that changes core's `@[grind]` annotations can break
hundreds of generated proofs at once. Emit `grind only [...]` scripts obtained from `grind?`, or
avoid it.

### P4 — Programmatic schema-value creation

**Mechanism.** `ToExpr` turns a meta-level `SchemaCore` into an `Expr`; `addAndCompile` installs it
as an object-level constant. **Measured**, working, for the nested carrier:

```lean
namespace SchemaCore
def pairTy : Expr := mkApp2 (mkConst ``Prod [0,0]) (mkConst ``String) (mkConst ``SchemaCore)
mutual
def toExprCore : SchemaCore → Expr
  | scstring    => mkConst ``SchemaCore.scstring
  | scliteral s => mkApp (mkConst ``SchemaCore.scliteral) (ToExpr.toExpr s)
  | scobject fs => mkApp (mkConst ``SchemaCore.scobject) (toExprFields fs)
  termination_by structural x => x
def toExprFields : List (String × SchemaCore) → Expr
  | [] => mkApp (mkConst ``List.nil [0]) pairTy
  | (k,v)::r =>
      mkApp3 (mkConst ``List.cons [0]) pairTy
        (mkApp4 (mkConst ``Prod.mk [0,0]) (mkConst ``String) (mkConst ``SchemaCore)
                (ToExpr.toExpr k) (toExprCore v))
        (toExprFields r)
  termination_by structural x => x
end
instance : ToExpr SchemaCore where
  toTypeExpr := mkConst ``SchemaCore
  toExpr := toExprCore
end SchemaCore
```

Emitting `gen 3 2` this way produced, **measured**:
`scobject [("f3", scobject [("f10", scliteral "31")])]`.

**Why hand-written.** `deriving ToExpr` on the nested carrier produces `partial`, i.e. opaque —
§2.a′. And the instance cannot be derived incrementally either: **measured**, writing
`toExprCore` without the mutual companion fails with
`failed to synthesize instance of type class ToExpr (List (String × SchemaCore))`, because the
list instance needs `ToExpr SchemaCore`, which is what you are defining. The knot must be cut by a
mutual pair, exactly as for `DecidableEq` and the serializer.

**Deterministic fixture corpora.** The estate bans ambient randomness; seeds must be explicit
data. The shape is a pure generator whose seed is an argument:

```lean
def gen (seed : Nat) : Nat → SchemaCore
  | 0     => if seed % 2 == 0 then .scstring else .scliteral (toString seed)
  | n+1   => .scobject [(s!"f{seed}", gen (seed*3+1) n), (s!"g{seed}", gen (seed*5+2) n)]

def corpus (k depth : Nat) : List SchemaCore := (List.range k).map (gen · depth)
```

This is an ordinary Lean `def` — no `IO`, no `StdGen`, no `IO.getRandomBytes`. It is
reproducible by construction, it can appear in theorem statements, and the corpus is a *value*
the kernel can compute with. **Judgment: prefer object-level generators to meta-level ones.** A
meta-level generator plus `ToExpr` is only needed when the fixture must be *committed as source
text*; an object-level generator lets the KAT-style obligations quantify over `corpus k d`
directly. Watch the §2.b scaling wall: any obligation over the corpus that reduces `String` is
limited to roughly 2,000 characters.

**The reflective move — Schema Core as an entity.** Representing `SchemaCore` itself as a value
describable by a schema means writing `schemaOfSchemaCore : SchemaCore` — a schema value whose
shape mirrors the inductive's own constructor table. P2's environment walk is exactly the machine
that can *produce* that value from the inductive, and P4's `ToExpr` is exactly the machine that
can install it as a committed constant. The composition is: walk the environment → build a
`SchemaCore` describing the constructor set → `toExpr` → `addAndCompile` → generate the text →
commit it. Then the reflective fixed point is a kernel-checkable statement:

```lean
theorem schema_describes_itself :
    validAt schemaOfSchemaCore (encodeAsEntity schemaOfSchemaCore) = true := by decide
```

**Judgment: this is real and reachable, but it is not v1.** It multiplies the P2 trust question
(is the walk faithful?) by the P1 architecture question (text or elaboration-time?), and it wants
`validAt` and `encodeAsEntity` to exist first. Note it and defer it.

---

## 4. NESTED / MUTUAL INDUCTIVE GOTCHAS

The kickoff's `SchemaCore` nests `List (String × SchemaCore × Bool)` in `object` and
`List SchemaCore` in `tuple` and `union`. **Measured** on exactly that declaration:
`isNested=true numNested=2 isRec=true`. Everything in this section follows from those two words.

**1. `deriving DecidableEq` is a hard error.** Already stated; the receipt is
`DecEq.lean:209–212` and the measured message.

**2. Every other derived instance is `partial`, hence `opaque`, hence unreducible and invisible to
`#print axioms`.** §2.a′. This is the one that will bite silently.

**3. Recursors DO exist and are usable.** This is the good news. **Measured**, the nested
declaration gets a three-motive recursor with auxiliary motives for the nested types:

```
recursor SchemaCore.rec.{u} :
  {motive_1 : SchemaCore → Sort u} →
  {motive_2 : List (String × SchemaCore) → Sort u} →
  {motive_3 : String × SchemaCore → Sort u} → …
```

So the carrier is fully usable; only the *convenience layers* refuse.

**4. The `induction` tactic refuses.** **Measured:**

```
error: The `induction` tactic does not support the type `SchemaCore` because it is a nested
inductive type
Hint: Consider using the `cases` tactic instead
```

(`Lean/Elab/Tactic/Induction.lean:836–837`.) Every inductive proof over the carrier must go
through `SchemaCore.rec` by hand, or through a generated mutual pair of `theorem`s with
`termination_by structural`. **Judgment: this, not the deriving refusal, is the real cost of
nesting** — the canonicalisation family in P3 is exactly the family that needs induction.

**5. `termination_by structural` fails through `List.map` with a lambda.** **Measured**, on the
obvious serializer:

```lean
| scobject fs => "o[" ++ String.intercalate ";" (fs.map (fun p => p.1 ++ "=" ++ enc p.2)) ++ "]"
-- error: failed to infer structural recursion:
-- Cannot use parameter #1:
--   failed to eliminate recursive application
--     p.snd.enc
```

The recursive call is hidden inside a lambda passed to `List.map`, and the structural checker
cannot see it. Mitigation, **measured** to work: write the traversal as an explicit mutual
companion.

```lean
mutual
def enc : SchemaCore → String
  | scstring     => "s"
  | scliteral v  => "l(" ++ v ++ ")"
  | scobject fs  => "o[" ++ encFields fs ++ "]"
  termination_by structural x => x
def encFields : List (String × SchemaCore) → String
  | []            => ""
  | [(k,v)]       => k ++ "=" ++ enc v
  | (k,v)::rest   => k ++ "=" ++ enc v ++ ";" ++ encFields rest
  termination_by structural x => x
end
```

The same pattern is what makes a hand-written `DecidableEq` work on the nested carrier —
**measured**, `decEq`/`decEqFields` as a mutual pair with `termination_by structural`, then
`instance : DecidableEq SchemaCore := decEq`, and `by decide` proofs report *does not depend on
any axioms*. So nesting is survivable; you just write by hand (i.e. generate) everything the
deriving handlers would have given you.

**6. Mutual is not a free escape.** **Measured**, replacing the `List` nesting with monomorphic
`FieldList`/`SchemaList` inductives in a `mutual` block:

- `deriving DecidableEq` **works** (`isNested` is false), `decide` reduces, zero axioms.
- `deriving BEq` is **still `partial`** — `mkContext` sets `usePartial` when
  `typeInfos.size > 1`, and a mutual block always has size > 1.
- The `induction` tactic works, and you get `SchemaCore.rec` with one motive per mutual member.

The fix for `BEq` is one generated line: `instance : BEq SchemaCore := instBEqOfDecidableEq`.
**Measured**, that instance *is* kernel-reducible — `theorem t1 : (ex == ex) = true := by rfl`
reports *does not depend on any axioms*.

**The choice, honestly stated.**

| | `List (String × SchemaCore × Bool)` (nested) | monomorphic `FieldList`/`SchemaList` (mutual) |
|---|---|---|
| `deriving DecidableEq` | refused; hand-write a mutual pair | **works** |
| `deriving BEq`/`Repr`/`Ord`/`Json` | all `partial`/opaque | all `partial`/opaque; `BEq` recoverable in one line from `DecidableEq` |
| `induction` tactic | **refused** | works |
| `SchemaCore.rec` | exists, 3 motives (incl. `Prod`) | exists, 3 motives (one per type) |
| Reuse of `List` lemmas | free (`List.map`, `List.length`, `Perm`, …) | none; you re-prove everything |
| Proof ergonomics | worst — every induction is by hand through `rec` | good — `induction` works, mutual theorems work |
| Serializer / codec | mutual companion required | mutual companion required (same shape) |
| Generated-code volume | lower (one type) | higher (three types + their lemma sets) |

**Judgment: take the mutual, monomorphic shape.** The deciding factor is not `deriving
DecidableEq` — that is one generated mutual pair either way. It is that **`induction` works**, and
the canonicalisation obligations in the kickoff's theorem spine are all inductions over the
carrier. Paying for `List`-lemma reuse with hand-rolled inductions on every canonicalisation proof
is the wrong trade for a project whose deliverable *is* the proofs. The cost — three types instead
of one, and a re-proved `FieldList` lemma set — is generated text, which is the cheap axis here.

The one thing to check before committing: whether `canonS` needs list permutation or sorting
machinery on `FieldList` (object-field ordering is a canonicalisation question the kickoff leaves
open at R-5). If it does, `List`'s `Perm`/`Sorted` API is a real asset and the trade tightens.
**Judgment: resolve R-5 first; it is an input to this decision, not a consequence of it.**

---

## 5. VERSION AND TRUST CAVEATS

**API stability of the meta surfaces.** The deriving entry point has been stable for 19 releases
(last break v4.14.0). `ToExpr` has two release-note entries in 21 releases. The volatile surfaces
are elsewhere, and these will bite anyone copying code written before v4.30:

| Version | Change |
|---|---|
| v4.22.0 | `Expr.updateLet!` → `Expr.updateLetE!`; `Expr.letE` gains a `nondep` field |
| v4.23.0 | `Lean.Name.toString` → `Lean.Name.toStringWithToken`; delta-deriving generalised, **listed under Breaking Changes** (#9800) |
| v4.25.0 | **removes reducible well-founded recursion** (#10714) |
| v4.27.0 | the `meta` keyword no longer implies `partial` (#11587); `noConfusion` generalised to heterogeneous equalities — *"a breaking change for whoever uses the `noConfusion` principle"* (#11474/#11562) |
| v4.30.0 | `isStructureLike` → `isNonRecStructure` (and friends); **`addAndCompile` should be split into `addDecl` + `compileDecl`; `compileDecl` callers may need `markMeta` first** (#13005) |
| v4.31.0 | tactic configuration system rewritten (#13651) |
| v4.32.0 | `Lean.RBMap`/`RBTree` deprecated → `Std.TreeMap`/`Std.TreeSet` (#13908); new `do` elaborator default |
| v4.33.0 | `Lean.initializing` and friends move `IO` → `BaseIO` (#14372); **kernel type checking bounded by `maxRecDepth`** (#13956); transparency split into six levels (#13637) |

**What generated code contributes to `#print axioms`: nothing, if you only generate `def`s and
`theorem`s.** **Measured** across every experiment in this survey — the generated carrier, its
instances, the correspondence theorems, the obligation lemmas, the emitted fixtures — the reports
were either *"does not depend on any axioms"* or within `[propext, Classical.choice, Quot.sound]`.

**But `#print axioms` has three blind spots the estate must cover separately.**

1. **`partial` / `opaque`.** Already established. `CollectAxioms.lean` reports nothing for
   `.opaqueInfo`. A `partial def` is a hole in the *computational* content with a clean axiom
   report. **This is the leading way metaprogramming silently violates the pure-kernel posture**,
   and it arrives through `deriving`, not through anything exotic.
2. **`@[implemented_by]` / `@[extern]`.** `collectAxioms` walks a declaration's *value*; a
   compiled replacement is not part of that value. The manual is explicit that *"for every
   `implemented_by`/`extern` attribute in libraries it becomes part of the trusted code base that
   the replacement is semantically equivalent"*. Generated code should never carry either
   attribute.
3. **Imported constants read a precomputed table.** Since v4.30.0 (#13117), `exportedAxiomsExt`
   computes each declaration's axiom array at olean *export* time and downstream modules look it
   up — *"axiom collection never crosses module boundaries"*. So for imported constants
   `#print axioms` is not an independent re-derivation; it inherits the olean-integrity assumption
   that the manual already flags for `leanchecker`.

Also worth knowing for the record: **from v4.20.0 through v4.29.x, `#print axioms` was a hard
error inside a `module` file** (PR #8174 added an explicit `throwError`; #13117 reverted it in
v4.30.0). `formal/fips202` does not use `module` headers (**measured** — zero files with a
`module` line), so this never affected the estate, and v4.33.1 is past the fix. If the lab adopts
the module system later, note that deriving handlers must be `meta` and their imports
`public meta import`.

**`native_decide` — the ban is right, and the detection method changed.** Since **v4.29.0**
(RFC #12216, PR #12217), `native_decide` and `bv_decide` no longer use `Lean.trustCompiler` or
`Lean.ofReduceBool`. Each computation gets **one freshly generated axiom**, named like
`foo._native.bv_decide.ax_1_5`. All five old constants (`Lean.trustCompiler`, `Lean.reduceBool`,
`Lean.reduceNat`, `Lean.ofReduceBool`, `Lean.ofReduceNat`) are deprecated since 2026-02-01 with
the message *"in-kernel native reduction is deprecated; assert native evaluations with axioms
instead"*. **Consequence for the estate's gate: do not grep for `Lean.ofReduceBool`. An allowlist
is the only correct check**, which is what the estate already specifies. `leanprover-community/axiom-audit`
implements exactly this and is available as `axiom-audit: true` in `lean-action`.

Related: **v4.23.0 (#8842)** fixed a real under-reporting bug — `collectAxioms` did not walk
axioms' *types*, so `native_decide` proofs showed `ofReduceBool` but not `trustCompiler`.

**`decide` at scale and the kernel.** §2.b has the numbers. The mechanism, from the kernel source:
`reduce_nat` (`type_checker.cpp:702`) accelerates fifteen `Nat` operations on literals and nothing
else; `nat_lit_to_constructor` (`inductive.cpp`) peels one `succ` per iota step with a fresh
literal each time, so any `Decidable` instance recursing through `Nat.rec` or a compiled matcher on
a literal `n` costs `n` steps; `string_lit_to_constructor` expands a string literal to a full
`List Char` spine. Guards: `LEAN_NAT_MAX_SIZE` 128 MB, `maxRecDepth` 512 (kernel allows 16×),
`maxHeartbeats` 200,000.

**Where partial functions sneak in**, ranked by likelihood for this project:

1. `deriving Repr`, `BEq`, `Hashable`, `ToJson`, `FromJson`, `Ord`, `ToExpr` on a nested or mutual
   carrier. **By far the most likely.** `Ord` and `FromJson` do it even for a *plain* recursive
   type.
2. Meta-level helper code written `partial` for convenience (e.g. a `partial def` tree walker in
   the generator's Lean side). Harmless if it stays in `MetaM` and never appears in a theorem's
   value, dangerous if it leaks into a definition the obligations mention.
3. Well-founded recursion marked `irreducible` by default — not `partial`, but equally unreducible
   by `decide`/`rfl`. v4.33.0 (#14267) had to mark `Fin.foldl`'s inner loop `semireducible` for
   exactly this reason. `decide_cbv` is the escape hatch here, at a cost of three allowlist axioms.

**Kernel soundness floor.** v4.33.1 is the correct pin and the reason is concrete. Three kernel
soundness releases landed in the eight weeks before it:

- **v4.32.1** (#14498) — a malicious metaprogram in the same process could trick the kernel into
  accepting `False`; root cause *"an `opaque` declaration's value must not contain fvars"*.
- **v4.32.2** (#14577) — *"The kernel's handling of nested inductive types with phantom type
  parameters was incomplete and bypassed the type checker"*; the issue title says it allowed an
  **axiom-free** proof of `False`, and *"the bug can be exploited even when using `comparator`"*.
  **This one is about nested inductives specifically** — directly relevant to this carrier.
- **v4.33.1** (#14806, #14807) — an `is_def_eq` union-find transitivity bug (reported by Daniel
  Selsam) and an `is_prop` stuck-term bug that skipped the proof-irrelevance guard. Notably,
  *"The bogus proof was also accepted by nanoda… We believe the lean4lean external kernel does not
  have this bug."*

v4.33.0 also carries the densest kernel-hardening cluster in the range (#14607, #14613, #14615,
#14616, #14621, #14631, #14632), including one that closed *"users could use metaprogramming to
sneak in nested inductive declarations containing free variables or metavariables"*. v4.33.1 also
requires GMP ≥ 6.3.0 (#14833) — *"earlier GMP versions contain bugs that can cause Lean to produce
unsound results"* — worth asserting on both gate hosts.

**External re-check.** `lean4checker` **is archived**; it was merged into lean4 and ships as
`leanchecker` with every toolchain from **v4.28.0**. The estate's `mise run check:fips202` already
uses the bundled binary correctly. Semantics of `--fresh`, read from `src/LeanChecker.lean`:
`replayFromFresh` loads the module *and all its imports* and replays every constant into a
completely empty environment; it accepts a **single module only**. Without `--fresh`, imports are
taken on trust for that module, which is why the default form sweeps every module on the search
path. What it does not catch, from its own README: *"This is not an external verifier, as it uses
the Lean kernel itself."* It also trusts olean file-structure integrity, and it **does not
re-derive the GMP `Nat` fast paths** — `lean4lean`'s `Lean4Lean/Primitive.lean` does
(`checkPrimitiveDef` verifies `Nat.add/sub/mul/pow/mod/div/gcd/beq/ble/decEq/decLe` against their
logical models), which is a concrete argument for the estate's open follow-up to run lean4lean.
Note `lean4lean` is pinned to `v4.33.0-rc2`.

One operational gotcha: the **bundled** `leanchecker` has never had `--num-workers` (checked
v4.28.0, v4.33.0, v4.34.0-rc2, master); it spawns one task per module, each loading a near-complete
environment. The archived standalone had a sliding window because of OOM on 32 GB machines.
`LEAN_NUM_THREADS` is the mitigation.

---

## 6. RECOMMENDATION

### The architecture

```
pinned Effect source (.staging/e2/src-cache/, digest-locked)
        │  extractor (bun/TypeScript, mise run gen)     ← TRUSTED
        ▼
inventory.json                                          ← COMMITTED, reviewable
        │  generator (mise run gen)                     ← not trusted; see below
        ▼
formal/<artifact>/Schema/Core.lean            (carrier + DecidableEq + BEq)
formal/<artifact>/Schema/Correspondence.lean  (P2 Shape B: ascriptions + tag map)
formal/<artifact>/Schema/Encode.lean          (mutual serializer, termination_by structural)
formal/<artifact>/Schema/Obligations.lean     (P3 generated statements + scripts)
formal/<artifact>/Schema/Fixtures.lean        (P4 deterministic corpora, seeds as data)
        │  all COMMITTED, all in the PR diff
        ▼
lake build            ← kernel checks every declaration
#print axioms         ← allowlist gate, per exported theorem
opaque/unsafe scan    ← NEW: assert no partial/opaque/extern in artifact namespaces
leanchecker --fresh   ← external replay, both hosts
mise run check        ← mise run gen; git diff --exit-code; the above
```

### The trust statement

**Trusted:** exactly one thing — the *extractor*, i.e. the claim that `inventory.json` faithfully
describes the pinned Effect Schema AST. Its input is digest-locked; its output is committed and
human-readable; its correctness is not machine-checked and must be asserted, reviewed, and
recorded in `PROVENANCE.md` in the estate's existing Supports / Does-not-support form.

**Not trusted, because it is checked:** the *generator*. If the generator emits ill-typed Lean, the
build fails. If it emits a carrier whose constructor set disagrees with `inventory.json`, the P2
Shape B correspondence artifacts fail to elaborate — a missing constructor is a type ascription
error, an extra constructor is a `Missing cases:` error, both **measured**. If it emits a false
theorem, the kernel rejects it. If it emits code that drifts from what the committed JSON implies,
`git diff --exit-code` fails.

**Checked by the kernel:** the carrier's well-formedness and strict positivity; every instance's
type-correctness; every theorem in the obligation set; the correspondence artifacts; the value of
every emitted fixture.

**Checked by the axiom gate:** that no exported theorem depends on anything outside
`[propext, Quot.sound, Classical.choice]`.

**Checked by a new gate this survey recommends adding:** that no constant in the artifact's
namespaces is `opaque` or `unsafe` or carries `@[implemented_by]` / `@[extern]`. `#print axioms`
cannot see any of these, and `deriving` will introduce the first one by accident the moment
someone adds a `deriving Repr` to a mutual carrier.

**Explicitly not claimed:** nothing here is a claim about the Effect runtime, the TypeScript
compiler, a JavaScript host, or the semantics of the pinned source beyond its *shape*. The
correspondence theorem says the Lean constructor table matches the extracted inventory. It does
not say the inventory is meaningful, and it does not say Schema Core means what Effect Schema
means.

### The first three build steps

**Step 1 — Resolve R-5 (object-field ordering), then fix the carrier shape.** The nested-versus-mutual
decision in §4 turns on whether canonicalisation needs `List.Perm`/`Sorted` machinery. Default
recommendation, absent that ruling: the **mutual, monomorphic** shape (`SchemaCore` /
`FieldList` / `SchemaList`), because `induction` works on it and the canonicalisation obligations
are inductions. Deliverable: a hand-written `Schema/Core.lean` that builds, with `deriving
DecidableEq`, `instance : BEq _ := instBEqOfDecidableEq`, and a mutual serializer with
`termination_by structural` — no derived `Repr`, `Ord`, `ToJson`, or `FromJson` anywhere. Confirm
`#print axioms` is clean and no constant is `opaque`.

**Step 2 — Stand up `mise run gen` end to end on a deliberately small inventory.** Extractor →
`inventory.json` → generator → the Step 1 file, regenerated byte-identically.

One finding that shortens this step: the pinned source in `.staging/e2/src-cache/` is the
**Effect 4** rewrite, and it already ships `SchemaRepresentation.ts` (1,334 lines) plus
`internal/schema/toRepresentation.ts` and `fromRepresentation.ts` — a purpose-built,
**round-trippable** JSON representation of the AST (`toRepresentation`, `toJson`, `fromJson`,
with a `Reference` node so cycles serialise). Effect 3 had only a lossy debug `toJSON()` and no
`fromJSON`, which would have forced the extractor to be a hand-written `AST.getCompiler` fold.
**Judgment: build the extractor on `toRepresentation` rather than a bespoke fold** — it is the
library's own sanctioned serialisation, it round-trips (so the extractor can self-check), and it
keeps the trusted component small, which matters because the extractor is the *only* trusted
component in §6's trust statement. Verify first that it covers everything the inventory needs
(variant names, field names, field kinds); it is designed for representation, not for shape
reflection.

Wire `git diff --exit-code` into `mise run check` (it is already there; it currently guards nothing).
Then prove the gate works by breaking it three ways: hand-edit a generated `.lean` (diff fails),
change the JSON without regenerating (diff fails), and add a constructor to the JSON and
regenerate (correspondence artifacts must fail to elaborate before the diff even runs). Adopt the
Aeneas banner on line 1 and diff the whole generated directory, not a path list.

**Step 3 — Add the P2 Shape B correspondence file and the `opaque`/`unsafe` scan.** Both are
small and both close holes that nothing else covers. Shape B is generated text with no
metaprogram; the scan is a ~15-line `run_cmd` over `getEnv` asserting that every constant in the
artifact's namespaces is `defnInfo`, `thmInfo`, `inductInfo`, `ctorInfo`, or `recInfo`, and none is
`unsafe`. Record both in `PROVENANCE.md` as gates, with what they do and do not support.

**Deferred, deliberately:** Qq (declined), Batteries (declined), custom attributes (no documented
API, nothing needs one), `addDecl`-based inductive construction (rejected in §1.2),
elaboration-time JSON reading (disqualified in §3 P1), the reflective fixed point (§3 P4 — real,
but wants `validAt` first), and any use of `native_decide` (banned; note the detection method
changed in v4.29.0).

---

## Appendix — evidence index

**Local toolchain source** (`~/.elan/toolchains/leanprover--lean4---v4.33.1/src/lean/`):
`Lean/Elab/Deriving/Basic.lean:276-292` (handler API), `DecEq.lean:23,186-191,209-212`,
`Util.lean:103-122,175` (`mkContext`, `usePartial`, `mkHeader`), `Repr.lean:98-105`,
`BEq.lean:191-196`, `Ord.lean:145-166`, `Hashable.lean:67-73`, `ToExpr.lean:159-170`,
`FromToJson.lean:175-202`, `LawfulBEq.lean:23`, `ReflBEq.lean:23`;
`Lean/Elab/PreDefinition/Main.lean:20-36` (`partial` → `opaque`);
`Lean/Util/CollectAxioms.lean` (axiom traversal);
`Lean/Elab/MutualInductive.lean:1542-1556` (`mkAuxConstructions`);
`Lean/Elab/Tactic/Induction.lean:836-837`; `Lean/Meta/WHNF.lean:509-526,1054-1076`;
`Lean/ToExpr.lean:1-45`; `Lean/Elab/Command.lean:486,731,774`;
`Lean/Environment.lean:1516,1740`; `Lean/Parser/Command.lean:859-862`;
`Init/Tactics.lean:1381-1489` (`DecideConfig`, `decide`, `native_decide`), `:2391,2408`
(`cbv`, `decide_cbv`); `Init/Core.lean:2423-2449` (`ofReduceBool`/`ofReduceNat`, deprecated);
`Init/Prelude.lean:3537-3547` (`String` as `ByteArray`).

**Kernel C++** (lean4 checkout at tag `v4.33.1`, commit `819816b`, matching the toolchain):
`src/kernel/type_checker.cpp:300-330` (`check_nat_size`, `LEAN_NAT_MAX_SIZE`), `:702-732`
(`reduce_nat`, the fifteen accelerated operations); `src/kernel/inductive.cpp`
(`nat_lit_to_constructor`, `string_lit_to_constructor`).

**Estate** (`/Users/pooks/Dev/foldlab/`): `mise.toml` (gen/check tasks),
`formal/fips202/PROVENANCE.md` (house form for the trust statement),
`formal/fips202/TOOLING-NOTES.md` (gate edge cases — axiom-report format drift, silent checkers,
"a clean `git status` is not a clean state"), `formal/fips202/Sha3/Kats.lean` (the `rfl`
calibration point, `maxRecDepth 8000000`), `.staging/e2/entity-store-kickoff.md` §5 (the
`SchemaCore` shape this survey tested), `.staging/e2/src-cache/SchemaAST.ts` (the pinned surface —
4,417 lines; note it is the **Effect 4** rewrite, with `Objects`/`Arrays`/`Filter`/`Link`, not
Effect 3's `TypeLiteral`/`TupleType`/`Refinement`).

**Documentation:** reference manual pinned at `https://lean-lang.org/doc/reference/4.33.0/`
(`/latest/` is 4.34.0-rc2; `/4.33.1/` is mislabeled 4.34.0-rc1); release notes at
`https://lean-lang.org/doc/reference/latest/releases/` (the `RELEASES.md` file is a stub);
`ValidatingProofs/` for the TCB ladder; `The--grind--tactic/` §16;
`https://leanprover-community.github.io/lean4-metaprogramming-book/` (no deriving or attributes
chapter); Morrison & de Moura, *"grind: An SMT-Inspired Tactic for Lean 4"*, IJCAR 2026,
DOI `10.1007/978-3-032-32589-1_7`.

**Precedent:** `AeneasVerif/aeneas` (`tests/README.md`, `flake.nix` `aeneas-tests`),
`AeneasVerif/charon` (`charon-ml/src/generated/`, `check-generated-asts`),
`leanprover-community/mathlib4` (`scripts/mk_all.lean --check`),
`leanprover/lean-action` (`mk_all-check`, `leanchecker`, `axiom-audit`, `nanoda` inputs),
`leanprover/lean4checker` (archived; now `leanchecker`, bundled since v4.28.0),
`digama0/lean4lean` (`divergences.md`, `Lean4Lean/Primitive.lean`).

**Provenance note:** the two web-research streams that fed §1.1, §2.c, §2.d, and §5 reported one
page containing text addressed to AI coding assistants (`AeneasVerif/charon/blob/main/AGENTS.md`,
concerning diff size and commit policy). It was read as evidence of repository practice only and
not followed. No other fetched page contained AI-directed text.
