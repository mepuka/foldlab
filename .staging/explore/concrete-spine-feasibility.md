# Concrete-based hash-chainable language spine — feasibility probe

Date: 2026-08-24. Probe over the pinned local clone; read-only (fetch only, no checkout changes, no push).

| Identity | Value | Receipt |
|---|---|---|
| Clone | `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete` | — |
| Pin (HEAD) | `28a25a4e27fd2eaed5193e5f1c1454e06399506f` 2026-07-31 13:22:43 -0300 "docs: make R-0004 the evidence-integrity frontier" | `git log -1 --format="%H %ad %s" --date=iso` |
| Remote | `origin git@github.com:lambdaclass/concrete.git` | `git remote -v` |
| Upstream head (after fetch) | `28a25a4e27fd2eaed5193e5f1c1454e06399506f` — **identical to the pin** | `git fetch origin --verbose` → `= [up to date] main -> origin/main` (exit 0); `git log -1 origin/main` |
| Clone toolchain | `leanprover/lean4:v4.28.0` | `Get-Content lean-toolchain` |
| Upstream toolchain | `leanprover/lean4:v4.28.0` | `git show origin/main:lean-toolchain` |
| Target toolchain (lab artifact) | `leanprover/lean4:v4.33.1` — installed | `elan toolchain list` includes `leanprover/lean4:v4.33.1` |

## 1. Upstream delta: ZERO

- `git fetch origin --verbose` (2026-08-24) returned `= [up to date] main -> origin/main`, exit 0. The fetch worked; there is simply nothing new.
- `git rev-list --count 28a25a4..origin/main` → `0`. The pin **is** the upstream head. Upstream `main` has not moved since 2026-07-31.
- Consequently every sub-question is answered by vacuity **for main**: no toolchain bump (upstream `lean-toolchain` is still `v4.28.0`, receipt above), no Core IR changes, no check-proofs / theorem_lookup / fingerprint fixes, no R-0004 / ProofSubjectDigest movement, no content-addressing or hashing commits. Adjudicated defects on the pin (check-proofs 0/11, theorem_lookup, unbound fingerprints) are still the upstream state of the world.
- Branch/PR sweep for hidden activity: `git ls-remote origin` lists 22 branches and PR refs up to `refs/pull/240`. Fetched the four newest PR heads (237–240) read-only and dated them:
  - `afae4d5 2025-12-31 improve env setting` (PR 237)
  - `4b02b20 2026-03-31 Cleanup` (PR 238)
  - `7057d24 2026-03-31 Merge branch 'main' into lean_implementation` (PR 239)
  - `7f920b3 2026-06-02 merge: lambdaclass/concrete main into concrete2 (ours wins)` (PR 240)
  - Receipt: `git fetch origin refs/pull/{237..240}/head` then `git log -1 --format="%h %ad %s" --date=iso <sha>`. All four predate the pin — no PR head is newer than 2026-07-31 either.
- Caveat (open, not established): ls-remote shows refs, not dates; branches other than the four dated PR heads were not individually dated. But since `main` == pin and the newest PR number's head predates the pin, there is no evidence of any upstream work newer than the pin.

## 2. Core IR portability to v4.33.1

### Locating the Core IR

The Core IR is `Concrete\Elab\Core.lean` — 421 lines (receipt: `(Get-Content ...\Concrete\Elab\Core.lean).Count` → 421), header comment "Core IR — typed, desugared intermediate representation". It defines `Callee`, mutual `CExpr`/`CMatchArm`/`CStmt`, and structures `CFnDef`, `CStructDef`, `CEnumDef`, `CTraitMethodSig`, `CTraitDef`, `CTraitImpl`, `CModule`, plus a pretty-printer.

It is NOT import-free. Full transitive import closure (receipt: `Select-String '^import'` over each file):

| File | Lines | Imports |
|---|---|---|
| `Concrete\Elab\Core.lean` | 421 | `Concrete.Frontend.AST` |
| `Concrete\Frontend\AST.lean` | 671 | `Concrete.Frontend.Token`, `Concrete.Resolve.Intrinsic` |
| `Concrete\Frontend\Token.lean` | 141 | (none) |
| `Concrete\Resolve\Intrinsic.lean` | 352 | (none) |

Closure = 4 files, 1585 lines, closes inside the repo with no external package dependency (Lean core only). The earlier lab description "~421-line dependency-free file" is accurate for line count but wrong on "dependency-free": Core.lean needs `Ty`/`BinOp`/`UnaryOp`/`CapSet`/`Span`/`NewtypeDef` from AST.lean and `BuiltinEnumId`/`BuiltinTraitId` from Intrinsic.lean.

### Upstream version of the file

Identical by construction: origin/main == 28a25a4 (Section 1), so `git show origin/main:Concrete/Elab/Core.lean` is byte-identical to the working-tree pin. A separate upstream compile run is therefore the same experiment.

### Compile experiment at v4.33.1: COMPILES CLEAN

Setup (scratch dir `...\scratchpad\coreir433`, outside the clone): copied the 4-file closure preserving the `Concrete\` layout, wrote `lean-toolchain` = `leanprover/lean4:v4.33.1`. Elan resolved it: `lean --version` in that dir → `Lean (version 4.33.1, x86_64-w64-windows-gnu, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)`.

Compiled in dependency order with `LEAN_PATH` pointing at a local `olean\` tree, full output redirected to per-file logs (`lean <file> -o <olean> *> <log>`):

```
=== lean Concrete\Resolve\Intrinsic.lean -> EXIT=0 (log bytes: 0)
=== lean Concrete\Frontend\Token.lean    -> EXIT=0 (log bytes: 0)
=== lean Concrete\Frontend\AST.lean      -> EXIT=0 (log bytes: 0)
=== lean Concrete\Elab\Core.lean         -> EXIT=0 (log bytes: 0)
```

All four exit 0 with **zero bytes of diagnostics** — not even warnings. Produced artifacts (receipt: `Get-ChildItem -Recurse olean`): `Intrinsic.olean` 1,299,640 B, `Token.olean` 1,984,024 B, `AST.olean` 4,977,928 B, `Core.olean` 2,927,696 B.

### Upstream-version run

Byte-identical input, so the same result. Receipt: `git rev-parse origin/main:Concrete/Elab/Core.lean` → `771bec36e0dd39568c264dd6c5a6079b7f2ad086` == `git hash-object Concrete/Elab/Core.lean` (working tree) → `771bec36e0dd39568c264dd6c5a6079b7f2ad086`.

**Headline established fact: Concrete's Core IR (v4.28.0 source, 4-file closure, 1585 lines) is consumable at Lean v4.33.1 with zero changes.** No API-drift or language-level failures occurred; there was nothing to characterize.

## 3. Core IR shape for content-addressing

All from first-hand reading of the pinned files (upstream is byte-identical, Section 1).

### Binders: embedded surface names, no indices

Every binder and every variable reference in the Core IR is a raw `String` holding the (elaborator-suffixed) surface name. There are no de Bruijn indices anywhere in `Core.lean`. Receipts:

- `CStmt.letDecl (name : String) ...` — Core.lean:107
- `CExpr.ident (name : String) (ty : Ty)` — Core.lean:78
- `CMatchArm.varArm (binding : String) ...`, `enumArm ... (bindings : List (String × Ty))` — Core.lean:101-103
- `CStmt.borrowIn (var : String) (ref : String) (region : String) ...` — Core.lean:122
- `CFnDef.params : List (String × Ty)`, `typeParams : List String` — Core.lean:132-133
- Loop labels: `while_ ... (label : Option String)`, `break_/continue_ (label : Option String)` — Core.lean:114-120

Concrete's own Elab alpha-renames match binders by appending a dot-suffix (`value` → `value.b7`); their fingerprint strips it back to the surface name via `stripAlpha` (ProofCore.lean:483-492, comment "Bug 045 ... Fingerprints ... must be INVARIANT under that renaming"). So the representation is name-carrying, made invariant only to the *elaborator's* renames — a user renaming `x` to `y` changes the IR term and every digest derived from it.

### Constructor inventory a canonical encoding must cover

Counted from the pinned definitions: `Callee` 2 ctors (both carry a String); `CExpr` 23 ctors; `CMatchArm` 4; `CStmt` 13 (Core.lean:40-124); from the import closure: `Ty` 27 ctors (AST.lean:62-86), `CapSet` 4 (AST.lean:10-15), `BinOp` 24, `UnaryOp` 3 (AST.lean:120-145).

String/Name-carrying fields (the alpha-sensitivity surface): `Callee.direct name`/`indirect binding`; `CExpr.strLit`, `.ident name`, `.call callee`, `.structLit name + field names`, `.fieldAccess field`, `.enumLit enumName variant + field names`, `.fnRef name`; all four `CMatchArm` forms; `CStmt.letDecl/assign name`, `while_/break_/continue_ label`, `fieldAssign field`, `borrowIn var ref region`; `Ty.named/.generic name/.typeVar name`; `CapSet.concrete (List String)/.var name`. Non-string hazards: `CExpr.floatLit (val : Float)` (NaN/-0.0/decimal-rendering must be pinned by any canonical encoding; today's fingerprint uses `toString v`).

Provenance fields that would poison a content address and must be excluded: `declSpan : Option Span` on `CFnDef`/`CStructDef`/`CEnumDef`/`CTraitDef`/`CTraitImpl` (`Span` = line/col/endLine/endCol, Token.lean:45-49) and `CModule.sourceFile : String` (Core.lean:208). Body-level `CExpr`/`CStmt` nodes carry **no** spans — spans stop at declaration granularity, which is favorable for body hashing.

A Core→Core normalization pass already exists: `Concrete\Elab\CoreCanonicalize.lean` (167 lines) — sorts wildcard match arms last, reorders struct-literal fields to definition order, normalizes `Ty.generic "Heap" [t]` → `Ty.heap t` (its module doc, lines 5-13).

### Where fingerprints are computed and what is hashed today

Two generations of digest exist on the pin, both ultimately SHA-256 via the in-repo spec:

1. **Legacy `bodyFingerprint`** — `Concrete\Proof\ProofCore.lean:494-555`: `fingerprintExpr`/`fingerprintStmts` serialize the Core statement list to an S-expression-like String (`bodyFingerprint (body : List CStmt) : String`, lines 554-555). Computed per function at ProofCore.lean:2160 (`let fp := bodyFingerprint f.body` in `extractModule`) and ReportVC.lean:162-165 (`coreFnFingerprints`). For in-source storage it is hashed by `shortHash` (ProofCore.lean:1879-1883): **SHA-256 of the UTF-8 bytes, truncated to the first 16 bytes (128 bits), lowercase hex**, using their own `Concrete.Sha256Spec` (FIPS 180-4 spec file, `Concrete\Proof\Sha256Spec.lean`, with "abc" and empty-string test vectors at lines 187/193). Staleness compares `shortHash(currentFp)` against the stored `#[proof_fingerprint("…")]` attribute (Report.lean:2608-2610; AST.lean:338).
   What the hashed string contains: literals, **surface binder and variable names** (suffix-stripped: `(var {stripAlpha name})`, `(let {stripAlpha name} …)`; `borrowIn` names not even stripped, line 550), callee names, struct/enum/field names, loop labels. What it omits (their own bug 059 admits this, quoted in Section 4): parameter list, return type, generics/bounds, capabilities; also the declared type and mutability of `letDecl` (`.letDecl name _ _ val`, line 536), all node types except the `cast` target, and call `typeArgs` (line 503 discards them).
2. **`sourceBodyDigestV1`** (newer, R-0004 slice 4) — Report.lean:1560-1562: `shortHash (Proof.pexprCanonical pexpr)` over the *extracted* PExpr (not Core), where `pexprCanonical` (Proof.lean:512-538) is a length-prefixed, tagged encoding (`lpx tag s = tag ++ length ++ ":" ++ s`) built for injectivity. Its own comment (Report.lean:1544-1548): "DELIBERATELY NOT the legacy `bodyFingerprint`. That ... is the proof-freshness fingerprint that bugs 058-060 are filed against". It is marked `receiptEligible := false`, `scope := "body_only"` (Report.lean:1557-1558). **It still embeds binder names**: `pexprCanonical (.var n) = lpx "V" n`, `(.letIn n v b) = lpx "T" n ++ ...` (Proof.lean:514, 517), and the `normalizePExpr` pass it runs through (ProofCore.lean:617-633) does dead-let elimination, algebraic identities, and `stripAlpha` — but no index conversion or canonical renaming. User-chosen binder names move both digests on the pin.

## 4. R-0004 / evidence-integrity status

The pin commit ("docs: make R-0004 the evidence-integrity frontier") is a **single squash commit** — `git rev-list --count 28a25a4` → `1`; the entire repo history is this one commit, so R-0004's text on the pin IS its latest upstream text (Section 1: main hasn't moved). "R-0004" occurs in 28 files under `docs\` (73 occurrences); the normative task definition is `ROADMAP.md` lines 880-1318.

Load-bearing commitments, quoted:

- Frontier status — ROADMAP.md:854-855: "R-0004 is now the frontier: every later proof multiplier depends on its subject digests, typed dependency roots, and replay receipts meaning what they claim."
- Slice table — ROADMAP.md:901-909: slices 1 (executable witnesses), 2 (missing-fingerprint containment), 3 (dependency containment) **LANDED**; slice 4 (replay/table foundation, receipt-envelope plumbing) **ACTIVE**; slice 5 "complete semantic `ProofSubjectDigest`" **PENDING**; slice 6 (deterministic SCC/Merkle dependency root) **PENDING**; slice 7 (receipt issuance) **PENDING**. Also ROADMAP.md:1160: "Step 5 remains unstarted."
- ProofSubjectDigest definition — ROADMAP.md:1237-1243: "Replace body-only freshness with a versioned canonical `ProofSubjectDigest` covering qualified semantic identity, full typed signature and generic constraints, capabilities, normalized typed body, requires/ensures/invariants, the normalized selected specification and claim scope/coverage, and extraction/schema version. The theorem and toolchain are evidence about that subject; their identities belong in the receipt, not in the semantic subject digest."
- Binder-name sensitivity commitment — completion gate, ROADMAP.md:1291-1294: "semantic edits to identity, signature, types, generics, capabilities, body, contracts, selected specification, or claim scope move the subject digest, while comments, formatting, source paths, spans, and capture-avoiding alpha renaming do not". I.e. upstream is *committed to* alpha-invariant digests but has not built them (slice 5 pending; both shipped digests embed binder names, Section 3). Related: `CallableId` "[c]arries no span, path, alias or binder field, so alpha-renaming cannot move it" (ROADMAP.md:997-998) — landed, but it is identity-of-callable, not a body digest.
- Versioned digests / legacy handling — ROADMAP.md:1248-1254: "Only after the final subject digest and dependency root exist may successful kernel replay issue a receipt. ... A legacy fingerprint or receipt schema becomes `needs_recheck`, not `stale`: the evidence format changed, not necessarily the program."
- The check-proofs defect the lab reproduced is documented in the same file — ROADMAP.md:1269-1272: "The same HMAC input currently reports 11 verified / 0 failed from the repository root but 0 / 11 `theorem_lookup` failures and `Toolchain: unknown` from `examples/hmac_sha256/`; the replay-foundation slice must eliminate that cwd-dependent verdict before any receipt is accepted." Note the internal tension on the pin: ROADMAP.md:1212 claims "The workspace-resolution half has LANDED" (check-proofs resolves the Lake workspace by walking up from the input) while 1269 still says "currently reports". The lab's 2026-08-24 repro (0 verified / 11 failed) matches the broken behavior; this probe did not re-run check-proofs, so which sentence is stale is left open.
- Dependency fence — ROADMAP.md:1311-1313: "Until this completion gate holds, no task may graduate a new automatically discharged, multi-kernel, certificate-backed, or otherwise friendly `proved` claim as authoritative."
- Bugs 058/059/060/062 exist as committed documents: `docs\bugs\058_proof_by_without_fingerprint_never_stales.md`, `059_body_fingerprint_omits_signature_and_types.md` ("**Status:** Open — second of R-0004's evidence-integrity defect class", line 3; root cause quotes `bodyFingerprint` and the discarded `_` type positions, lines 20-40), `060_contracts_outside_proof_fingerprint.md`, `062_proof_dependency_staleness_does_not_propagate.md`.

## Established facts (each with receipt)

1. Upstream `main` head == the pin `28a25a4e27fd...` ; zero commits of delta. (`git fetch origin --verbose` → "= [up to date]", exit 0; `git rev-list --count 28a25a4..origin/main` → 0.)
2. Upstream toolchain is still `leanprover/lean4:v4.28.0`. (`git show origin/main:lean-toolchain`.)
3. No upstream fix exists for check-proofs / theorem_lookup / fingerprints, and no R-0004 movement, on `main` — vacuously, by fact 1. The four newest PR heads (237-240) all predate the pin (dates 2025-12-31 .. 2026-06-02; `git log -1` on each fetched head).
4. The pinned history is a single squash commit. (`git rev-list --count 28a25a4` → 1.)
5. The Core IR is `Concrete\Elab\Core.lean`, 421 lines; its transitive import closure is exactly {Core.lean, Frontend\AST.lean 671, Frontend\Token.lean 141, Resolve\Intrinsic.lean 352} = 1585 lines, no external packages. (`Select-String '^import'` on each; `(Get-Content).Count`.)
6. **That closure compiles clean under Lean v4.33.1 — all 4 files exit 0 with zero diagnostics** and produce .olean artifacts. (`lean <file> -o <olean> *> log` in a scratch dir whose `lean-toolchain` = v4.33.1; `lean --version` there → 4.33.1; all logs 0 bytes.)
7. The upstream copy of Core.lean is byte-identical to the pin's. (`git rev-parse origin/main:Concrete/Elab/Core.lean` == `git hash-object Concrete/Elab/Core.lean` == `771bec36e0dd...`.)
8. Core IR binders are embedded surface-name Strings; no de Bruijn indices. (Core.lean:78,101-103,107,122; quoted in Section 3.)
9. Body-level Core nodes carry no source spans; spans (`declSpan`) and `sourceFile` exist only at declaration/module granularity. (Core.lean:146,159,168,178,186,208; Token.lean:45-49.)
10. Today's proof fingerprint = SHA-256 (in-repo FIPS 180-4 spec) truncated to 128 bits over an S-expression string of the Core body that embeds binder names and omits signature/types/contracts. (ProofCore.lean:494-555, 1879-1883; bug 059 doc; quoted in Sections 3-4.)
11. The newer `sourceBodyDigestV1` (length-prefixed injective encoding, `pexprCanonical`) also embeds binder names and is explicitly non-authoritative (`receiptEligible := false`). (Proof.lean:512-538; Report.lean:1544-1562.)
12. R-0004 commits to a versioned, alpha-invariant `ProofSubjectDigest`, but that slice (5) is PENDING/"unstarted" on the pin == upstream head. (ROADMAP.md:901-909, 1160, 1237-1243, 1291-1294.)

## Open questions

1. Whether `check-proofs` is actually still broken on the pin vs. partially fixed — ROADMAP.md contains both a "LANDED workspace-resolution" claim (line 1212) and a "currently reports 0/11" description (line 1269); this probe did not re-run the tool. The lab's prior 2026-08-24 adjudication (0 verified / 11 failed) stands as the last measurement.
2. Whether the full Concrete *pipeline* (not just the IR types) builds at v4.33.1 — only the 4-file Core IR closure was tested. `Concrete.lean` root imports 60+ modules; untested here.
3. Un-dated upstream branches: `ls-remote` shows 22 branches; only 4 PR heads were dated. No evidence of post-pin activity, but branches were not exhaustively dated.
4. Canonical-encoding design questions a spine would have to decide (not facts): how to treat binder names (canonical renaming vs. index conversion), `Float` literal canonical form, `CModule.sourceFile`/`declSpan` exclusion, and whether to hash pre- or post-`CoreCanonicalize`.
5. Whether hashing Core IR terms with the lab's SHA3-512 (formal/fips202, v4.33.1) composes end-to-end — nothing tested; only the precondition (Core IR consumable at v4.33.1) is established (fact 6).
