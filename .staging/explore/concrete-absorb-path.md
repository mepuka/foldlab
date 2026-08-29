# Concrete, absorbed — a guided reading path

Date: 2026-08-24. Written for you, first-hand from the pinned clone at
`C:\Users\kokok\Dev\foldlab\.reference\clones\concrete` @ `28a25a4` and from the eight-post
blog series at federicocarrone.com.

**Posture: absorb, then diverge.** The lab has dropped Concrete as a commitment. It is now prior
art — the closest existing thing to what the lab's own spine wants to be, built by someone who
already made every decision you are about to face and wrote down why. This document exists so you
can walk their path in a few weeks instead of rediscovering it over months, and so that when you
choose differently you know exactly what you are choosing against.

Nothing here prescribes a lab decision. Section 4 lays out fork points; you rule on them.

**A note on how to read the code.** Concrete's compiler is written in Lean 4 — the same language
its proofs are written in. That is the whole trick, and it is worth internalizing before you open
a file: there is no "compiler in C++, proofs in Coq" gap to bridge, because the compiler's
intermediate representation is an ordinary Lean inductive type, and a theorem about a program is
an ordinary Lean theorem about a value of that type. If you are coming from TypeScript, read Lean
`inductive` as a discriminated union, `structure` as an interface/record, and `def` as a function.
The type-level machinery you will find intimidating (`BitVec 32`, dependent hypotheses like
`(hk : k < 16)`) is concentrated in the *proof* files, not the compiler files. The compiler files
read a lot like ordinary functional TypeScript.

**Scale, so you can calibrate.** The compiler library is 64 Lean files totalling about 48,000
lines. The proof corpus is a separate Lake library of 9 files, about 4,000 lines, holding **240
theorems**. There are **zero external package dependencies** — no Mathlib, nothing (receipt:
`lake-manifest.json` has `"packages": []`). Everything, including a from-scratch SHA-256
specification, is built on Lean core. That fact alone is worth a long think; it shows up again in
Section 4.

---

## 1. The series, mapped

Eight published episodes plus a living spec page. Read them in publication order — the argument is
cumulative, and episode 4 (the proof episode, the one you linked) does not land properly without
episodes 1 and 3 underneath it.

Total reading time for the eight posts as marked by the site: **84 minutes**. Add the spec page
(~30 minutes as a skim, more as a reference) and you are at roughly two hours of prose for the
whole series.

### Episode 1 — Why Concrete Exists
`https://federicocarrone.com/series/concrete/the-concrete-programming-language-systems-programming-for-formal-reasoning/`
2025-12-26 · ~2,000 words · **8 min**

**Summary.** Carrone argues that systems languages force a choice between being expressive enough
for real software and being simple enough that the compiler can explain what a program actually
does, and that everyone has been choosing expressiveness. Concrete takes the other branch: effects
appear in signatures as capabilities (`with(File)`, `with(Alloc)`), ownership is linear so every
value is consumed exactly once with cleanup written out by hand, and anything that hides control
flow — implicit destructors, operator overloading, exceptions, closures with invisible captures —
is simply removed from the language. The payoff he claims is not safety per se but *legibility*:
a compiler that can hand you structured facts about authority, allocation, and proof surface
rather than a pass/fail verdict.

**Repo correspondence.**
- The capability vocabulary: `Concrete\Frontend\AST.lean:10-60` (`CapSet`, `stdCaps`, `validCaps`),
  `Concrete\Semantics\Capabilities.lean` (151 lines, the judgment).
- The anti-features list, written down as policy: `docs\ANTI_FEATURES.md`, `docs\DESIGN_POLICY.md`.
- Linearity enforcement: `Concrete\Check\Check.lean:29` (`UseMode`), `:1979` (`checkFn`).

**Comprehension checkpoints.**
1. Name three things Concrete removed from the language, and say for each what compiler fact
   becomes computable *because* it was removed.
2. What is the difference between a capability and an effect as the post uses the terms — and why
   does putting it in the signature rather than inferring it matter for an auditor?
3. Linear versus affine ownership: what does linear buy that Rust's affine model does not?

---

### Episode 2 — The Rust Effects Debate and Concrete's Case for a Smaller Language
`https://federicocarrone.com/series/concrete/rusts-grand-vision-and-concretes-answer/`
2026-03-09 · ~1,800 words · **9 min**

**Summary.** A response to Yosh Wuyts's "A Grand Vision for Rust," which diagnosed Rust's
accumulating "function colors" — async, const, fallible, generator — as a symptom of effects that
were never unified. Carrone accepts the diagnosis and rejects the cure: you do not retrofit an
effect system onto a language that grew around its absence, you start one that has it from the
first day. He also plants a flag against refinement types, on the grounds that encoding facts into
types makes code harder for a human to read, which defeats the legibility goal that motivated the
whole project.

This is the post that tells you what Concrete is *not* trying to be, and it is the cheapest
inoculation against a common misreading (that Concrete is a proof-oriented Rust).

**Repo correspondence.**
- No refinement types anywhere; contracts are separate attributes on functions, not type
  refinements — see `Concrete\Frontend\AST.lean:341` (`FnDef`, which carries `requires`/`ensures`
  clause lists alongside the ordinary signature) and `docs\CONTRACTS_AND_VCS.md`.
- The LL(1) grammar constraint: `grammar\concrete.ebnf`, enforced by `scripts\check_ll1.py`.
- Linearity as *linear*, not affine: `docs\KNOWN_HOLES.md` H6/H9 and the gates
  `scripts\tests\check_linear_discard.sh`, `check_linear_conservation.sh`.

**Comprehension checkpoints.**
1. Restate Wuyts's "function colors" problem in one sentence, then state Carrone's objection to
   solving it inside Rust.
2. Why does Carrone reject refinement types, and what does Concrete use instead to say
   "this argument must be under 312"?
3. What does an LL(1) grammar have to do with a language's proof story? (Hint: it is not about
   proofs directly.)

---

### Episode 3 — Designing a Programming Language for the AI Era
`https://federicocarrone.com/series/concrete/the-ai-training-data-trap-for-programming-languages-has-an-exit/`
2026-03-11 · ~1,800 words · **8 min**

**Summary.** Edgar Luque had argued that AI creates a closed loop that kills new languages: no
training data means no model support means no adoption means no training data. Carrone's exit is
to design a language with almost no *tacit* knowledge — everything a programmer would normally
learn by osmosis is instead stated in the grammar, the types, and the capability annotations, so a
specification is enough for a model to write correct code without a large corpus. The second half
of the exit is the feedback loop: precise, deterministic compiler errors turn generation into a
generate-check-repair cycle that converges, where a language with silent runtime failures does not.

For the lab this is the most directly transferable episode, because it is the argument that
machine-legibility is a *language design* property rather than a tooling afterthought.

**Repo correspondence.**
- Deterministic diagnostic codes: `Concrete\Check\CheckError.lean` (486 lines), gated by
  `scripts\tests\check_diagnostic_codes_complete.sh`.
- Machine-readable everything: `Concrete\Report\Json.lean`, `Concrete\Report\CompilerLedger.lean`.
- The `--trace-pipeline` and `--emit-trace-json` surfaces named in `Main.lean` (help text ~line 70).

**Comprehension checkpoints.**
1. State the training-data trap and state the exit, each in one sentence.
2. What property must a compiler error have for a generate-check-repair loop to converge, and
   which Concrete design decisions produce that property?
3. Where would this argument fail — what kind of language feature would break the loop?

---

### Episode 4 — Can I prove Concrete programs in Lean?
`https://federicocarrone.com/series/concrete/proving-systems-code-in-lean/`
2026-03-12 · ~3,500 words · **10 min**

**Summary.** The proof-roadmap episode, and the one you pointed at. It walks the pipeline from
source-level contracts, through extracted proof obligations, to discharge — either by a Lean
decision procedure (`omega` for linear integer arithmetic, `bv_decide` for bitvectors, both of
which produce kernel-checked certificates and therefore add no external solver to the trusted
base) or by a hand-written Lean refinement theorem. The load-bearing structural claim is that
because the compiler's Core IR is *already* a Lean datatype, there is no translation step of the
kind that VST (C into Coq) or Verus (modelling unsafe Rust) must justify. The rest of the post is
about honesty machinery: evidence classes that keep `proved`, `assumed`, `trusted`, and
`not done yet` from collapsing into one checkmark, and body fingerprints so that editing a proved
function downgrades it to `stale` instead of silently keeping its badge.

It is also unusually candid about the boundary. There is no verified lowering from Core through
SSA to LLVM to machine code; FFI is axiomatized; mutable heap and concurrency are deferred. In his
words, on the scope of what is proved:

> "The proof boundary is not 'the whole compiler is now a theorem.'"
> — Federico Carrone, *Can I prove Concrete programs in Lean?*

**Repo correspondence.** This post is essentially a prose rendering of:
- `Concrete\Proof\ProofCore.lean` (2,743 lines) — extraction, eligibility, obligations, fingerprints.
- `Concrete\Proof\Proof.lean` (3,094 lines) — the `PExpr` proof-side term language and its `eval`.
- `Concrete\Proof\ProofSoundness.lean` (1,204 lines) — the extraction-preservation theorems (R-01…R-20).
- `proofs\Examples\HmacSha256\Proofs.lean` (2,618 lines, 178 theorems) — the flagship.
- `examples\hmac_sha256\src\main.con` — the source with `#[requires]`, `#[spec]`, `#[proof_by]`,
  `#[proof_coverage]` attributes attached (see lines 336-339 for a complete four-attribute stack).
- `docs\EVIDENCE_CLASSES.md`, `docs\PROOF_LADDER.md`, `docs\CONTRACTS_AND_VCS.md`.

**Comprehension checkpoints.**
1. Trace one obligation end to end: a `#[requires(...)]` clause in `main.con` → what ProofCore
   turns it into → how it gets discharged → what report shows the verdict.
2. Why does "the Core IR is already Lean data" remove a soundness obligation that VST and Verus
   must discharge — and what obligation does it *not* remove?
3. What exactly is a body fingerprint protecting against, and what is the failure mode if a
   fingerprint is missing rather than wrong?

---

### Episode 5 — When the Compiler Is the Oracle
`https://federicocarrone.com/series/concrete/when-the-compiler-is-the-oracle/`
2026-03-20 · ~3,500 words · **19 min**

**Summary.** The compiler stops being a gate and becomes a queryable source of truth: `--report
eligibility` says which functions are proof-eligible and why the others are not, `--report alloc`
names allocation and cleanup sites, `--report authority` gives transitive capability chains with
the call path that explains each one. The demonstration is an experiment in which an AI agent
improved a 719-line JSON parser using *only* compiler reports as the fitness signal — no
profiler, no benchmark — raising proof-eligible functions from 51.9% to 62.9% and removing
unnecessary allocations, by extracting pure logic out of effectful functions. The philosophical
punchline is that auditability and optimizability turn out to be the same property seen from two
directions.

This episode matters to the lab out of proportion to its subject, because it is a worked example
of "deterministic compiler facts as an agent's fitness function" — which is the same shape as the
lab's own interest in agent-mediated workflows over a machine-legible substrate.

**Repo correspondence.**
- Report dispatch: `Main.lean:1179-1290` (`contracts`, `caps`, `eligibility`, `proof-status`,
  `obligations`, `proof-deps`, `check-proofs`, …).
- Eligibility computation: `Concrete\Proof\ProofCore.lean:1386` (`ExclusionKind`), `:1392`
  (`EligibilityEntry`), `:2451` (`extractProofCore`).
- The JSON parser under test: `examples\json\`.
- Determinism gates: `scripts\tests\test_determinism.sh`, `check_pass_hashes.sh`.

**Comprehension checkpoints.**
1. Name three reports and, for each, the compiler pass that must have already run to produce it.
2. Why can Rust's compiler not answer "does this function allocate?" the way Concrete's can?
3. In the JSON experiment, what was the agent's actual objective function, and what stopped it
   from gaming it?

---

### Episode 6 — What Concrete Makes Worse
`https://federicocarrone.com/series/concrete/what-concrete-makes-worse/`
2026-03-24 · ~2,100 words · **8 min**

**Summary.** A deliberate accounting of the costs. Linear ownership with no implicit destructors
means a file-processing function that needs zero cleanup lines in Rust needs six `defer destroy`
lines in Concrete — half the function is ceremony. Removing implicit closures means map/filter
patterns become explicit function pointers plus explicit context values. And the ecosystem is
young: no package manager, no LSP, an immature formatter, thin standard library. Carrone separates
the two categories honestly — the verbosity is a design consequence he will not trade away, the
ecosystem gaps are a maturity problem — and argues you cannot get the reports without paying the
verbosity, because they come from the same source.

Read this immediately after episode 5. Episode 5 is the strongest sales pitch in the series and
episode 6 is the invoice; taking them as a pair is how you get a calibrated view.

**Repo correspondence.**
- `docs\ANTI_FEATURES.md` — the removals, as policy with rationale.
- `docs\DEFER.md`, `examples\defer\` — the cleanup ceremony in practice.
- `docs\KNOWN_HOLES.md` — where the design is not yet enforced.
- `docs\bugs\` — 63 numbered bug documents; browse the titles for an honest read on maturity.

**Comprehension checkpoints.**
1. Separate the post's complaints into "consequence of the design" and "not built yet." Which
   list is longer, and which one would worry you more if you were adopting it?
2. What exactly does `defer destroy` do, and why can't the compiler insert it for you given that
   it clearly knows where the value dies?
3. If you had to buy back one convenience without losing the reports, which would you pick?

---

### Episode 7 — A Fact-Producing Compiler
`https://federicocarrone.com/series/concrete/a-fact-producing-compiler/`
2026-04-09 · ~1,500 words · **6 min**

**Summary.** The generalization of episode 5: the compiler's output should be a structured fact
artifact, not prose. Facts cover capabilities, the call chains that explain why an authority is
required, execution shape (direct recursion, mutual cycles, loop boundedness), proof status, and
proof evidence bound to a function name plus a body fingerprint. The intended consumers are review
tools, CI, and agents reading the same artifact. The concrete use case is supply chain: when a
dependency is bumped, ask whether it added a path to `File`, `Network`, or `Env`, and get a
machine-checked answer rather than a diff review. Carrone contrasts this with tree-sitter-based
fact extraction (Dmitri Sotnikov's Chiasmus) — syntax can see that `foo` calls `bar`, but only the
compiler knows that `bar` needs `Network`.

The post is forward-looking; the JSON shape it shows is a sketch, not the shipped schema.

**Repo correspondence.**
- `Concrete\Report\CompilerLedger.lean` (165 lines) — the typed non-proof fact store; read
  `docs\COMPILER_PIPELINE.md` alongside it for the intent.
- `Concrete\Proof\ObligationCore.lean` (248 lines) — the proof/evidence ledger it links to.
- `docs\CAPABILITY_FACTS.md`, `docs\COMPILER_API.md`, `docs\PARTIAL_FACTS.md`.
- `Concrete\Report\Json.lean`, `Concrete\Report\Diff.lean` (357 lines — semantic diff).

**Comprehension checkpoints.**
1. What is the difference between `CompilerLedger` and `ObligationCore`, and why are they two
   objects rather than one?
2. Give one fact a tree-sitter pass can produce and one it structurally cannot, using the post's
   own example.
3. What has to be true about a fact artifact for a CI job to fail *closed* on it?

---

### Episode 8 — Nutrition Labels for Trust
`https://federicocarrone.com/series/concrete/nutrition-labels-for-trust/`
2026-06-13 · ~3,100 words · **16 min**

**Summary.** Taking a Vitalik Buterin suggestion — software should ship a full list of its trust
dependencies the way food ships ingredients — and asking what it takes to make such a label
machine-checked rather than vendor prose. Concrete's label has four parts: the capability set
(`File`, `Network`, `Process`, `Console`, `Clock`, `Random`, `Env`, `Alloc`, `Unsafe`), every
declared trust boundary, the evidence class of each obligation (`proved_by_lean`,
`proved_by_kernel_decision`, `assumed`, `tested_by_oracle`, `stale`, `unproven`), and the trusted
computing base all the way down through the Lean kernel, LLVM, runtime, OS, and hardware. The
design rule throughout is that the label never collapses distinctions into a single checkmark and
prefers admitting ignorance to giving a comforting answer. The supply-chain extension is bounded
imports — a ceiling on what capabilities a dependency may acquire and a floor on what evidence it
must carry — so that a build fails closed when a dependency's authority escalates or its evidence
degrades between versions.

**Repo correspondence.**
- `docs\EVIDENCE_CLASSES.md` — the shipped catalog, with the command that displays each class.
- `docs\TRUST_LABEL.md` / `docs\SAFETY.md` / `docs\AXIOMS.md` — the TCB accounting.
- `examples\evidence_classes\` — one minimal example per class, deliberately kept free of
  flagship-scale noise.
- `Concrete\Check\Policy.lean` (270 lines) + `scripts\tests\check_policy.sh` — the fail-closed
  budget machinery.

**Comprehension checkpoints.**
1. List the four sections of a trust label and say which compiler pass supplies each.
2. What is the difference between `assumed` and `trusted` in this vocabulary, and why is keeping
   them apart worth the extra column?
3. What would a "ceiling" and a "floor" on an import look like as a concrete build failure?

---

### The Spec page (reference, not an episode)
`https://federicocarrone.com/series/concrete/spec/`

A living language overview in 13 sections: design principles, the 14-pass compilation pipeline,
the type system, linearity, borrowing (lexically scoped blocks, no lifetime parameters),
capabilities, contracts and proofs, and an explicit anti-features list. It is a hybrid — the early
sections reward linear reading because they set up the constraints the later ones obey, but the
type and grammar sections are lookup material.

Treat it as your dictionary while you read the code. Its repo counterparts are
`grammar\concrete.ebnf` (the actual grammar) and the `docs\book\src\language\` chapter set, which
is the same material at tutorial pace.

---

## 2. The architecture tour, keyed to the reading path

The shipped pipeline, as the repo states it (`docs\ARCHITECTURE.md`, "Current Pipeline"):

```
Source → Parse → Resolve → Check → Elab → CoreCanonicalize → CoreCheck
       → Mono → Lower → SSAVerify → SSACleanup → EmitSSA → clang
```

and, branching off after `CoreCheck`, a second path that never rejoins:

```
ValidatedCore → extractProofCore → obligations → discharge → reports/evidence
```

Everything below is read first-hand from the pin. Paths are relative to
`C:\Users\kokok\Dev\foldlab\.reference\clones\concrete`. Line counts are
`(Get-Content …).Count`.

There is one thing to notice before the table: the two paths *deliberately do not rejoin*. The
backend path lowers Core to SSA to LLVM to a binary; the proof path extracts Core into a separate
proof-side term language and reasons about that. Nothing proves the two agree. That gap is
Concrete's central unproved seam and Section 3 returns to it.

### Stage 0 — Tokens
**Entry:** `Concrete\Frontend\Token.lean` — **141 lines**, no imports at all.
**Load-bearing definitions:** `TokenKind` (line 3, the full terminal alphabet), `Span`
(line 45 — `line`, `col`, `endLine`, `endCol`), `Token` (line 52).
**Look at this first:** `TokenKind` at line 3. It is one screen, and it *is* the language's
vocabulary. Reading it takes ninety seconds and gives you a complete inventory of what Concrete can
say — including, by absence, what it deliberately cannot.

### Stage 1 — Lexing
**Entry:** `Concrete\Frontend\Lexer.lean` — **421 lines**.
**Load-bearing:** `LexerState` (line 5), `lookupKeyword` (line 36 — the reserved-word table),
`lexToken` (line 315), `tokenize` (line 400), `floatOfDecimalMantissa` (line 147).
**Look at this first:** `tokenize` at line 400. Nine lines. It is a straight fold from a `String`
to a `List Token`, with no monad and no error channel — lexing cannot fail, which is itself a
design statement.

### Stage 2 — Parsing
**Entry:** `Concrete\Frontend\Parser.lean` — **2,444 lines**, the second-largest frontend file.
**Load-bearing:** `ParserState` (line 28), `ParseM := ExceptT Diagnostics (StateM ParserState)`
(line 40 — the parser is a straightforward state-plus-error monad; if you know Effect, this is
`Effect<A, Diagnostics, ParserState>` in spirit), `peek`/`peek2` (lines 50, 68 — **the LL(1)
budget, visible in the API**), `binOpPrec` (line 810, the precedence table), `parseFnDef`
(line 1840), `parseAttribute` (line 1579).
**Look at this first:** `peek2` at line 68. The existence of exactly one two-token lookahead
helper, and no `peek3`, is the LL(1) claim from episode 3 made mechanical. Then read
`parseAttribute` at 1579 to see where `#[requires]`, `#[spec]`, `#[proof_by]`, and
`#[proof_fingerprint]` enter the language — the proof story starts *in the parser*.

### Stage 3 — Surface AST
**Entry:** `Concrete\Frontend\AST.lean` — **671 lines**.
**Load-bearing:** `CapSet` (line 10 — 4 constructors), `Ty` (line 62 — **27 constructors**),
`BinOp` (line 120 — 24), `UnaryOp` (line 143 — 3), `Expr` (line 153), `MatchArm` (line 186),
`Stmt` (line 192), `FnDef` (line 341), `SourceProofLink` (line 333), `LoopContract` (line 320),
`Module` (line 444).
**Look at this first:** `FnDef` at line 341. This one structure carries the signature, the
capability set, the contract clauses, *and* the proof link — the whole "evidence in the source
text" idea in one record. Compare it to `CFnDef` in the next stage to see exactly what elaboration
keeps and what it throws away.

### Stage 4 — Resolve and Check
**Entries:** `Concrete\Resolve\Resolve.lean` (662), `Concrete\Resolve\Intrinsic.lean` (352),
`Concrete\Check\Check.lean` (**2,285**), plus `CheckError.lean` (486) and `CheckHelpers.lean` (881).
**Load-bearing:** `UseMode` (`Check.lean:29` — the linearity discipline in one enum),
`checkExpr` (`:68`), `checkStmt` (`:1391`), `mergeVarStates` (`:1914` — how linearity survives
branching), `checkNoBranchConsumption` (`:1952`), `checkFn` (`:1979`), `checkProgram` (`:2250`).
**Look at this first:** `mergeVarStates` at `Check.lean:1914`. Linearity is easy in a straight
line and hard at a join point; this function is where "exactly once" is actually decided, and it
is the honest heart of the ownership model. `CheckError.lean` is worth a skim right after — every
diagnostic has a stable code, which is the machine-legibility claim from episode 3 in mechanical
form.

### Stage 5 — Elaboration into Core IR
**Entry:** `Concrete\Elab\Elab.lean` — **1,942 lines**. Target: `Concrete\Elab\Core.lean` — **421**.
**Load-bearing in Elab:** `ElabEnv` (line 23), `ElabM` (line 54), `elabExpr` (line 343),
`elabStmt` (line 1105), `elabFn` (line 1388), `renameFnExpr`/`renameFnStmt` (lines 1457, 1516 —
**this is the alpha-renaming pass that later makes fingerprints fragile**).
**Load-bearing in Core:** `Callee` (line 40, 2 ctors), `CExpr` (line 72, **23 ctors**),
`CMatchArm` (line 100, 4), `CStmt` (line 106, **13**), `CFnDef` (line 130), `CModule` (line 188),
`CExpr.ty` (line 214 — every Core expression knows its own type).
**Look at this first:** `CStmt` at `Core.lean:106`. Thirteen constructors is the entire statement
language after desugaring, and reading them tells you what "desugared" actually bought. Note
`letDecl (name : String)` at line 107 and `borrowIn (var : String) (ref : String) (region :
String)` at line 122: **binders are raw strings carrying surface names, and there are no de Bruijn
indices anywhere in this file.** That single representational choice is the source of most of
Section 4's divergence discussion.

Then `Concrete\Elab\CoreCanonicalize.lean` (**167 lines**, `canonicalizeProgram` at line 164)
runs a Core→Core normalization: wildcard match arms sorted last, struct-literal fields reordered
to declaration order, `Ty.generic "Heap" [t]` folded to `Ty.heap t`. A small, readable file, and
the closest thing in the codebase to a canonical form — read it as a study in how far normalization
was taken and where it stopped.

`Concrete\Check\CoreCheck.lean` (**991 lines**, `ccCheckExpr` at line 305) then re-validates the
Core IR. Passing it is what constructs `ValidatedCore` (`Pipeline\Pipeline.lean`, "the
proof-oriented artifact boundary" in its own doc comment) — the single type that both downstream
paths consume.

### Stage 6 — Monomorphization, Lowering, SSA
**Entries:** `Concrete\IR\Mono.lean` (**1,199**), `Concrete\IR\Lower.lean` (**2,353**),
`Concrete\IR\SSA.lean` (**259**), `SSAVerify.lean` (**547**), `SSACleanup.lean` (**749**).
**Load-bearing:** `monoProgram` (`Mono.lean:1157`), `LowerState` (`Lower.lean:57`), `LowerM`
(`:87`), `lowerExpr` (`:738`), `lowerStmt` (`:1748`), `lowerFn` (`:2169`), `lowerModule` (`:2285`);
`SVal`/`SInst`/`STerm`/`SBlock`/`SFnDef` (`SSA.lean:16, 57, 73, 83, 89`); `ssaVerifyProgram`
(`SSAVerify.lean:541`).
**Look at this first:** `SSA.lean` in full — it is 259 lines and it is the smallest complete IR
in the repo. `SInst` at line 57 and `STerm` at line 73 give you the entire target machine model in
two enums. Read it before `Lower.lean`, so the 2,353-line lowering has a destination you already
understand.

### Stage 7 — Codegen
**Entry:** `Concrete\Backend\EmitSSA.lean` — **1,753 lines**; also `EmitBuiltins.lean` (875),
`EmitLLVM.lean` (203), `LLVM.lean` (187), `Backend.lean` (120).
**Load-bearing:** `EmitSSAState` (line 27), `tyToLLVMTy` (line 164), `emitSModule` (line 1370),
`emitSSAProgram` (line 1641). Output is LLVM IR text handed to `clang`.
**Look at this first:** `emitSSAProgram` at line 1641. It is the last function in the compiler
proper, and reading its signature — `List SModule → String` — makes the trust boundary vivid: from
here on, everything is `clang`'s problem and no Concrete theorem reaches it.

There is also a reference interpreter, `Concrete\Interp\Interp.lean` (**1,199 lines**, `IVal` at
line 53), which executes Core directly. It is used as a differential oracle against the compiled
binary — testing, not proving, but it is how the backend gap gets *evidence* even though it has
no proof.

### Stage 8 — The proof path
**Entries:** `Concrete\Proof\ProofCore.lean` (**2,743**), `Proof.lean` (**3,094**),
`ProofSoundness.lean` (**1,204**), `ObligationCore.lean` (248), `Sha256Spec.lean` (214);
`ProofKit\` (6 files, ~450 lines of reusable lemmas).
**Load-bearing in ProofCore:** `EligibilityEntry` (line 1392), `ExclusionKind` (line 1386),
`ProofRegistryEntry` (line 1431), `SpecAttachment` (line 1475), `ObligationStatus` (line 1520),
`Obligation` (line 1589), `ProofDiagnosticKind` (line 1617), `ProofCore` (line 1785),
`stripAlpha` (line 489), `bodyFingerprint` (line 554), `shortHash` (line 1879),
`extractProofCore` (line 2451).
**Load-bearing in Proof.lean:** `PExpr` (line 204 — the proof-side term language, *separate from*
`CExpr`), `PVal` (line 166), `Env := String → Option PVal` (line 398), `FnTable` (line 409),
`SourceBodyDigest` (line 317), `pexprCanonical` (line 512), and the `eval` function everything is
stated against.
**Look at this first:** `extractProofCore` at `ProofCore.lean:2451`. It is 30 lines and it is the
entire proof pipeline in miniature: build the call graph, find strongly connected components,
classify recursion, extract each module into eligible and excluded entries, generate obligations,
validate the registry, emit diagnostics. Every report in episode 5 is a projection of the record
it returns.

### Stage 9 — Reports and evidence
**Entries:** `Concrete\Report\Report.lean` (**4,802 lines — the largest file in the repo**),
`ReportObligations.lean` (1,196), `ReportVC.lean` (873), `ReportInterface.lean` (441),
`ReportBase.lean` (241), `CompilerLedger.lean` (165), `Diff.lean` (357), `Json.lean` (183),
`DebugBundle.lean` (312), `Reduce.lean` (427).
**Load-bearing:** `sourceBodyDigestV1` (`Report.lean:1560`), `coreFnFingerprints`
(`ReportVC.lean:162`), `synthesizeSourceLinks` (`ReportVC.lean:187`).
**Dispatch:** `Main.lean:1179-1290` — the `if reportType == "…"` chain is the actual list of what
the compiler will tell you.
**Look at this first:** `Main.lean:1179` onward. Read the dispatch chain as a menu before you read
any report implementation; it is the fastest way to see the surface area of episode 5's oracle
claim, and it is 100 lines rather than 4,802.

### Reading-order recommendation

Do not read the pipeline in pipeline order. Read it **outside-in**:
`Token.lean` → `Core.lean` → `SSA.lean` (the three data models, ~820 lines total) →
`Main.lean` dispatch (the surface) → then, and only then, the transformation files that connect
them. The data models are small and stable; the transformations are large and are only legible
once you know both of their endpoints.

---

## 3. What the creator actually proved, and how

This section is the one to read slowly. The blog series is honest but it is still a sales document;
the repo is where the ledger is. My summary: **the theorem base is real and substantial, the
statements are the right shape, and the machinery that binds a theorem to a program is where the
defects live.** All three of those are separately important to you.

### 3.1 The theorem inventory (counted from the pin)

**364 theorems total**, in two libraries with two different jobs.

| Library | File | Lines | Theorems |
|---|---|---|---|
| `Examples` (flagship correctness) | `proofs\Examples\HmacSha256\Proofs.lean` | 2,618 | **178** |
| | `proofs\Examples\PureCore\Proofs.lean` | 399 | 18 |
| | `proofs\Examples\ProofPatterns\Proofs.lean` | 202 | 10 |
| | `proofs\Examples\ParseValidate\Proofs.lean` | 201 | 7 |
| | `proofs\Examples\ConstantTimeTag\Proofs.lean` | 189 | 8 |
| | `proofs\Examples\FixedCapacity\Proofs.lean` | 147 | 5 |
| | `proofs\Examples\CryptoVerify\Proofs.lean` | 131 | 8 |
| | `proofs\Examples\ElfHeader\Proofs.lean` | 71 | 5 |
| | `proofs\Examples\LoopInvariant\Proofs.lean` | 44 | 1 |
| | **subtotal** | **4,002** | **240** |
| `Concrete` (infrastructure) | `Concrete\Proof\ProofSoundness.lean` | 1,204 | **49** |
| | `Concrete\Proof\Proof.lean` | 3,094 | 39 |
| | `Concrete\ProofKit\*` (6 files) | ~450 | 34 |
| | `Report\ReportObligations.lean`, `Proof\ProofCore.lean` | — | 2 |
| | **subtotal** | | **124** |

Two facts about this base that matter more than the count:

- **Zero `sorry`.** `Select-String '\bsorry\b'` over `proofs\` returns 0. The 12 hits in
  `Concrete\` are all *string literals* inside the stub generator (`Report.lean:1578, 1596, 1737,
  2836, 2888, 2890, 2923-2924, 2998, 3128`) — the compiler emits `sorry`-terminated Lean skeletons
  for you to fill in, and takes care never to emit a digest over one.
- **Zero custom axioms** (`^axiom ` returns 0 in both libraries) and **zero external packages**
  (`lake-manifest.json` → `"packages": []`). No Mathlib. The SHA-256 specification the flagship is
  proved against is written from scratch in-repo as `Concrete\Proof\Sha256Spec.lean` (214 lines, a
  transcription of FIPS 180-4, with the "abc" and empty-string NIST test vectors checked at lines
  187 and 193). That is a genuinely unusual choice and Section 4 treats it as a fork point.

### 3.2 Statement style — what a proof here actually looks like

There are three distinct statement styles, and telling them apart is the single most useful thing
you can learn from this codebase.

**(a) Refinement against an independent spec** — the flagship style. Example, the top-level HMAC
theorem `hmac_sha256_refines_spec` at `proofs\Examples\HmacSha256\Proofs.lean:2543` (the SHA-256
one, `sha256_hash_refines_spec`, is at line 2016):

```lean
theorem hmac_sha256_refines_spec (kFn mFn : Nat → BitVec 8) (k_len m_len : Nat)
    (hkl : k_len ≤ 128) (hml : m_len ≤ 256) (e : Env) (fuel : Nat)
    (hkv : e "k" = some (.array_ (arrN 128 kFn)))  -- …and three more binding hypotheses
    : eval shaFns e (fuel + 350 + k_len + m_len) hmac_sha256Expr
      = some (.array_ ((Sha256Spec.hmac …).map (fun b => PVal.int b.toNat)))
```

Read it in plain English: *running the extracted program term under enough fuel, in an environment
where the four parameters are bound to these values, produces exactly what the independent FIPS
specification produces.* Three things are worth noticing. First, `eval … Expr = some (spec …)` is
the universal shape — extraction on the left, specification on the right, propositional equality
in the middle. Second, the environment is threaded as explicit hypotheses (`e "k" = some …`)
because the proof-side `Env` is a plain function `String → Option PVal` (`Proof.lean:398`) — the
binder names appear *in the theorem statement as string literals*, which is exactly the coupling
that Section 4 flags. Third, `fuel` — the interpreter is fuel-bounded so it is a total function,
and every theorem carries a fuel budget; the keystone lemma `eval_fuel_le` (`Proof.lean:3006`)
exists so proofs can pick one large fuel and stop bookkeeping.

**(b) Extraction preservation** — `ProofSoundness.lean`, 49 theorems named `R-01` through `R-20`
plus compositional companions: `lit_int_preservation` (line 163), `var_preservation` (201),
`binop_preservation` (247), `let_preservation` (316), `call_preservation` (480),
`match_preservation` (516), `while_step_preservation` (547). These say that *the extractor*
(the real one, not a model of it) maps a Core construct to the PExpr construct you would expect.
This is the family that partially closes the Core→PExpr seam, construct by construct. It is
partial by construction: 20 rules is not all 23 `CExpr` constructors plus 13 `CStmt` constructors.

**(c) Reusable lemma layer** — `ProofKit\` and the array/loop lemmas in `Proof.lean`:
`lookupIndex_set_self`/`lookupIndex_set_ne`/`length_set` (read-after-write, framing, length),
`eval_while_false`/`eval_while_true` (loop unfolding), `eval_fuel_succ`/`eval_fuel_le`. As
`docs\PROOF_LADDER.md` puts it, the point is to make the next proof "large but systematic" rather
than a heroic one-off. If you write proofs in the lab, this is the layer to imitate first — it is
the difference between a proof corpus that scales and one that does not.

### 3.3 The evidence vocabulary, glossed plainly

Concrete's gate vocabulary is precise but house-specific. Here it is in ordinary words:

| Their term | What it actually means |
|---|---|
| **evidence** | The justification attached to a claim, *plus its kind*. Not "is it true" but "on what basis do you believe it, and how much does that basis cost you in trust." |
| **evidence class** | The kind: `proved_by_lean` (a hand-written theorem the Lean kernel checked), `proved_by_kernel_decision` (`omega` or `bv_decide` closed it automatically and emitted a certificate the kernel re-checked — no external SMT solver joins the trusted base), `assumed` (someone asserted it; it is written down and loud), `trusted` (a declared boundary where proof stops), `tested_by_oracle` (differential testing, not proof), `reported` (surfaced but not proved away), `enforced` (the type system guarantees it). |
| **obligation** | A specific thing that must be discharged: an array index in range, a division with a nonzero divisor, an arithmetic step that does not overflow, a declared postcondition. Generated by `generateObligations` inside `extractProofCore`. |
| **discharge** | Closing an obligation, by any admitted method. The method determines the evidence class. |
| **eligibility** | Whether a function is even *capable* of carrying a proof. Recursion, unbounded loops, and capability use exclude a function (`ExclusionKind`, `ProofCore.lean:1386`). Episode 5's JSON experiment is an agent moving functions across this line. |
| **fingerprint** | A digest of the function body, stored in the source as `#[proof_fingerprint("…")]`. Its only job is to notice that the code changed after the proof was written. |
| **stale** | The stored fingerprint disagrees with the current body: the proof may still be true but it is no longer known to be about *this* code. Demotes `proved`. |
| **unbound** | There is a proof link but no stored fingerprint, so freshness cannot be checked at all. Introduced to contain bug 058 — the point being that "cannot check" must not read as "checked and fine." |
| **receipt** | A record that a specific verification actually ran: which subject, which theorem, which toolchain, what verdict. *Aspirational* on this pin — R-0004 slice 7 ("receipt issuance") is PENDING. Do not read the shipped output as receipt-backed. |
| **subject digest** | The thing evidence is *about* — intended (R-0004 slice 5) to cover identity, full signature, generics, capabilities, normalized body, contracts, and selected spec. Also **unstarted** on this pin. |

The design principle behind the whole vocabulary is worth stating separately, because it is the
part most worth absorbing regardless of what you build: *the tool refuses to collapse different
kinds of justification into one checkmark, and it prefers a loud "I don't know" to a quiet yes.*

### 3.4 The defects, honestly

These are not gotchas — the project filed all of them against itself, in-tree, before fixing them.
That is itself a practice worth copying. But you need them accurately, because they are precisely
the region where the lab's spine would have to do better.

**The fingerprint is a body-only S-expression that embeds binder names.**
`bodyFingerprint` (`ProofCore.lean:554`) is two lines: it serializes the statement list via
`fingerprintExpr`/`fingerprintStmts` (lines 494-552) into a Lisp-like string, and
`shortHash` (line 1879) SHA-256s that string and truncates to **128 bits**. Reading lines 494-552
directly, the encoding emits `(var {stripAlpha name})`, `(let {stripAlpha name} …)`,
`(struct {name} field=…)`, `(fnref {name})` — surface identifiers throughout. `stripAlpha`
(line 489) removes only the *elaborator's* own suffix (`value` → `value.b7`); a human renaming `x`
to `y` moves the digest. And `.borrowIn v r rg m` at line 550 does not even strip. Also note
`(float {v})` at line 496 — `Float` rendered by `toString`, with NaN and `-0.0` unpinned.

**Three filed bugs on that fingerprint, two still open on this pin:**

- **058** — `#[proof_by]` without `#[proof_fingerprint]` could never go stale: the freshness check
  compared the body against itself, so a `proved` badge survived any edit. **CONTAINED** as of
  2026-07-25 by introducing the `unbound` state, which fails closed under `require-proofs` (E0612).
  The full fix awaits the subject digest.
- **059** — **OPEN.** The fingerprint's input is `body` only. The parameter list, return type,
  generics and bounds, and capabilities are never offered to the hash, and the statement walker
  discards the types it does see (`.letDecl name _ _ val` at line 536 drops the declared type and
  mutability). Their own reproducer: changing a function's return type from `i32` to `u32` — which
  changes the value domain and the overflow behaviour of every arithmetic step — leaves the status
  at `proved`.
- **060** — **OPEN, and the project rates it the most severe of the three.** `#[requires]`,
  `#[ensures]`, and `#[invariant]` are attributes on the declaration, not statements in the body,
  so they never reach the hash. Their reproducer changes `#[ensures(result == 28)]` (true) to
  `#[ensures(result == 999)]` (false) with the body untouched, and the report still says `proved`.
  A function can therefore advertise a *false postcondition* as proved.
- **062** — proof-dependency staleness does not propagate; a stale callee does not stale its callers.

**The flagship's own snapshot admits it is unbound.** This is worth seeing with your own eyes:
`examples\hmac_sha256\snapshot\authority.txt` lines 1-11 are eleven errors, one per proved
function, each reading (their words) that the link "has no stored proof subject … so this claim is
unbound, not proved." All eleven `#[proof_by]` links in `examples\hmac_sha256\src\main.con` carry
no `#[proof_fingerprint]`, and the example's own README (line 99) says so. The 178 HMAC theorems
are real and kernel-checked; what is not established is that they are about the code that ships in
that file today.

**A second, newer digest exists and is explicitly non-authoritative.** `sourceBodyDigestV1`
(`Report.lean:1560`) hashes `pexprCanonical` (`Proof.lean:512-538`), a length-prefixed tagged
encoding built for injectivity — a real improvement in encoding discipline. But it still embeds
binder names (`pexprCanonical (.var n) = lpx "V" n`), and it ships marked
`receiptEligible := false`, `scope := "body_only"`.

**`check-proofs` — what I found by reading it.** The lab's earlier measurement was 0 verified / 11
failed, and `ROADMAP.md` contains two sentences that disagree about whether it is fixed (line 1212
says the workspace-resolution half LANDED; line 1269 still describes the 0/11 symptom). Reading
`Main.lean:1278-1400` first-hand resolves this, and it is worse than a documentation lag — there
are **three independent defects**, and one of them is specific to your machine:

1. **`mktemp` (line 1298).** The scratch file is created by shelling out to `mktemp`, a Unix
   utility. There is no Windows fallback and the exit code is not checked; `tmpPath` is built by
   string-concatenating whatever came back on stdout. **On Windows this fails before Lean is ever
   invoked**, which is the most likely explanation for the lab's 0/11 and is a harness problem, not
   an upstream logic problem. Any lab reproduction should account for this before drawing
   conclusions about upstream.
2. **The workspace fix did land** (lines 1338-1341): resolve the Lake workspace by walking up from
   the *input path*, falling back to the caller's directory only when the input has none. The
   in-code comment explains the original bug exactly — the same file gave "3 verified" from the
   repo root and "0 verified, 3 failed" from `/tmp`, blaming each theorem with `theorem_lookup`
   when in fact the workspace was simply never found.
3. **A residual cwd dependency remains at line 1381**: `IO.FS.readFile ⟨"lean-toolchain"⟩` reads
   the toolchain file *relative to the process working directory*, not relative to the resolved
   workspace `ws` two dozen lines above. Run from anywhere else and it falls into the `catch` and
   reports `Toolchain: unknown` — which is exactly the second half of the symptom `ROADMAP.md:1269`
   describes. The workspace was fixed; the toolchain read next to it was not.
4. **Verdicts are decided by substring matching** (lines 1366-1368): a theorem counts as failed iff
   the combined stdout+stderr contains the literal `` `theoremName` ``. A theorem whose name is a
   substring of another, or any unrelated Lean error that happens to mention the name, misattributes.
   And on a nonzero exit with no attributable failure, *all* theorems are marked failed (1374-1378).

**What is structurally not proved at all.** No verified lowering — nothing connects Core through
Mono, Lower, SSA, EmitSSA, LLVM, and `clang` to the executed binary; that path gets differential
testing against `Concrete\Interp\Interp.lean` as evidence, never proof. FFI and `Unsafe` are
axiomatized at declared boundaries. Mutable heap and concurrency are deferred by design. And the
proof path reasons over `PExpr`, a *separate* term language from `CExpr`; `ProofSoundness.lean`'s
49 theorems close that seam construct-by-construct for about twenty constructs, not exhaustively.

**The project's own fence, quoted from `ROADMAP.md:1311-1313`:** until the R-0004 completion gate
holds, "no task may graduate a new automatically discharged, multi-kernel, certificate-backed, or
otherwise friendly `proved` claim as authoritative." They know. They wrote the fence themselves.
Read the shipped `proved` output accordingly.

---

## 4. Absorb versus diverge

Two lists. Neither is a recommendation — the second one especially is a list of *forks*, places
where Concrete made a choice, the choice has visible consequences in their own bug tracker, and the
lab's stated wants (content-addressing as a first-class layer, alpha-invariant identity, a scripting
surface, proofs attached to a tiny core) point somewhere else. You rule on these.

### 4.1 Worth absorbing

**A1 — Compiler and proofs in one language, with the IR as native prover data.**
*What they did:* the Core IR is an ordinary Lean `inductive` (`Elab\Core.lean:72`), so a theorem
about a program is a theorem about a Lean value. No extraction into a separate prover's syntax, no
model of the language written twice.
*Why:* episode 4 makes this the structural argument against VST (C into Coq) and Verus (modelling
unsafe Rust) — there is no translation whose faithfulness must itself be argued.
*Lab consideration:* this is the strongest single idea in the project and it survives every
divergence below. But note the qualifier they earn honestly: it removes the *translation*
obligation, not the *extraction* obligation. They still have two term languages internally (see D4)
and still had to write 49 preservation theorems to bridge them. If the lab wants "proofs attached
to a tiny core," the question this raises is whether one term language can serve both the compiler
and the prover, which Concrete tried and did not quite achieve.

**A2 — Evidence classes that never collapse into a checkmark.**
*What they did:* `proved` / `enforced` / `reported` / `assumed` / `trusted` as separate, named,
audit-loud classes, with honest negative sub-states (`partial`, `stale`, `unbound`, `missing`,
`blocked`, `not eligible`). `docs\EVIDENCE_CLASSES.md` states the frame as: every construct is one
of those, "never a vague middle."
*Why:* episode 8's nutrition-label argument — a label that collapses distinctions is worse than no
label because it launders trust.
*Lab consideration:* the vocabulary transfers directly and is cheap to adopt. Note also the
self-correction discipline it enabled: when bug 058 showed a link could hold a false `proved`, the
fix was to **mint a new honest state** (`unbound`) rather than widen an existing one.

**A3 — Filing bugs against your own evidence machinery, in-tree, with reproducers, before fixing.**
*What they did:* `docs\bugs\058`, `059`, `060`, `062` are committed documents with symptom, minimal
reproducer, root cause quoting the offending code, and a status line. 059 and 060 are still marked
Open on the pin.
*Why:* `docs\bugs\059` header calls itself "second of R-0004's evidence-integrity defect class" —
they treat wrong evidence as a defect class of its own, distinct from wrong code.
*Lab consideration:* the distinction *wrong code versus wrong evidence* is the useful import. A
verification lab's most dangerous bug is not a miscompilation, it is a true theorem attached to the
wrong subject. Concrete has a name and a docket for that failure mode. Also note the fence at
`ROADMAP.md:1311` — a written rule that no new friendly `proved` claim graduates while the
evidence frontier is open. That is a governance pattern, not a technical one.

**A4 — One extraction, many reports.**
*What they did:* `extractProofCore` (`ProofCore.lean:2451`) computes a single record — call graph,
SCCs, recursion classification, eligible entries, excluded entries with reasons, obligations,
diagnostics — and every report in `Main.lean:1179-1290` is a projection of it.
*Why:* episode 7's fact-artifact argument, plus `docs\COMPILER_PIPELINE.md`'s stated goal of
stopping later commands from rediscovering facts an earlier pass already knows.
*Lab consideration:* determinism follows structurally, not by discipline. If the report is a pure
function of one artifact, "same code, same report" is a theorem about the code shape rather than a
property you have to test for.

**A5 — Eligibility as an explicit, reported, mechanical predicate.**
*What they did:* `ExclusionKind` (`ProofCore.lean:1386`) names *why* each function is not
proof-eligible — recursion, unbounded loop, capability use, unsupported construct — and
`--report eligibility` prints the verdict with the reason.
*Why:* episode 5's agent experiment depends on it entirely; it is the fitness function that let an
agent improve a JSON parser with no profiler and no benchmark.
*Lab consideration:* this is the most directly reusable idea for agent-mediated workflows. A
machine-readable "here is what is not yet provable and precisely why" turns verification from a
binary gate into a gradient an agent can climb.

**A6 — A reusable lemma layer, with the fuel keystone.**
*What they did:* `ProofKit\` plus the array/loop/fuel lemmas in `Proof.lean`. The keystone is
`eval_fuel_succ`/`eval_fuel_le` (`Proof.lean:2980, 3006`) — proved over the fuel-bounded evaluator
and all six of its mutually recursive helpers via `eval.induct`, so downstream proofs evaluate at
one large fuel and drop per-iteration bookkeeping entirely.
*Why:* `docs\PROOF_LADDER.md` states the goal as making the next proof "large but systematic"
instead of speculative.
*Lab consideration:* this is proof *economics*, and it is why 178 theorems about HMAC were
tractable at all. Whatever core the lab builds, the question "what is our fuel-monotonicity
keystone" is worth asking on day one rather than after the first heroic proof.

**A7 — Contracts as attributes, not refinement types.**
*What they did:* `#[requires]`, `#[ensures]`, `#[invariant]`, `#[variant]`, `#[spec]`,
`#[proof_by]`, `#[proof_coverage]` are declaration attributes parsed at `Parser.lean:1579` and
carried on `FnDef` (`AST.lean:341`). The type stays a type.
*Why:* episode 2 argues refinement types push you toward encoding facts in types, which makes code
harder to read and defeats the legibility goal.
*Lab consideration:* the separation keeps the *type* small (which serves a tiny core) and makes the
*specification* a separate addressable thing (which serves content-addressing). It also, on their
implementation, put contracts outside the fingerprint — but that is a consequence of what they
hashed, not of the separation itself. The separation is absorbable without inheriting bug 060.

**A8 — Two ledgers, deliberately.**
*What they did:* `CompilerLedger` (`Report\CompilerLedger.lean`) is the typed non-proof fact store;
`ObligationCore` (`Proof\ObligationCore.lean`) is the proof/evidence ledger. `docs\COMPILER_PIPELINE.md`
is explicit that the first links to the second and does not replace it.
*Lab consideration:* worth thinking about as a general shape — facts about a program and evidence
about claims are different kinds of thing with different freshness rules, and merging them tends to
give the weaker one the stronger one's authority.

**A9 — Gates that are themselves tested.**
*What they did:* ~200 shell gates under `scripts\tests\`, and `run_fast_surface_gates.sh --mutate`,
described in the `Makefile` as proving the aggregate goes red when a representative row is removed
from each inventory. A gate that cannot fail is not a gate.
*Lab consideration:* mechanically checking that your checks can fail is cheap and catches the
single most embarrassing class of verification-lab bug.

### 4.2 Fork points — where the lab's wants pull elsewhere

**D1 — Binders are surface-name strings; there are no de Bruijn indices.**
*What they did:* every binder and variable in the Core IR is a raw `String` holding the surface
name — `CStmt.letDecl (name : String)` (`Core.lean:107`), `CExpr.ident (name : String)` (`:78`),
`CMatchArm.varArm (binding : String)` (`:101`), `CStmt.borrowIn (var) (ref) (region)` (`:122`).
`stripAlpha` (`ProofCore.lean:489`) makes the digest invariant under the *elaborator's* own
renaming (`value` → `value.b7`) and nothing more.
*Why:* nothing in the docs argues for it — it is the natural representation when your IR is
primarily a compiler IR that must produce readable diagnostics with source names in them.
*Lab consideration:* this is the single decision most in tension with "alpha-invariant identity."
Renaming a local variable changes the term, therefore changes both shipped digests, therefore
stales every proof about the function. Note that upstream *has committed to* the opposite — the
R-0004 completion gate (`ROADMAP.md:1291-1294`) requires that capture-avoiding alpha renaming must
not move the subject digest — but slice 5 is marked unstarted and both shipped digests still embed
names. Also note the fork *within* the fork: canonical renaming versus index conversion versus
hashing-modulo-alpha are different answers with different properties, and the lab's paper shelf
already holds three treatments of exactly this (Maziarz 2021, Blaauwbroek 2024, Apinis–Ahman 2025 —
see the appendix). Their theorem statements bind by name too (`e "k" = some …`), so an index-based
core would change how proofs are *stated*, not just how digests are computed.

**D2 — The digest is a hand-rolled S-expression string, truncated to 128 bits.**
*What they did:* `bodyFingerprint` (`ProofCore.lean:554`) serializes to a Lisp-like string via
lines 494-552, then `shortHash` (`:1879`) SHA-256s the UTF-8 bytes and keeps the first 16.
Injectivity of the string encoding is not argued anywhere; `.floatLit v` becomes `(float {v})` via
`toString`, leaving NaN, `-0.0`, and decimal rendering unpinned.
*Why:* the code comment at `:1872-1878` explains only the *hash* upgrade — they moved from a 64-bit
`String.hash` to truncated SHA-256 specifically to defend against a crafted colliding body, "a
silent stale→proved upgrade." The encoding underneath was never revisited.
*Lab consideration:* the newer `pexprCanonical` (`Proof.lean:512-538`) shows they learned the
lesson — it is length-prefixed and tagged precisely for injectivity — but it ships marked
`receiptEligible := false`. If content-addressing is a first-class layer rather than a late feature,
the encoding is the layer, and its injectivity is something to state and prove rather than
intend. Their 128-bit truncation is a separate, independent choice worth pricing on its own.

**D3 — The subject is the body alone.**
*What they did:* the hash's input is `body : List CStmt`. Signature, return type, generics, bounds,
capabilities, and all contract attributes are outside it (bugs 059, 060). Even inside the body the
walker drops what it sees — `.letDecl name _ _ val` (`:536`) discards the declared type and
mutability; `.call` discards `typeArgs` (`:503`).
*Why:* an artifact of growth. The fingerprint began as a change-detector for bodies and was later
asked to carry the weight of an evidence claim.
*Lab consideration:* the general lesson is that **what you hash defines what your evidence is about**,
and it is very easy for that scope to drift below what your report claims. R-0004's own definition
of the intended subject (`ROADMAP.md:1237-1243`) is a good starting checklist: qualified semantic
identity, full typed signature and generic constraints, capabilities, normalized typed body,
contracts, the selected specification and its claim scope, plus a schema version. Note their
placement ruling too: the theorem's identity and the toolchain belong in the *receipt*, not in the
semantic subject digest — a separation the lab would either adopt or consciously reject.

**D4 — Two term languages with a partial bridge.**
*What they did:* the compiler's `CExpr` (`Core.lean:72`, 23 constructors) and the prover's `PExpr`
(`Proof.lean:204`) are different types. Extraction maps one to the other, and
`ProofSoundness.lean`'s 49 theorems (R-01…R-20 plus compositional companions) justify that mapping
construct by construct — for roughly twenty constructs, not for all of them.
*Why:* the proof-side language is a smaller, cleaner object with a fuel-bounded evaluator; the
compiler-side language has to carry everything codegen needs. Splitting was the pragmatic move.
*Lab consideration:* this is the concrete cost of *not* having a tiny core. If the lab attaches
proofs to a genuinely small core, the extraction seam and its twenty-theorem bridge could disappear
entirely — but the compiler then has to carry its codegen-only baggage somewhere else. The fork is
where that baggage goes, not whether it exists.

**D5 — The Core IR is not small.**
*What they did:* `CExpr` 23 constructors, `CStmt` 13, `CMatchArm` 4, `Callee` 2, plus `Ty` 27,
`BinOp` 24, `UnaryOp` 3, `CapSet` 4 from the import closure. The full closure is 4 files, 1,585
lines. `CoreCanonicalize.lean` normalizes three specific things and stops.
*Why:* Core is the *shared* artifact — it must satisfy codegen, the interpreter, the checker, and
the proof extractor at once, and each pulls it wider.
*Lab consideration:* a canonical encoding must cover every one of those constructors, and every
`String`-carrying field is alpha-sensitive surface (the full inventory is in
`concrete-spine-feasibility.md` §3). The favorable half of their design is worth keeping in view:
body-level `CExpr`/`CStmt` nodes carry **no spans** — `declSpan` and `CModule.sourceFile` exist only
at declaration and module granularity (`Core.lean:146, 159, 168, 178, 186, 208`), so body hashing
does not have to strip provenance. Any content address would still need to exclude those
declaration-level fields deliberately.

**D6 — Evidence lives in mutable source text.**
*What they did:* `#[proof_fingerprint("…")]` is a string literal a human pastes into the `.con`
file after re-verifying (`Report.lean:2572` generates the paste instruction). The registry is
synthesized from those source links (`ReportVC.lean:187`, `synthesizeSourceLinks`).
*Why:* it keeps the claim next to the code, which is genuinely good for review.
*Lab consideration:* it also means the binding between subject and evidence is an editable string
with no independent store behind it — which is exactly how eleven flagship functions ended up
`unbound` (all `#[proof_by]`, no `#[proof_fingerprint]`, in
`examples\hmac_sha256\src\main.con:58-366`). A content-addressed store makes the opposite tradeoff:
the binding is immutable and derivable, at the cost of not being visible in the source. The two are
not exclusive — a source annotation can be a *cache* of a store entry — but which one is
authoritative is a real fork.

**D7 — No scripting surface.**
*What they did:* Concrete is ahead-of-time compiled through LLVM to a native binary. There is a
Core interpreter (`Interp\Interp.lean`, 1,199 lines) but its role is a differential oracle for
testing, not a product surface. Episode 6 lists the missing tooling — no package manager, no LSP —
as a maturity gap.
*Why:* the target is systems programming; the whole thesis is compile-time facts.
*Lab consideration:* if the lab wants a scripting surface, nothing in Concrete's design is being
absorbed for it, but `Interp.lean` is a working existence proof that their Core is directly
executable. The fork is whether the executable-core path is a test oracle or a first-class way to
run programs — and if the latter, whether the *same* evaluator anchors the proofs (Concrete has
two: `Interp.lean` for testing and `Proof.lean`'s `eval` for theorems, with nothing relating them).

**D8 — Zero external proof libraries.**
*What they did:* no Mathlib, no dependencies at all, and a from-scratch FIPS 180-4 SHA-256
specification in `Proof\Sha256Spec.lean` (214 lines) checked against the NIST test vectors.
*Why:* not argued in the docs I read; the effect is a very small trusted base and total control
over the spec's shape.
*Lab consideration:* this cuts directly against the lab's standing position that peer-reviewed
proof libraries are first-class to build on. It is a real tradeoff and both sides have teeth —
their spec is auditable in one sitting and adds nothing to the trusted base, but it also means every
lemma about bitvectors, lists, and arithmetic was re-derived by hand, which is a large part of why
`Proof.lean` is 3,094 lines.

**D9 — The harness assumes Unix.**
*What they did:* `mktemp` shelled out from `Main.lean:1298` with no fallback and no exit-code check;
a Nix-based build (`Makefile`, `flake.nix`); ~200 bash gates.
*Lab consideration:* purely operational, but it is the reason a Windows reproduction of
`check-proofs` cannot be read as a measurement of upstream behaviour. Any lab claim about
Concrete's tooling needs to say which of the two it measured.

**D10 — The reporting surface is ten times the size of the IR.**
*What they did:* `Report\` totals **9,344 lines across 12 files**, with `Report.lean` alone at
4,802 — the largest file in the repo. The whole reporting subsystem is about six times the Core IR
import closure (1,585 lines), and `Report.lean` by itself is eleven times `Core.lean` (421).
*Lab consideration:* an observation rather than a criticism, but a useful gravity reading. In a
project whose thesis is "the compiler should tell you things," the telling grows without bound
unless the fact artifact is designed to be projected rather than re-derived (which is what A4 was
trying to prevent, and which the size suggests only partly worked).

---

## 5. The absorb plan — nine weeks

Assumes a few focused hours per week. Each week is one or two posts, one code target, and one
hands-on exercise. The exercises build toward a single capstone: **explaining Concrete's whole
pipeline, unaided, at a whiteboard.**

**Before week 1 — five minutes of setup.**
The clone is read-only; do not edit inside it. Two things are already true and worth confirming:
`elan toolchain list` shows `leanprover/lean4:v4.28.0` installed (the clone's `lean-toolchain`), and
a compiler binary already exists at
`.reference\clones\concrete\.lake\build\bin\concrete.exe` (144 MB, built 2026-08-24). So you can
run the tool immediately without building. For any exercise that edits a `.con` file, copy the
example into your scratch directory first and run the binary against the copy by absolute path.

Rough time cost per week: ~30 min reading, ~60-90 min in the code.

---

**Week 1 — Why this language exists at all.**
*Read:* episodes 1 and 2 (17 min).
*Code target:* `Concrete\Frontend\Token.lean` (141 lines, all of it) and `docs\ANTI_FEATURES.md`.
*Exercise:* read `TokenKind` (line 3) end to end and write down, from the token list alone, five
things Concrete cannot express. Then check your list against `docs\ANTI_FEATURES.md` and see what
you missed and what you invented.
*You should be able to say:* what a capability is, why linear beats affine for their goals, and
what the language gave up to get its reports.

---

**Week 2 — The shape of the source language.**
*Read:* the Spec page, sections on types, linearity, borrowing, capabilities (~30 min).
*Code target:* `Concrete\Frontend\AST.lean` (671 lines — read `Ty` at 62, `Expr` at 153, `Stmt` at
192, `FnDef` at 341 carefully; skim the rest).
*Exercise:* open `examples\hmac_sha256\src\main.con` and read `sha256_hash` at line 340. For each
of its four attributes (`#[requires]`, `#[spec]`, `#[proof_by]`, `#[proof_coverage]`, lines
336-339), find the field on `FnDef` in `AST.lean` that holds it, and find the parser code in
`Parser.lean:1579` (`parseAttribute`) that puts it there. Write the three-hop path down.
*You should be able to say:* how a proof claim physically enters the compiler.

---

**Week 3 — Front end: tokens to AST.**
*Read:* episode 3 (8 min).
*Code target:* `Lexer.lean` (`tokenize`, line 400) then `Parser.lean` (`ParseM` line 40, `peek2`
line 68, `binOpPrec` line 810, `parseFnDef` line 1840).
*Exercise:* run the formatter round-trip on a real example —
`concrete.exe fmt <abs-path-to-a-copy-of>\main.con --check` — then find in `Frontend\Format.lean`
(486 lines) where a construct you care about is printed. Separately, run
`concrete.exe <file> --trace-pipeline` on a small example (`examples\loop_invariant\`) and match
each stage name it prints to a file in `Concrete\`.
*You should be able to say:* what LL(1) buys, and name every pipeline stage in order.

---

**Week 4 — The Core IR. (The most important week.)**
*Read:* re-read episode 4's first third (the pipeline part).
*Code target:* `Concrete\Elab\Core.lean` in full (421 lines) plus `CoreCanonicalize.lean` (167).
*Exercise:* run `concrete.exe <file> --emit-core` on `examples\loop_invariant\src\main.con` and
read the output next to the source. Then, for each of the 13 `CStmt` constructors (`Core.lean:106-124`),
write one line of source that produces it — some you will not be able to produce, and finding out
which is the point. Finally: locate every field in `Core.lean` that holds a `String`, and mark
which of them a user rename would change.
*You should be able to say:* what desugaring bought, and exactly why an alpha-invariant digest is
not available on this representation. This is the week that connects to the lab's own spine work.

---

**Week 5 — The back half: Mono, Lower, SSA, codegen.**
*Read:* episode 6 (8 min) — the honest-cost post, deliberately placed here.
*Code target:* `IR\SSA.lean` in full (259 lines), then skim `IR\Lower.lean` for `lowerFn` (2169)
and `lowerStmt` (1748); then `Backend\EmitSSA.lean:1641` (`emitSSAProgram`).
*Exercise:* pick one small function and follow it through three views —
`--emit-core`, `--emit-ssa`, `--emit-llvm` — printing all three side by side. Identify one piece of
information present in the Core view and absent from the SSA view, and say who consumed it before
it was dropped.
*You should be able to say:* where the proof path and the backend path separate, and what is
therefore not covered by any Concrete theorem.

---

**Week 6 — The proof path, extraction side.**
*Read:* re-read episode 4 in full (10 min).
*Code target:* `Proof\ProofCore.lean` — read `extractProofCore` (2451) first, then work outward to
`EligibilityEntry` (1392), `ExclusionKind` (1386), `ObligationStatus` (1520), `Obligation` (1589).
*Exercise:* run all four of `--report eligibility`, `--report proof-status`, `--report obligations`,
`--report contracts` on `examples\hmac_sha256\src\main.con`. For each line of output, name the
field of the `ProofCore` record it came from. Then run `--report eligibility` on `examples\json\`
and find a function excluded for a reason you can fix by hand — that is episode 5's experiment,
reproduced.
*You should be able to say:* what makes a function proof-eligible, and how an obligation is born.

---

**Week 7 — The proof path, theorem side.**
*Read:* episode 5 (19 min).
*Code target:* `Proof\Proof.lean` — `PExpr` (204), `PVal` (166), `Env` (398), `FnTable` (409), the
`eval` function, and the fuel lemmas at 2980/3006. Then `proofs\Examples\LoopInvariant\Proofs.lean`
(44 lines, 1 theorem — the smallest complete example in the corpus).
*Exercise:* read that 44-line proof line by line until you can state, in English, exactly what it
claims. Then open `proofs\Examples\ConstantTimeTag\Proofs.lean` (189 lines, 8 theorems) and do the
same for its top-level theorem. Finally run
`concrete.exe <file> --report lean-stubs` and read the `sorry`-terminated skeleton the compiler
generates for an unproved function — that is the authoring workflow.
*You should be able to say:* the universal shape `eval … Expr = some (spec …)`, and why `fuel` is
in every statement.

---

**Week 8 — Evidence, freshness, and the defects.**
*Read:* episodes 7 and 8 (22 min).
*Code target:* `ProofCore.lean:483-556` (the fingerprint) and `:1872-1884` (`shortHash`);
`docs\EVIDENCE_CLASSES.md`; `docs\bugs\058`, `059`, `060`.
*Exercise:* reproduce bug 060 yourself. Copy `examples\loop_invariant\` to scratch. Its `count_up`
(line 8) is the ideal subject: it carries a real stored digest,
`#[proof_fingerprint("40b964856119044ac9bbec490d2e86ff")]` — note that it is 32 hex characters,
i.e. the 128-bit truncation from `shortHash`. Run `--report proof-status` and note the verdict.
Now add `#[ensures(result == 28)]` to `count_up` (the loop sums 0..7, so 28 is true), re-run, then
change it to `#[ensures(result == 999)]` and re-run. Confirm the verdict does not move. Then
reproduce it *not* happening: change a statement in the body instead — `acc = acc + i` to
`acc = acc + i + 1000` — and watch the fingerprint go stale. Separately, look
at `examples\hmac_sha256\snapshot\authority.txt` and count how many of the flagship's eleven proofs
are actually bound.
*You should be able to say:* what a fingerprint covers, what it does not, and why "proved" in this
tool is a claim about a body rather than about a function.

---

**Week 9 — Capstone.**
*Read:* nothing new. Skim `docs\ARCHITECTURE.md` and `ROADMAP.md:880-1318` (the R-0004 section) to
see how they describe their own frontier.
*Exercise:* at a whiteboard, with no notes, draw the pipeline from source text to binary and from
source text to evidence, naming for each stage the file, the main type, and one thing that can go
wrong. Then answer, out loud: *if I wanted alpha-invariant content addressing here, what is the
smallest change and what breaks?* If you can answer that unaided, you have absorbed the project and
you are ready to design against it rather than from it.

---

## 6. Sources

### 6.1 The blog series

| # | Title | URL | Date | Marked read time |
|---|---|---|---|---|
| — | Series index | `https://federicocarrone.com/series/concrete/` | — | — |
| 1 | Why Concrete Exists | `https://federicocarrone.com/series/concrete/the-concrete-programming-language-systems-programming-for-formal-reasoning/` | 2025-12-26 | 8 min |
| 2 | The Rust Effects Debate and Concrete's Case for a Smaller Language | `https://federicocarrone.com/series/concrete/rusts-grand-vision-and-concretes-answer/` | 2026-03-09 | 9 min |
| 3 | Designing a Programming Language for the AI Era | `https://federicocarrone.com/series/concrete/the-ai-training-data-trap-for-programming-languages-has-an-exit/` | 2026-03-11 | 8 min |
| 4 | Can I prove Concrete programs in Lean? | `https://federicocarrone.com/series/concrete/proving-systems-code-in-lean/` | 2026-03-12 | 10 min |
| 5 | When the Compiler Is the Oracle | `https://federicocarrone.com/series/concrete/when-the-compiler-is-the-oracle/` | 2026-03-20 | 19 min |
| 6 | What Concrete Makes Worse | `https://federicocarrone.com/series/concrete/what-concrete-makes-worse/` | 2026-03-24 | 8 min |
| 7 | A Fact-Producing Compiler | `https://federicocarrone.com/series/concrete/a-fact-producing-compiler/` | 2026-04-09 | 6 min |
| 8 | Nutrition Labels for Trust | `https://federicocarrone.com/series/concrete/nutrition-labels-for-trust/` | 2026-06-13 | 16 min |
| — | Concrete Spec (living reference) | `https://federicocarrone.com/series/concrete/spec/` | living | ~30 min |

**Total marked reading time for the eight episodes: 84 minutes.**

Non-academic works the posts engage with, by name: Yosh Wuyts, "A Grand Vision for Rust"
(`https://blog.yoshuawuyts.com/a-grand-vision-for-rust/`); Rich Hickey, "Simple Made Easy"
(`https://www.youtube.com/watch?v=SxdOUGdseq4`); Edgar Luque on AI as an adoption barrier
(episode 3, no URL given); Dmitri Sotnikov, Chiasmus (`https://github.com/yogthos/chiasmus`);
Vitalik Buterin and "binji" on trust nutrition labels (episode 8, social-media posts); Ken Thompson's
1984 "Reflections on Trusting Trust" (referenced conceptually in episode 8).

### 6.2 The repository

- Clone: `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete`
- Pin: `28a25a4e27fd2eaed5193e5f1c1454e06399506f`, 2026-07-31, "docs: make R-0004 the
  evidence-integrity frontier" — identical to upstream `origin/main` as of 2026-08-24, and the
  entire history is that one squash commit.
- Upstream: `git@github.com:lambdaclass/concrete.git`
- Toolchain: `leanprover/lean4:v4.28.0`; zero Lake dependencies.
- Companion lab document: `.staging\explore\concrete-spine-feasibility.md` (upstream delta, Core IR
  portability to v4.33.1, digest-shape inventory).

### 6.3 Papers

The blog posts cite prior work **by name only** — no DOIs, no URLs, no bibliography. The proper
bibliography lives in the repo, at `paper\refs.bib`, supporting the draft papers `paper\main.typ`
and `paper\evidence-carrying.typ`. Nineteen entries, reproduced here with identifiers:

| Key | Work | Identifier |
|---|---|---|
| necula1997pcc | Necula, *Proof-Carrying Code*, POPL 1997 | doi:10.1145/263699.263712 |
| morrisett1998tal | Morrisett et al., *From System F to Typed Assembly Language*, POPL 1998 | doi:10.1145/268946.268954 |
| hoare1969axiomatic | Hoare, *An Axiomatic Basis for Computer Programming*, CACM 12(10) | doi:10.1145/363235.363259 |
| leino2010dafny | Leino, *Dafny: An Automatic Program Verifier*, LPAR-16 2010 | doi:10.1007/978-3-642-17511-4_20 |
| filliatre2013why3 | Filliâtre & Paskevich, *Why3 — Where Programs Meet Provers*, ESOP 2013 | doi:10.1007/978-3-642-37036-6_8 |
| swamy2016fstar | Swamy et al., *Dependent Types and Multi-Monadic Effects in F\**, POPL 2016 | doi:10.1145/2837614.2837655 |
| protzenko2017lowstar | Protzenko et al., *Verified Low-Level Programming Embedded in F\**, ICFP 2017 | doi:10.1145/3110261 |
| leroy2009compcert | Leroy, *Formal Verification of a Realistic Compiler*, CACM 52(7) | doi:10.1145/1538788.1538814 |
| klein2009sel4 | Klein et al., *seL4: Formal Verification of an OS Kernel*, SOSP 2009 | doi:10.1145/1629575.1629596 |
| oconnor2016cogent | O'Connor et al., *Refinement Through Restraint*, ICFP 2016 | doi:10.1145/2951913.2951940 |
| jung2018rustbelt | Jung et al., *RustBelt*, POPL 2018 | doi:10.1145/3158154 |
| astrauskas2019prusti | Astrauskas et al., *Leveraging Rust Types for Modular Specification*, OOPSLA 2019 | doi:10.1145/3360573 |
| denis2022creusot | Denis et al., *Creusot*, ICFEM 2022 | doi:10.1007/978-3-031-17244-1_6 |
| lattuada2023verus | Lattuada et al., *Verus: Verifying Rust Programs using Linear Ghost Types*, OOPSLA 2023 | doi:10.1145/3586037 |
| protzenko2020evercrypt | Protzenko et al., *EverCrypt*, IEEE S&P 2020 | doi:10.1109/SP40000.2020.00114 |
| demoura2021lean4 | de Moura & Ullrich, *The Lean 4 Theorem Prover and Programming Language*, CADE-28 | doi:10.1007/978-3-030-79876-5_37 |
| borretti2024austral | Borretti, *Austral: A Systems Language with Linear Types and Capabilities* (spec) | `https://austral-lang.org/spec/` |
| barnes2012spark | Barnes, *SPARK: The Proven Approach to High Integrity Software* (book, 2012) | — |
| kani | The Kani Team, *Kani Rust Verifier* | `https://github.com/model-checking/kani` |

Episode 4 additionally names **VST**, **Fiat Cryptography**, **Mathlib**, **ATS**, and **RefinedC**
without bibliography entries.

**Already on the lab's shelf before this pass.** Three of the nineteen, plus six closely-relevant
neighbours, were already in `C:\Users\kokok\Dev\foldlab\.reference\papers\`. SHA-256 receipts
(`Get-FileHash -Algorithm SHA256`):

| File | sha256 |
|---|---|
| `demoura-ullrich-2021-lean4.pdf` | `e1fc635e3e6e84572240316d34275592cca99a871b45005456c4ac4690764f9b` |
| `protzenko-2017-verified-lowlevel-programming-fstar.pdf` | `0300c35ca6eabd9158e504e9da9ba92acf84f8b9ea019113c101d533e97fd3c9` |
| `protzenko-2020-evercrypt.pdf` | `1d2fc6715fbf5cc4c5472e9260659de1891f887df611da853d65335a599798ea` |
| `erbsen-2019-fiat-crypto.pdf` (Fiat Crypto, named in ep. 4) | `bbb0f6fcd768b8208392bfa27d34d40e24b16a4715659783a1f78f11ceaff75e` |
| `appel-2015-sha256-verification.pdf` (VST SHA-256 — the direct comparator for the flagship) | `75527a72e57d7752effc8796c81ad703fb8163736a89366ad7c6ba272fbb1959` |
| `beringer-2015-openssl-hmac.pdf` (verified HMAC — the other direct comparator) | `017d4acd67d9db5cb6ef1f00f229436419092798cdbfe948edd96571881e8ece` |
| `maziarz-2021-hashing-modulo-alpha-equivalence.pdf` | `37cda15bd6ff8605da609667e1eb54d8bc407455d5a19ec509c3403c7f51008d` |
| `blaauwbroek-olsak-geuvers-2024-hashing-modulo-context-sensitive-alpha.pdf` | `2538ba5cf57e5592bdef058beb42932f22bb20ba6b379f9e28b94ce60e70d3db` |
| `apinis-ahman-2025-simple-formalization-alpha-equivalence.pdf` | `7a85278a884203f4413e55e0ec35c19d8398d590299981f03242e8d9325b522c` |

The last three are worth flagging: they are the literature on exactly the D1 fork point
(alpha-invariant identity and hashing modulo alpha-equivalence), and the lab already holds them.
Concrete's `stripAlpha` is a two-line prefix trim; these are the principled treatments of the same
problem.

**Fetched 2026-08-24.** Sixteen `refs.bib` entries were not on the shelf. Three of those are not
papers at all (see "not applicable" below), leaving thirteen to fetch; **eleven landed** from
lawful open copies — arXiv, author homepages, and institutional repositories. All are local-only;
`.reference\papers\*.pdf` is gitignored and nothing was staged or committed. Shelf total is now
115 PDFs.

Each receipt below carries a **Used for** line stating its intended role in this absorb path.

**`necula-1997-proof-carrying-code.pdf`** — 1,170,920 B ·
`53dc6821c9e6ec014ee4fd3dc03c919c1987fdb0f62f14f0feac3321792b572c` · doi:10.1145/263699.263712 ·
from `https://homes.cs.washington.edu/~mernst/teaching/6.893/readings/necula-popl97.pdf`
*Used for:* the ancestor of Concrete's receipt and evidence-carrying vocabulary (§3.3) and the
direct prior art for fork point D6 — code that ships with its own independently checkable proof,
versus Concrete's evidence-as-editable-source-attribute.

**`morrisett-1998-system-f-to-tal.pdf`** — 398,324 B ·
`710ece967b42a49338e2ae43261b351eaf74270b1489990ffaa9870679bcc722` · doi:10.1145/268946.268954
(see version note) · from `https://www.cs.cornell.edu/talc/papers/tal-toplas.pdf`
*Used for:* the type-preserving-compilation comparator for §3.4's unproved lowering seam — what it
would take for typing to survive Core → Mono → Lower → SSA → codegen rather than stopping at Core.

**`hoare-1969-axiomatic-basis.pdf`** — 2,383,379 B ·
`f9b85de3537c0f1239cbe767cfd26ad49f2be07f0cc9021a6e46adfffb81dc12` · doi:10.1145/363235.363259 ·
from `https://www.cs.cmu.edu/~crary/819-f09/Hoare69.pdf`
*Used for:* the origin of the pre/postcondition contract that `#[requires]`/`#[ensures]` implement;
background for absorb point A7 and the week-6 obligation-generation exercise.

**`leino-2010-dafny.pdf`** — 304,672 B ·
`bc7f30f3e219204c2c25e842bf082f76abc076de6d8d719b40a855c048691119` · doi:10.1007/978-3-642-17511-4_20 ·
from `https://leino.science/papers/krml203.pdf` (author homepage)
*Used for:* the auto-discharge comparator named in episode 4 — calibrates §3.3's discharge ladder
and the trust cost of an external SMT solver against Concrete's certificate-emitting `omega`/`bv_decide`.

**`swamy-2016-fstar-multimonadic-effects.pdf`** — 396,340 B ·
`19c626ad24bcf1210c54a3bccdcafb331858062838ccf5957788e9b4461354e6` · doi:10.1145/2837614.2837655 ·
from `https://www.fstar-lang.org/papers/mumon/paper.pdf`
*Used for:* the counterpoint to episode 2's rejection of refinement types and to absorb point A7 —
what putting effects and specifications *inside* the type system buys and costs.

**`leroy-2009-compcert-cacm.pdf`** — 200,102 B ·
`5cfa2447db8dfa4400a43bb7e41e16f4787bf614e72bf0ffbf82f75d6824a137` · doi:10.1145/1538788.1538814 ·
from `https://xavierleroy.org/publi/compcert-CACM.pdf` (author homepage)
*Used for:* the reference point for the thing Concrete explicitly does not have — a verified
lowering path (§3.4) — and therefore the yardstick for fork points D4 and D5.

**`klein-2009-sel4.pdf`** — 735,567 B ·
`d1667448b2823371452406969b47cea6ae0c21ffb23e4cb94069e98463533b4a` · doi:10.1145/1629575.1629596 ·
from `https://trustworthy.systems/publications/nicta_full_text/1852.pdf`
*Used for:* the cost benchmark episode 4 cites by name (roughly 200K lines of Isabelle for 10K
lines of C) — calibrates §3.1's 364-theorem inventory and absorb point A6's proof economics.

**`oconnor-2016-cogent.pdf`** — 458,429 B ·
`1c3b185d179cbab4d77a3a56f44891fbc28ac31f4a163ef699326c71a29e52f2` · doi:10.1145/2951913.2951940 ·
from `https://trustworthy.systems/publications/nicta_full_text/9425.pdf`
*Used for:* the closest prior art to Concrete's entire thesis — "refinement through restraint,"
i.e. shrink the language so verification gets cheap. Primary comparator for fork point D5
(how small a core actually has to be) and for §4.1's framing.

**`jung-2018-rustbelt.pdf`** — 998,331 B ·
`cadcc31e287cdb19b9faeffd807d85496c235b45259a16f9c1ac3a8acfad5cd9` · doi:10.1145/3158154 ·
from `https://plv.mpi-sws.org/rustbelt/popl18/paper.pdf`
*Used for:* semantic foundations for ownership and borrowing — the comparator behind episodes 1-2's
linear-versus-affine argument and the week-4 read of `Check.lean:1914` (`mergeVarStates`).

**`astrauskas-2019-prusti.pdf`** — 631,919 B ·
`f76f59162118ac66f532ea93080a1590c24b71bda4550b12b9be49b809087e6f` · doi:10.1145/3360573 ·
from `https://pm.inf.ethz.ch/publications/AstrauskasMuellerPoliSummers19.pdf`
*Used for:* the "specifications as annotations on an ownership-typed language" comparator — the
same shape as absorb point A7, built on Rust instead of a purpose-made language.

**`lattuada-2023-verus.pdf`** — 1,003,399 B ·
`05aa2097cf5740f2d1119426fbc1066277a010b7e8e1239095684c7931b14849` ·
doi:10.1145/3586037 · arXiv:2303.05491 · from `https://arxiv.org/pdf/2303.05491` (extended version)
*Used for:* the comparator episode 4 names most often, and the concrete instance of the translation
obligation absorb point A1 claims to dissolve — Verus must model Rust's semantics in its verifier;
Concrete asserts its Core IR needs no such model.

Two version notes, recorded so nobody is surprised later. **Morrisett** — `refs.bib` cites the
POPL 1998 paper; the open copy on the Cornell TALC page is the expanded TOPLAS 1999 journal
version (title, authors, and content confirmed by first-page extraction). **Lattuada** — arXiv
2303.05491 is the extended version of the OOPSLA paper, not the camera-ready.

**To fetch manually — 2.** Both are lawfully open on HAL, and both are unreachable by script:
`inria.hal.science` serves an anti-bot "Access Denied" interstitial (12.5 KB of HTML) to every
`/document` and `/file/main.pdf` request regardless of headers. Neither the ACM nor the Springer
copy is open. Open them in a browser and save by hand:

**`filliatre-2013-why3.pdf`** — Filliâtre & Paskevich, *Why3 — Where Programs Meet Provers*,
ESOP 2013 · doi:10.1007/978-3-642-37036-6_8 · open record `https://inria.hal.science/hal-00789533`
*Used for:* the intermediate verification-language comparator — Why3 sits between a source language
and many provers, which is the architecture Concrete deliberately avoids by making its Core IR
native prover data (absorb point A1).

**`denis-2022-creusot.pdf`** — Denis, Jourdan & Marché, *Creusot: A Foundry for the Deductive
Verification of Rust Programs*, ICFEM 2022 · doi:10.1007/978-3-031-17244-1_6 · open record
`https://hal.science/hal-03737878`
*Used for:* the prophecy-based treatment of mutable borrows — the exact territory episode 4 defers
("mutable heap code, deferred to future work") and a live reference for fork point D5.

**Not applicable — 3.** These `refs.bib` entries are not papers and have no PDF to shelve:
`borretti2024austral` is an HTML language specification (`https://austral-lang.org/spec/`),
`barnes2012spark` is a printed book (Altran Praxis, 2012), and `kani` is a GitHub repository
(`https://github.com/model-checking/kani`).

Of episode 4's bibliography-less name-drops, **Fiat Cryptography** (`erbsen-2019-fiat-crypto.pdf`)
was already on the shelf; **VST**, **Mathlib**, **ATS**, and **RefinedC** were not pursued, as the
series names them without pointing at a specific publication.

---

## Open questions this document did not settle

1. Whether upstream `check-proofs` works on a Unix host at the pin. I established three specific
   defects by reading `Main.lean:1278-1400` — the `mktemp` dependency (Windows-fatal), the residual
   cwd-relative `lean-toolchain` read at line 1381, and substring-based verdict attribution — but I
   did not run the tool. The lab's 0/11 measurement is very likely the `mktemp` failure, which
   would mean it measured the harness, not upstream.
2. Whether the full pipeline (not just the 4-file Core IR closure) builds at Lean v4.33.1. Still
   untested; the clone's binary was built at v4.28.0.
3. What `docs\TRUST_LABEL.md` and `docs\AXIOMS.md` say in detail — I cited them from the
   `docs\` listing and episode 8's description rather than reading them line by line.
4. Whether the `Examples` proof library actually kernel-checks clean today. `lake build` includes
   it in `defaultTargets`, and there are no `sorry`s or axioms in it, but I did not run a build.

