# LANGUAGE-POLICE — the reflexive-tooling suite

Repo `771ba655`. Toolchain `leanprover/lean4:v4.33.1` (`library/cas/lean-toolchain`). Study + design, no implementation.

A language comes with auditors. This is the design for them: what each one reads, how it wires into the existing Gate driver, what it costs, and which one to build first.

## 0. Provenance flag (raised, not resolved)

`.reference/catalog/REFERENCES.md:101` admits `lambdaclass/concrete` as a study clone **at `.reference/clones/concrete`, commit `28a25a4e27fd2eaed5193e5f1c1454e06399506f`**, and `.reference/provenance/receipts/concrete-sha256-transplant.json` names `Concrete/Proof/Sha256Spec.lean` as the transplant source for `Cas/Codec/Sha256.lean`.

**`.reference/clones/` does not exist on this Mac.** `.reference/.gitignore` lists `clones/`, so the absence is by policy (clones are local-only), not corruption. Consequence: **this host cannot verify the SHA-256 transplant receipt.** Everything I report about Concrete below came from the web, not the pinned clone.

Two mitigating observations from the web fetch: the pinned commit `28a25a4e` **is** the repo's current HEAD (last commit 2026-07-31), and `Concrete/Proof/Sha256Spec.lean` is present in the tree at that commit — so the receipt's path and pin are consistent with the public repo. That is corroboration, not verification.

**Ask:** re-materialize the clone on this host, or record that transplant verification is a PC-only capability.

## 1. Study notes

### 1.1 The Metaprogramming in Lean 4 book — thin for this purpose

Real TOC (the assumed chapter paths in the brief are stale; `extra/03_attributes` is a 404): `main/01_intro 02_overview 03_expressions 04_metam 05_syntax 06_macros 07_elaboration 08_dsls 09_tactics 10_cheat-sheet`, `extra/01_options 03_pretty-printing`. Book toolchain `v4.34.0-rc2`.

Honest coverage against what an environment auditor needs:

| Need | Book |
|---|---|
| Environment walking | Ch. 7, one paragraph + one `env.find?` example; `inductInfo` is the only `ConstantInfo` constructor named |
| Attribute **registration** | absent — usage only (`@[macro …]`, `@[command_elab …]`) |
| `collectAxioms` | zero hits |
| Docstrings | one clause ("their types, doc-strings, values etc.") |
| Module-of-declaration, position | zero |
| `Expr` | Ch. 3, full inductive; **no** folds, no size |
| Options | Ch. extra/01, genuinely good |
| `lake exe` auditor driver | zero |

Three things worth taking:

- **Ch. 3 Expressions** — `lit` exists so `(10000 : Nat)` is not a `Nat.succ` tower, and `proj` replaces `app π₁ p` "for efficiency reasons". So **any term-size metric is a metric over the stored representation, not the mathematical term.** Design C must say so in its own output.
- **Ch. 7 Elaboration** — the only demonstration of reading a tagged set back out of an environment: `commandElabAttribute.getEntries (← getEnv) kind`, yielding `el.declName`. Keyed lookup, not enumeration; persistence not discussed.
- **Ch. 4 MetaM** — `forallTelescope` and the `*Meta*` variants, with the caution that meta variants leave metavariables in the environment indefinitely. Relevant to a long-running walk. (`Surface.lean:113` already uses `forallTelescopeReducing`, the safe one.)

**The book does not answer the one question design A turns on** — whether a custom attribute's tagged set survives into `.olean` and is enumerable downstream. I settled that by experiment instead (§2, M1).

### 1.2 Lean 4 reference + core source — the linter picture, corrected

The reference has **no chapter** on the linter framework, `register_option`, `maxHeartbeats`, custom attributes, or `Environment` APIs. Everything below is from the **pinned toolchain source** unless marked, which I read locally.

**Core ships an environment-linter framework.** `Lean/Linter/EnvLinter/{Basic,Frontend}.lean` — the Batteries `env_linter` machinery, upstreamed in 4.31.0 and restructured onto `Lean.Option` gating in 4.32.0 (release notes).

```lean
structure EnvLinter where
  test : Name → MetaM (Option MessageData)   -- Name, NOT ConstantInfo
  noErrorsFound : MessageData
  errorsFound   : MessageData
  isDefault := true
```
Registry `envLinterExt : SimplePersistentEnvExtension (Name × Name) (NameMap Name)`; attribute `@[builtin_env_linter linter.foo]` (`Basic.lean:77`), requiring a `public meta def` of type `EnvLinter` and a pre-existing `Bool` option. Frontend (`Frontend.lean`) gives `getEnvLinters`, `lintCore`, `formatLinterResults`, `getDeclsInCurrModule`, `getAllDecls`, **`getDeclsInPackage`** (`:174`). `lake lint` exists in this Lake (5.0.0) with `lintDriver` / `builtinLint` / `--linters=` / `--record-exceptions`.

Three corrections that matter, verified on **4.33.1 specifically**:

1. **Core registers zero builtin env linters.** `grep -rln builtin_env_linter` over the toolchain returns only `EnvLinter/Basic.lean` — the file defining the attribute. The framework is an empty chassis.
2. **`Lean/Linter/CodeQuality/` does not exist in 4.33.1.** The "persist metrics into `.olean`, harvest via `lake lint --code-quality` without re-elaboration" route is a master-branch feature, **not available on the pin**. Design C cannot use it.
3. **`EnvLinter.test` is per-declaration.** A global invariant ("every ruling ID has an enforcing declaration") is an existence/set-difference fold, not a per-declaration predicate — and when the ruling set comes from outside the environment, the frame does not fit at all. **This is the decisive argument for keeping the police tools as Gate exes rather than porting them to EnvLinter.** The brief's hypothesis was right in substance, wrong in its premise that no env-level chassis exists.

Other confirmed facts:

- `linter.missingDocs` — `register_builtin_option … defValue := false` (`MissingDocs.lean:20`). Off by default, **syntax-level** (`CommandElabM`, dispatches on node kind), covers declarations, notations, syntax categories, `initialize`, option registrations. Batteries enables it repo-wide via `[leanOptions]`.
- `maxHeartbeats` — `defValue := 200000`, "number of (small) memory allocations (in thousands)" (`CoreM.lean:30`). `getMaxHeartbeats = value * 1000`. `maxRecDepth` — `defValue := defaultMaxRecDepth` = **512** (`Util/RecDepth.lean:15`, `Init/Prelude.lean:4836`).
- `IO.getNumHeartbeats : BaseIO Nat` (`Init/System/IO.lean:594`) returns **raw** allocations — a unit mismatch with the option, which is in thousands.
- **`collectAxioms` never crosses module boundaries.** `Lean/Util/CollectAxioms.lean:116` documents `exportedAxiomsExt`: axiom dependencies are computed once by `beforeExportFn` at olean serialization and looked up by binary search for imported declarations. **`Surface.lean:132`'s per-theorem `collectAxioms` is therefore a binary search, not a body walk** — the axiom census is far cheaper than it looks.
- Attribute caution (reference, [Attributes](https://lean-lang.org/doc/reference/latest/Attributes/)): "some attributes can only be applied to a declaration in the module where the declaration is defined … so lookups don't need to examine data for all modules." Do not assume every attribute is queryable from a fully-imported environment. Mine is (M1).

### 1.3 lambdaclass/concrete — organization lessons

333 stars, HEAD `28a25a4e` 2026-07-31, **80 `.lean` files / 2.46 MB** (enormous files: `Report/Report.lean` 263 KB, `Proof/Proof.lean` 147 KB), 1,276 `.con` sources, ~190 bash gate scripts. **Zero Lake dependencies, no Mathlib**, toolchain 4.28.0. The verification harness is bash, not Lean — calibrate accordingly.

Stage directories are **named, not numbered**, and purely an import-path grouping (every file still declares `namespace Concrete`): `Frontend/ Resolve/ Elab/ Check/ IR/ Backend/ Interp/ Semantics/ Proof/ ProofKit/ Report/ Pipeline/`. `Concrete.lean` is a 46-import dependency-ordered root that **carries the proof-boundary policy as a comment inside the import list**.

**ProofKit separation is two separations, not one** — this is the part worth stealing:

- **`Examples` lib (`srcDir = "proofs"`)** — program-correctness proofs. `Examples → Concrete` one-way; the compiler references example theorems **by name and fingerprint at runtime**, never by import. `lake build concrete` (exe, root `Main`) does not build them; bare `lake build` does, because `defaultTargets` includes them. *Architecturally separable, operationally coupled by default.* Foldlab's `CasExamples` lakefile comment cites exactly this ("the Concrete split").
- **`Concrete/ProofKit/`** — reusable proof infrastructure, deliberately **inside** the compiler lib, "harvested from the HMAC-SHA256 flagship" and forced generic over an arbitrary function table. The lesson: *write the hard proof first, then harvest the reusable half and generalize it.*

The boundary is held by a **three-way ratchet**, `scripts/tests/check_proof_namespace.sh` + an allowlist: no `namespace Concrete.Proof` under `proofs/`; no non-allowlisted `theorem`/`lemma` in `Concrete/Proof/Proof.lean`; migrated theorems may not reappear. Net rule: **`def`s may live in the compiler, `theorem`s about user programs may not.**

Proof-burden containment, five named mechanisms: layered trust with `docs/AXIOMS.md` tiers (native-code trust granted **theorem-by-theorem**, 6 theorems, reasons recorded, `sorryAx` and user `axiom` forbidden outright); a TCB document that **states what is not claimed**; evidence classes with **body fingerprints** so a changed body revokes the proof; a fail-closed provable subset; and `ProofSoundness.lean` discharging **two** theorems under a section headed "What is NOT here" enumerating everything owed.

Meta-tooling worth naming: `check_gate_mutation_coverage.sh` (**disable one rule per family, prove that family's gate goes red**), `check_axiom_inventory.sh` (`#print axioms` diffed against a trust file), `check_compiler_complexity.sh` (anti-superlinear guard — caught a cubic dominator computation), `check_docs_drift.sh`, `run_ci_gates_local.sh` (extracts its command list **from the workflow file** so local and CI cannot drift).

Two candid process notes: the pre-push hook is deliberately partial because "a 23-minute push gets bypassed by the second day, and a bypassed hook protects nothing"; and `docs/ARCHITECTURE.md` still references a `Concrete/Examples/` directory that no longer exists — **their own docs-drift gate did not catch it**, which is a lesson about the limits of drift gates.

### 1.4 Local sources

**`library/cas/tools/Surface.lean`** (213 lines) — the existing environment walker, and it is better than its reputation. One `collect` over `env.constants` produces per-declaration `Row {name, kind, signature, documented, axioms, touches, carriers}`, grouped by module, rendered to `surface/cas-surface.json` as one Gate fixture. It already carries: the axiom census with `beyondCleanAxioms` against `cleanAxioms = [propext, Classical.choice, Quot.sound]`; doc coverage; an **area census** (`areaOf`, second component of a used constant's defining module); and a **carrier census** against 14 ratified `coreCarriers`. `kindOf` detects instances by telescoping the signature to a class head — "reliable across imported environments". `isGenerated` filters 21 suffixes plus `match_`/`proof_`/`eq_def` prefixes.

`supportInterpreter = true` (lakefile) is **required**, not decorative: the exe imports and runs elaborator-level code, and `fixtures` calls `enableInitializersExecution` before `importModules … (loadExts := true)`. The walk runs *inside* the `IO (List Fixture)` action the driver forces only after arguments parse, "so a typo'd flag never pays for the whole import" (`Surface.lean:203-205`). Every police tool inherits this shape for free.

**`tools/Gate.lean`** (269 lines) — one skeleton for eleven emitters. `Fixture {path, content, label}`, a four-word verdict vocabulary (`wrote`/`ok`/`missing`/`differs`), first-differing-byte diagnosis with a 60-char window centred on the divergence (because the JSON artifacts are whole documents on line 1), `--check` visiting **every** fixture before failing once, and `--json` emitting one parseable object per fixture. Three entry points: `main` (fixed target), `mainAt` (overridable path), `mainSelect` (registry + `--all`). **A new police tool is a `root` + a `fixtures : IO (List Gate.Fixture)` and nothing else.**

**`Cas/Schema/Basis.lean`'s BLOAT-LEDGER** — the method to copy. Per capability family, a table of `surface | core | generation | independence | named collapses`, and three obligations stated for every family: GENERATION (every public op proved equal to a composition over a declared core — "where the definition IS the composition the proof is `rfl` and the theorem is still worth stating: it pins the factoring as law"), INDEPENDENCE (a separating witness per core element), NAMED REDUNDANCY (every deliberate duplicate stated as a collapse). F2 records a **correction** — the declared core was short by one (`deNumNorm`) — which is the ledger doing its job.

**`Cas/Architecture.lean`** — the estate already has the "description as a Lean value, guarded, byte-pinned two-sided" pattern. `Architecture {types, seams, laws, backends}`, the value `foldlabCas`, and `#guard`s over the shape's own laws. **Critically: `ArchLaw {name, plane, needs, means}` has no field binding a law to an enforcing declaration.** That is exactly the gap queue item 33 names, in a structure that already exists.

**Salvaged LAWS discipline** (`git show attic/correctness-gating-laws:docs/LAWS.md` and `:scripts/check-laws.ts`) — the prior art, and it is excellent. The failure mode it names: *"Rewrite the comment and the law is gone"*, silently, with every gate green. Status vocabulary `BOUND` / `UNBOUND` / `—`, where BOUND requires the ID within **30 lines** of the named test ("Measured against the tree: every real binding in the index sits within 29 lines of its test … it is deliberately not generous"). The gate fails in **both** directions: forward (a row's statement file no longer names the law; an enforcer renamed away; a BOUND row whose enforcer does not name the law) and reverse (a law ID in a test file with no index row). Plus two subtler rules: an `UNBOUND` row whose enforcer *does* name the law fails ("an upgrade is not drift, but the index must say so"), and a `—` row fails once any test names the law ("someone wrote the missing test and left the index claiming a hole"). And **`--self-test` plants one defect per rule and requires each to be caught by that rule alone** — 9 controls — because "a gate that cannot fail proves nothing".

It also refuses to overclaim: *"nothing here checks that the test actually tests the law."*

**`SCHEMA-MATERIALIZATION.md`** — ratified 2026-08-29 with S1–S5; 33 accumulated ruling-queue items. Item 33 is this lane's charter ("the ruling queue records rulings but binds none to enforcing tests"). Item 24 is the Surface blind spot (`Cas.Backend.*` invisible to the ledger). Item 31 is a paired-change debt on the Architecture matrix.

**Known hazards, all confirmed by measurement:**

| Hazard | Status |
|---|---|
| `maxHeartbeats` cliff, `Cas/Schema/Codec/Laws/Mutual.lean:28` | `1600000` = **8× the 200000 default**. One of two option overrides in the tree. |
| Kernel string-reduction wall | "~2k chars (measured)" — `.staging/schema-materialization/JIT-SUBSTRATE-SURVEY.md:39` (B13). Not env-observable. |
| Change amplification | `REGISTRY.md:41` / `Defun.lean:128`: "a measured five-file amplification". `REIFICATION-SUBSTRATE.md:45`: schema sort +96/5 files; git sort +59/7 files; **"Reference discipline surcharge in TreeProg.progK_run: leaf ~9 lines, one child ~45, two ~72, a LIST of children: no pattern exists (~250-400 est., kernel-hazard files)."** |
| Dead imports (found by hand twice today) | See M4/M6 — the recorded one is already **fixed**, and the register is stale. |
| Conflict markers surviving builds | **Zero** in `Cas`/`tools`/`examples` right now. A sweep is cheap insurance, not a live fire. |
| Named obligations unindexed | 40 sites, all env-readable (M5). |

Also: `maxRecDepth 2048` at `Cas/Vectors/Schema.lean:151` = 4× the 512 default. The hazard is a *pair*, not a singleton.

## 2. What I measured (not read)

Eleven probes on the pinned toolchain against the real, already-built `library/cas/.lake`. These settle the questions the book and reference could not.

**M1 — `@[law "R1"]` survives into `.olean` and is enumerable downstream. CONFIRMED.** A three-module Lake project (attribute in one module, tagged declarations in a second, an auditor exe importing both). Both enumeration routes work:

```
route1 (getParam? over env.constants): #[(r3_enforcer, R3), (r2_holds, R2), (r1_holds, R1)]
route2 (importedEntries):              #[(r2_holds, R2), (r1_holds, R1), (r3_enforcer, R3)]
```

`registerParametricAttribute` requires a declared `syntax (name := lawAttrStx) "law " str : attr`, and the attribute's `name` field must be **the syntax node name**, not a fresh name — this cost two build failures and is not documented in either source I studied. Route 2 (`lawAttr.ext.toEnvExtension.getState env |>.importedEntries`) is O(tagged); route 1 is O(all constants). **Design A's attribute option is technically sound.**

**M2 — proof terms are retained for every imported theorem.** 1301 `Cas` theorems (filtering only `isInternalDetail`), **1301 with a retained value**. Total 320,319 `Expr` DAG nodes on that walk; 447,226 across the `Cas`-root walk counting per module. Heaviest:

```
13412  Cas.Grammar.Tree.progK_run
 6129  Cas.Schema.decode.match_1.congr_eq_13
 3917  Cas.Grammar.Tree.flatten.eq_def
 3113  Cas.Lang.runPFrom_absent_sound
 2992  Cas.Lang.interpret_agree_or_collision
```

**`progK_run` is the heaviest proof term in the library by 2.2×, and it is the exact declaration `REIFICATION-SUBSTRATE.md:45` names as the reference-discipline surcharge.** A hand measurement off git diffs and a machine measurement off the kernel's own terms point at the same declaration. That is design C's warrant.

**M3 — declaration ranges: 1672 / 3517 (47.5%)** of `Cas` declarations carry an *exported* range (`declRangeExt.find? (level := .exported)`). Partial. The obligation ledger must key on **module + declaration name** (always available) and treat the line number as a hint.

**M4 — dead imports, prototyped, with two false-positive classes discovered.** The naive rule ("the import reaches nothing referenced") flags **56** edges — but 7 of those modules are **aggregators with zero own declarations** (`Cas`, `Cas.Lang.Lang`, `Cas.Schema.Schema`, `Cas.Grammar.Grammar`, `Cas.Schema.Codec`, `Cas.Schema.Described`, `Cas.Lang.Fragments`), pure re-export roots for which imports *are* the content. Carving those out drops it to **0**. The strict rule (nothing declared in `J` itself is referenced) yields **13 candidates, 7 of which uniquely reach nothing** — the true positives. A usable lint needs both the aggregator carve-out and the uniquely-reaches refinement; without them it is pure noise.

**M5 — the obligation ledger is extractable today.** Of 857 `Cas` declaration docstrings, **23** carry obligation vocabulary (`owed` 8, `obligation` 7, `parked` 3, `discharged` 3, `OBLIGATION` 2), plus **17 module docstrings**. `findDocString?` and `getModuleDoc?` both work on imported modules. Samples: `Cas.Lang.readPIn_encodePIn :: parked`, `Cas.Schema.Ast.tuple :: owed`, `Cas.Lang.whole_run_security :: discharged`.

**M6 — the defect register is already stale.** `SCHEMA-MATERIALIZATION.md:574` lists "`Cas/Backend/Ts.lean` imports `Cas.Schema.Foreign` and never uses it". My lint did not flag it. Cause: **the import was removed in `34145109` — "chore(cas): drop the unused Foreign import from the TS fragment"**. `Ts.lean` now has *no* imports at all. The lint is right; the prose ledger is rotting. This is the failure mode the whole lane exists for, caught live, in the register that was supposed to be the reliable one.

**M7 — the axiom census is cheap** (`CollectAxioms.lean:116`, §1.2). **M8 — EnvLinter exists, registers nothing, `test` is per-declaration.** **M9 — no CodeQuality channel on the pin.** **M10 — heartbeat 8×, recdepth 4×.**

**M11 — doc coverage: 796 / 1571 = 50.7%**, from the committed ledger. Totals: 789 def, 624 theorem, 71 instance, 44 structure, 40 inductive, 3 class. Axiom census: `propext` 525, `Quot.sound` 373, `Classical.choice` 207, `beyondCleanAxioms` **empty**, **96 theorems axiom-free**. Worst-documented modules: `Cas.Vectors.Vectors` 71/84 undocumented, `Cas.Grammar.Manifest` 69/96, `Cas.Schema.SelfCodec` 57/143.

Note the census disagreement: my walk counts **1301** theorems, `Surface` reports **624**. The gap is `isGenerated` — roughly 677 compiler-generated theorems (`.eq_def`, `match_N.congr_eq_*`) that carry real proof mass and are invisible to the ledger. Two of the five heaviest proof terms are generated. **Burden telemetry must count what the surface ledger deliberately hides.**

**M12 — the burden table** (proof-term DAG nodes, joined to source LOC):

```
   nodes  thms    LOC nodes/LOC  module
   46409   148   1930      24.0  Cas.Lang.Defun
   45732   298   1993      22.9  Cas.Schema.SelfCodec
   28843    31    178     162.0  Cas.Codec.Nat32
   28820    37    605      47.6  Cas.Schema.Codec.Laws.Mutual
   22576    50    211     107.0  Cas.Schema.Codec.Core
   22523    93    469      48.0  Cas.Grammar.Tree
   20726    28    768      27.0  Cas.Lang.Auth
   19685    13    496      39.7  Cas.Lang.TreeProg
```

Two signatures fall straight out. **`Cas.Codec.Nat32` at 162 nodes/LOC** — the highest density in the library, short source generating enormous terms (decision procedures). **`Cas.Lang.TreeProg` at 1,514 nodes per theorem** from 13 theorems — the reference-discipline surcharge, now visible on a third independent axis. Neither is legible from LOC alone, which is why the telemetry earns its place.

## 3. The designs

Every tool below is a `lake exe` with a `root` in `tools/`, `supportInterpreter = true`, driven by `Gate.main`, emitting byte-gated fixtures. No new abstractions.

Standard wiring, identical for each (call it **W**): add `[[lean_exe]]` to `library/cas/lakefile.toml`; add a `gen:cas-<name>` task to `mise.toml` and a line to the `gen` list; add `lake exe <name> --check` to `check:cas`; add a row to `.agents/skills/backend-materialize/SKILL.md`'s emitter table. Four edits, ~15 lines.

### A. The law index — queue item 33 made real

**Data source.** Two halves that must be joined: the **ruling set** (33 items, currently prose in `SCHEMA-MATERIALIZATION.md`) and the **bindings** (declarations that enforce them, currently nothing).

**Mechanism — recommendation, with the evidence.** The brief offers attribute *or* docstring convention. M1 proves the attribute works, so the choice is not technical feasibility; it is build-graph cost.

`Cas` does not import `Lean` at the root — but the Schema plane already does, transitively through `Cas/Schema/Deriving/Handler.lean` (which runs `initialize registerDerivingHandler`) and `Cas/Schema/Notation.lean` (`cas_struct`/`cas_union`, with `(docComment)?` capture). **The `Core`/`Codec`/`Values` planes do not.** An `@[law]` attribute needs a `Cas/Law.lean` leaf importing `Lean`, imported by every tagging module — pushing `Lean` into the low layers the first time a codec theorem is tagged.

The docstring convention costs **zero** build-graph change, is readable from the imported environment (M5), and **matches a convention the estate already runs** — `NAMED OBLIGATION`, `SUB-OBLIGATION 1, DISCHARGED`, `un-parked` are already load-bearing prose in 40 docstrings.

> **Recommend the docstring convention for slice 1** — a line `LAW SM-33: <one clause>` at the head of the enforcing declaration's docstring. **Recommend the attribute as a named, costed upgrade** if declaration-time validation is wanted; M1 is the proof it will work, and the upgrade is mechanical because both mechanisms key the binding on the declaration name.

**The gate, failing in both directions** (the `check-laws.ts` discipline in Lean):
- *unbound ruling* — an ID in the registry that no declaration claims;
- *unregistered binding* — a declaration claiming an ID the registry does not carry (this is what catches typos, and is why the attribute's elaboration-time check is not needed);
- *status lie* — a row recorded as owed while a declaration now claims it, and its converse.

**Where the registry lives.** `SCHEMA-MATERIALIZATION.md` is prose and will stay prose. Mint the registry as a **Lean value in the `Cas/Architecture.lean` idiom** — a `List Ruling` with `id`, `statement`, `status` — and let a cheap second check assert the markdown queue and the Lean registry agree by ID set. This is the estate's existing "description as a value, guarded" pattern, not a new one.

**Smallest-first slice.** A1: emit `surface/cas-laws.json` from the docstring scan alone — every declaration claiming a `LAW <id>:`, grouped by ID, with an `unregistered` array. No registry yet, so only the reverse direction fires. A2: mint the registry value; the forward direction (`unbound`) switches on. A3: `--self-test` with one planted defect per rule, per the salvaged gate's 9 controls.

**Cost.** A1 ≈ 120 lines + W. A2 ≈ 60 lines of Lean value + 40 of checking. A3 ≈ 80 lines. **Blocked on a ruling** (§4, asks 1 and 3): the queue's bare integers `1..33` collide with every other registry in the estate — the old era already recorded a live `C1` collision between two unrelated laws.

### B. The obligation tracker

**Data source.** Declaration docstrings (23) and module docstrings (17), M5-proven readable. Vocabulary already in use and closed-ish: `owed`, `obligation`, `parked`, `un-parked`, `discharged`, `PIN PENDING`, `SUB-OBLIGATION n`.

**Emits** `surface/cas-obligations.json`: per row `{module, declaration, state, keyword, excerpt}` plus the health dashboard —
- **formless rows** — `Cas/Grammar/Manifest.lean:817` **already computes this** (`m.rows.filter (·.forms.isEmpty)`); the emitter reads the manifest rather than recomputing. Currently one: `Ty.context`.
- **Empty denotations** — the `El` arms returning `Empty` (`Cas/Schema/El.lean:157-160`: `decl`, non-discriminated `union`, `enum`, `tuple`). Four, each with a docstring already explaining why.
- **pin-pending citations** — `Cas/Lang/Fragments.lean:257` "**CORPUS PIN PENDING**". One.
- **parked legs** — `parked` / `un-parked`, with `Cas/Lang/Defun.lean` carrying most of the history.

**Honest limitation.** "Since when" is **not** derivable from the environment. Declaration ranges give a line for 47.5% of declarations (M3) and no date at all. Age requires a `git log -S` join, which is a shell or TypeScript step outside the Lean tool. **Design B delivers what/where/state; it does not deliver since-when, and the ledger should not pretend otherwise.**

**Smallest-first slice.** B1: the extraction and the four health counters, emitted, byte-gated. Nothing else. B2: state transitions gated — a `discharged` obligation that reverts to `owed` is a red diff, which falls out of byte identity for free.

**Cost.** B1 ≈ 130 lines + W. **Blocked on nothing.**

### C. Proof-burden telemetry

**Data source.** M2/M12, all from the environment: per-declaration `Expr` DAG size over `ConstantInfo.value?`; per-module totals; theorem counts including generated ones (M11's 677-theorem blind spot); source LOC via `IO.FS`; and the option census — `set_option maxHeartbeats|maxRecDepth` **scanned from source**, because options are not environment-resident (confirmed: an env walker sees its own ambient options, never the audited source's `set_option` sites).

**Emits** `surface/cas-burden.json`: per module `{theorems, generatedTheorems, proofDagNodes, loc, nodesPerLoc}`; the heaviest N declarations; the option census with each site's multiple-of-default (`Mutual.lean:28` → 8×, `Vectors/Schema.lean:151` → 4×).

**On byte-gating exact numbers.** Every proof edit moves them, so the gate goes red on every proof change. **That is correct here and should not be softened.** The estate's discipline is already `mise run gen` → `git diff --exit-code`; a proof edit becomes a regeneration whose diff *shows the amplification*. That is precisely "change amplification as a standing artifact, not a feeling" — the measurement `REIFICATION-SUBSTRATE.md:45` did by hand, done every commit. A toolchain bump reprints everything, exactly as it already does for `Surface`'s pretty-printed signatures (`Surface.lean:25-27` names this as an accepted re-gen event).

**What is not measurable on this pin.** Per-declaration elaboration *time* or heartbeats. `IO.getNumHeartbeats` measures the calling thread, not a past build; the `CodeQuality` persistence channel that would harvest build-time metrics from `.olean` **does not exist in 4.33.1** (M9). Term size is the available proxy, and Ch. 3's `lit`/`proj` note means it is a metric over the stored representation. **Say so in the artifact.**

**Smallest-first slice.** C1: per-module totals + the option census. That alone would have surfaced `Nat32` at 162 nodes/LOC and `TreeProg` at 1,514 nodes/theorem. C2: per-declaration rows for the top N. C3: generated-vs-declared split.

**Cost.** C1 ≈ 110 lines + W. Runtime: the full DAG walk over 1301 theorems ran in ~11 s wall including import, on a warm build. **Blocked on nothing.**

### D. Consistency lints

Four checks, three of which are near-free once the walk exists.

1. **Shadowing across namespaces.** From the environment, group public `Cas` names by final component. Live collisions: `put` (`Cas/Core/Admission.lean:176`, `Cas/Lang/Ops.lean:49`), `checkRefs` (`Admission.lean:49`, `Cas/Lang/Tower.lean:104`), `render` ×3 (`Values/Json.lean:82`, `Values/Markdown.lean:90`, `Schema/Foreign.lean:27` and `:52`), `encode`/`decode` ×3. Under S5's five seats a collision that reads fine when *programming* (namespaces disambiguate) jars when *prompting* (an agent told "call put" cannot tell which). The lint reports; it does not rule.
2. **Docstring presence on public surface.** **`Surface` already does this** — do not rebuild it. The cheaper upgrade is `linter.missingDocs = true` in the lakefile's `[leanOptions]`, which gates at build time exactly as Batteries does. At 50.7% coverage that turns the build red on ~775 declarations today, so it is a **ratchet target, not a slice**. Path: raise coverage module-by-module against the ledger's worst-first list (M11), then flip the option.
3. **Dead imports.** M4, with both carve-outs mandatory. Report `uniquely-reaches: 0` as findings and the rest as advisories.
4. **Conflict-marker sweep.** A source scan for `^<<<<<<<` / `^>>>>>>>`. Zero hits today. Trivial and worth having precisely because it found something once.

**Chassis.** Keep Gate. Do **not** port to `Lean.Linter.EnvLinter`: checks 1 and 3 are global folds over the whole constant set and the module graph, and `EnvLinter.test : Name → MetaM (Option MessageData)` is per-declaration (M8). Core also registers no builtin env linters, so adopting it buys a runner we would have to configure (`lintDriver`) and no linters. **Reconsider only if a check turns out to be genuinely per-declaration** — check 2 is, which is another reason to let core's `missingDocs` own it.

**Smallest-first slice.** D1: shadowing + conflict markers (both trivial, both env-or-source-only). D2: dead imports with the carve-outs. D3: the `missingDocs` ratchet, not a tool.

**Cost.** D1 ≈ 70 lines + W. D2 ≈ 120 lines (the import-closure fold is the bulk).

### E. The literature projection hook — one walker, many projections

The plain-language lane (concurrent, `.staging/verbal-register/`) needs from the environment: **name, kind, docstring, module, area, carriers** — which is `Surface.Row` minus `signature` and `axioms`. The substrate already exists and is already correct.

**Recommendation: do not fork the walker.** `Surface.collect` walks `env.constants` once and costs one full `importModules` (~11 s warm, and it is the dominant cost — the walk itself is cheap). A second tool with its own `import Cas` pays that import again. Instead:

- Promote `collect`, `Row`, `moduleOf`, `areaOf`, `classify`, `kindOf` into the existing **`Gate` lean_lib** (already `srcDir = "tools"`, already imported by every exe root) or a sibling `Walk` lib. **No new abstraction — it is a move, not a design.**
- Each projection is then a `fixtures` function over one shared `Array (Name × Array Row)`.
- Where projections need fields `Row` lacks (obligation state for B, DAG size for C), **extend `Row`** — which changes `surface/cas-surface.json`'s bytes once, as a declared re-gen event, and thereafter every projection has them.

This is the single highest-leverage structural move in the report, and it should happen **before** the second police tool exists, not after the fourth.

**Queue item 24 lands here.** `Surface` walks `#[{module := `Cas}]` only; `Cas.Backend.*` is invisible. My probes imported `Cas.Backend.Ts` alongside `Cas` with no difficulty. It is the one-line fix the ruling already anticipates, and it should ride the same slice that moves the walker.

### F. Adopt vs. what Surface already does better

**Where Surface is ahead of Concrete, and should not be "improved" toward it:**

- **One driver, one verdict vocabulary, byte identity.** Eleven emitters share `Gate.lean`'s four words and its first-differing-byte diagnosis. Concrete has ~190 ad-hoc bash scripts and needed `check_gate_hygiene.sh` — *a gate that gates the gates* — to keep them honest. Foldlab does not have that problem and should not acquire it. **Every police tool goes through Gate.**
- **Reports are data, not console output.** `cas-surface.json` is 826 KB of queryable JSON; Concrete's equivalents are `.txt` snapshots diffed by shell.
- **The axiom census is in-process and cheap** (M7) rather than shelling `#print axioms` per theorem as `check_axiom_inventory.sh` does.
- **Area and carrier censuses have no Concrete analogue.** They are estate-specific and they are the retrieval surface.
- **Zero dependencies, no Mathlib** — same as Concrete. Nothing to adopt; parity worth stating.

**Where Concrete is ahead, ranked by value here:**

1. **Gate-mutation coverage** — "disable one rule, prove that family's gate goes red". The estate already holds this principle (`check-laws.ts --self-test`, 9 controls, "a gate that cannot fail proves nothing"). **Every police tool must ship `--self-test` with one planted defect per rule.** This is the highest-value single adoption and it is a re-adoption of salvaged discipline, not an import.
2. **A TCB document stating what is *not* claimed.** Concrete's names, per layer, the things it does not prove. `beyondCleanAxioms` being empty is a strong fact that says nothing about what is unproved. Pairs naturally with design B's ledger.
3. **Body fingerprints revoking proofs.** A changed body drops evidence to "proof stale". Foldlab's byte gates already do this structurally for *generated* artifacts; nothing does it for the prose-to-theorem bindings design A creates. Worth holding as a named follow-up rather than a slice.
4. **The proof/implementation boundary ratchet** (`check_proof_namespace.sh` + allowlist). Not yet applicable — `library/cas` has no ProofKit split. It becomes applicable the moment one is proposed, and the lesson is that **the boundary needs a mechanical ratchet or it erodes**.
5. **"No construct may be semantically dark"** (`KNOWN_HOLES.md`) — a hole is acceptable only while *tracked, gated, and disclosed*, never while *silent*. This is design B's charter, better phrased than I would have phrased it.
6. **Their cautionary tale**, which is the most useful thing they offer: `check_docs_drift.sh` did not catch their own stale `ARCHITECTURE.md`. **Drift gates catch what they are pointed at.** M6 is foldlab's instance of the identical failure.

**From the book: almost nothing.** `Expr`'s shape, the `lit`/`proj` caveat that constrains design C's honesty, and the options chapter. The environment-auditor techniques the brief hoped to extract are not in it, and the load-bearing question (attribute persistence) I answered by experiment instead.

## 4. Ruling asks

1. **Is the obligation vocabulary closed?** B keys on a fixed keyword set; an ad-hoc synonym is silently invisible. Proposed closed set: `owed`, `obligation`, `parked`, `un-parked`, `discharged`, `pin pending`, `sub-obligation`.
2. **Does a discharged obligation stay in the ledger?** History (audit trail, ledger grows) or hygiene (ledger shows only live debt)? Three declarations are currently `discharged` in place.
3. **Ruling-ID namespace.** The queue's bare `1..33` collide with `R<n>`, `D<n>`, `L<n>`, `S<n>`, `AE-<n>`, `SYS<n>`, `EXT-<n>` and each other. The old era recorded a live `C1` collision between two unrelated laws and had to invent `entity-C1` to disambiguate. **Ask: a prefix (e.g. `SM-33`) before the index binds anything**, because the index makes the collision machine-visible and therefore expensive.
4. **Queue item 24** — fold `Cas.Backend.*` into the walk. My probes confirm it is a one-line import change. Recommend it rides the E refactor.
5. **Design C's gate posture** — confirm that proof edits are legitimate re-gen events, so burden telemetry can be byte-gated on exact numbers rather than softened into bands.
6. **`linter.missingDocs`** — accept as a ratchet target (would flag ~775 declarations today), or decline.
7. **TOOLS.md admission** — do police tools need rows? They emit no new trust: `elan / Lake / Lean 4` is already admitted as "the kernel is the trust anchor … axiom reports required", and `Surface` ships today without its own row. Recommend a single row covering the reflexive suite, for C7 legibility rather than trust.
8. **Provenance** — re-materialize `.reference/clones/concrete` (§0), or record that transplant verification is PC-only.
9. **Stale defect register** — strike the `Cas/Backend/Ts.lean → Cas.Schema.Foreign` line from `SCHEMA-MATERIALIZATION.md:574`; fixed in `34145109` (M6).

## 5. The one tool to build first

**`lake exe obligations` — design B, slice B1.**

Not A, despite item 33 being the named ask. A's forward direction needs a ruling registry that does not exist as data, and minting it is blocked on ask 3 (the ID namespace). Building A first means building it twice.

Not C or D, which are unblocked but answer questions nobody is currently getting wrong. B is the one whose absence is actively costing: forty named obligations are load-bearing prose that nothing reads, and M6 proves the estate's prose ledgers have **already** started drifting from the tree.

B is also the only one of the six that requires **no new convention, no new registry, and no ruling**. It is pure extraction from what is already written, and its output is exactly the input A will later bind against.

**Exact scope of B1:**

- New `tools/Obligations.lean`, `root = "Obligations"`, `supportInterpreter = true`, driven by `Gate.main "lake exe obligations"`.
- Import `#[{module := `Cas}, {module := `Cas.Backend.Ts}]` — closing queue item 24 in the same slice at zero extra cost.
- Walk `env.constants`, filtering `isInternalDetail` and reusing `Surface.isGenerated`. For each surviving `Cas` declaration read `findDocString?`; for each `Cas` module read `getModuleDoc?`.
- Match the closed keyword set (ask 1). Emit per row `{module, declaration, state, keyword, excerpt}`, sorted by module then declaration — the same total order `Surface.collect` uses, so diffs are stable.
- Health counters in the document head: `formless` (read from `Cas.Grammar.Manifest`, do not recompute), `emptyDenotations`, `pinPending`, `parked`, `owed`, `discharged`.
- One fixture: `surface/cas-obligations.json`. Wiring **W**.
- `--self-test` with one planted defect per rule (adoption F1), following `check-laws.ts`'s nine-control shape: a docstring that loses its keyword, a state that reverts, a health counter that goes stale.

**Not in B1:** since-when (needs git, §3B); the law binding (that is A); any attribute (that is A's upgrade); the walker refactor — though **if E is done first, B1 shrinks by roughly half**, and doing E first is the better sequencing if the operator is willing to accept one declared re-gen of `cas-surface.json`.

**Cost:** ~130 lines of Lean plus ~15 of wiring; ~80 more for `--self-test`. Runtime dominated by the single `importModules`, ~11 s warm.

**Done means:** green `mise run check:cas`, clean tree after `mise run gen`, `--self-test` showing every control fires, and the forty obligations that are currently prose readable as data — with `Ty.context`'s formless row, the four `Empty` denotations, and the one `CORPUS PIN PENDING` citation counted in the document head rather than remembered.
