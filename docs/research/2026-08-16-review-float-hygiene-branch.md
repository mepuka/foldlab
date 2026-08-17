# Rev review — `agent/codex/kernel-hygiene-gates`

Independent Rev seat, 2026-08-16. Two commits on `main` (`e9fe0a3be`):

| commit | subject |
|---|---|
| `d8393388b` | Drop float leaf from flb.type.v0 (brief 21 / post-sweep ruling 2) |
| `7cfb0b660` | Add kernel source hygiene gates (brief 22 / post-sweep ruling 4) |

Findings only. Nothing was fixed, committed, or pushed; the branch is
untouched.

---

## VERDICT: **FINDINGS**

Twelve findings: **1 blocker, 5 major, 6 minor**. Every gate the branch
claims was reproduced green by this seat. The blocker is not a broken
gate — it is that the ruling's *stated purpose* is not achieved by the
cut the branch performs, and that gap is load-bearing for REF-2a's
`proved` claim.

**One sentence:** the `{"k":"float"}` leaf is completely and correctly
removed from every one of the ~14 grammar restatements in the tree, and
the hygiene gate is real, blocking, and catches everything it says it
catches — but non-integer numbers still enter `flb.type.v0` identity
bytes through `{"k":"literal","value":<json scalar>}`, so REF-2a's
canonical-value grammar is *not* float-free and the shortest-round-trip
obligation ruling 2 was dropping the leaf to avoid is still owed.

---

## Review environment (read this first)

**The briefing's premise was wrong and I worked around it.** The task
said "the branch is free; the primary checkout holds main." It does not:

```
$ git worktree list --porcelain
worktree C:/Users/kokok/Dev/foldlab
HEAD 7cfb0b6602a21566cb09efafa0fa014344d6b973
branch refs/heads/agent/codex/kernel-hygiene-gates      <-- primary is ON the branch
```

`main` is at `e9fe0a3be`. Because the branch is checked out in the
primary, a second worktree cannot claim it. I reviewed from a **detached
worktree at the branch tip** instead — semantically identical for review:

```
$ git worktree add --detach C:/Users/kokok/Dev/foldlab-rev-hyg 7cfb0b660
HEAD is now at 7cfb0b660 Add kernel source hygiene gates
```

All build/test work below ran in `C:\Users\kokok\Dev\foldlab-rev-hyg`.
Consequence for this file: it lands in the primary checkout, which is
currently on the branch rather than on `main`. It is untracked either
way. **Do not let it ride into a branch commit.**

Second environment note: `bun run gates` does **not** run `bun install`
in `proto/ts`, and `proto/ts` carries its own lockfile. A fresh worktree
fails the `proto/ts — typecheck` stage with ~130 `TS2307 Cannot find
module 'effect'` errors until `cd proto/ts && bun install` is run — the
sequence `AGENTS.md` documents for the scoped gate. Not a branch defect;
recorded so the next seat does not mistake it for one.

---

## Gate transcripts

Every gate was run by this seat in the review worktree. Nothing below is
quoted from a report.

| gate | exit | result |
|---|---|---|
| `bash verify/moves/run.sh` | **0** | green, both new hygiene checks and both new controls active |
| `bash verify/ir/run.sh` | **0** | green (`GATE: PASS (IR model proofs check)`) |
| `bun run gates` (first attempt, stock worktree) | **2** | red at `proto/ts — typecheck`, environment (`bun install` not run in `proto/ts`) |
| `bun run gates` (after `cd proto/ts && bun install`) | **0** | `FOLDLAB GATES: PASS`, all 13 stages |

`verify/moves/run.sh`, full `GATE:` line set:

```
GATE: PASS (kernel annotations: implemented_by absent, extern allowlist clean)
GATE: PASS (kernel sources: panic!, partial, and sorry absent)
GATE: PASS (implemented_by negative control refuted on its named check)
GATE: PASS (panic! negative control refuted on its named check)
GATE: build passed
GATE: PASS (move-calculus proofs, kernel hygiene, axiom footprint, spec pin, orphan rule, corpus regeneration)
```

`verify/ir/run.sh`:

```
✔ [2/5] Built IR.Syntax (1.2s)
⚠ [3/5] Built IR.Semantics (1.1s)     [linter note only: "try 'simp' instead of 'simpa'" at IR/Semantics.lean:353:18]
✔ [4/5] Built IR (597ms)
Build completed successfully (5 jobs).
GATE: PASS (IR model proofs check)
```

`bun run gates` stages, second run: bootstrap · root typecheck · root
tests · workspace packages · go fmt/vet/test · proto/go fmt/vet/test ·
proto/ts typecheck/tests → `FOLDLAB GATES: PASS`.

No gate was assumed. No gate could-not-run.

---

## Axis 1 — ruling conformance

### (a) Where the mintable float leaf actually lived, and whether the cut achieves the ruling's intent

**Brief-vs-reality, first.** Brief 21's letter says "the protocol VALUE
grammar (proto/SPEC.md, value_check.go)"; the commit says
"flb.type.v0". **The commit's map is the correct one.** `{"k":"float"}`
is a *type* kind in `flb.type.v0`, declared at `proto/SPEC.md:71` and
admitted on the value side by `value_check.go`. The two names point at
the same object from opposite ends of the seam; the brief's wording is
loose, not wrong. Documented, not a defect.

**The cut itself is complete.** I built the restatement survey
independently (see (g)) and found **every** site carrying the leaf was
removed. Tree-wide, after the cut, `git grep -nIw float` outside
`float64` returns only the new negative-control test, the DECISIONS
entries, and unrelated prose — zero live admission sites.

**But the ruling's intent is not achieved.** The ruling's rationale is
that with the leaf gone "REF-2a … satisfies REF-2's whole-grammar
charter and `proved` is reachable without formalizing
shortest-round-trip printing." Two paths still carry non-integer numbers:

1. **`literal` — inside the type grammar, into identity bytes.**
   `proto/SPEC.md:72` still declares `{"k":"literal","value":<json
   scalar>}`, and `proto/go/protod/walk.go:101-103` admits any `float64`
   with **no integrality bound**:

   ```go
   switch literal.(type) {
   case string, float64, bool, nil:
       return nil
   ```

   Contrast `value_check.go:45`, where the estate already knows how to
   write the constraint for `int`:
   `math.Trunc(number) == number && math.Abs(number) <= 9007199254740991`.
   That bound was not applied to `literal`.

   Executed in the review worktree (probe deleted after; worktree clean):

   ```
   PROBE-2 literal 21.5 IS LAWFUL v0; canonical bytes = {"k":"literal","value":21.5}
   PROBE-4 literal 1e+21   lawful; canonical = {"k":"literal","value":1e+21}
   PROBE-4 literal 1e-07   lawful; canonical = {"k":"literal","value":1e-7}
   PROBE-4 literal 0.1     lawful; canonical = {"k":"literal","value":0.1}
   PROBE-4 literal 5e-324  lawful; canonical = {"k":"literal","value":5e-324}
   PROBE-4 literal 1.7976931348623157e+308 lawful
   PROBE-5 wire-decoded literal 21.5 ADMITTED
   ```

   `5e-324`, `1e+21`, `1e-7` are *exactly* the ES2019 §7.1.12.1 /
   RFC 8785 §3.2.2.3 shortest-round-trip renderings — the single object
   RQ-9 measured at 1,865 of 3,296 lines and the ruling dropped the leaf
   to avoid formalizing. They are in the **type term**, so REF-2a must
   canonicalize them to derive the type's digest.

2. **`opaque` — on the fill-value side.** `value_check.go:34-35` is
   `case "opaque": return nil`. Probe: `checkValue({"k":"opaque"}, 21.5)`
   → `nil` (admitted). So "floats unreachable in fill values" is false.

**Was this disclosed?** Partly, and mis-framed.
`proto/DECISIONS.md:2655-2657` says "JSON-scalar numeric literals,
`opaque` values, and the RFC 8785 canonicalization seam remain
unchanged", and the rejected alternative is listed as "remove JSON
numbers generally" with the reason "narrowing JCS would cross the
explicit task boundary." Narrowing `literal.value` to integer scalars is
a **type-grammar** narrowing — precisely the brief's remit — not a JCS
narrowing. The alternative that would have closed the hole was rejected
under a reason that does not apply to it.

→ **F1 (blocker)**, **F2 (major)**. The disposition is an operator
ruling (narrow `literal.value`, or restate REF-2a's charter to exclude
literal scalars and re-price `proved`), not a silent fix.

### (b) Is the Lean IR edit lawful, minimal, and do the laws still check?

**Yes on all three.** `verify/ir/` is described in `verify/AGENTS.md:51`
as "the reference the Go and TS grammar restatements are meant to
mirror", so a leaf removal there is the same ruling applied to the
reference statement — lawful. The alternative ("defer the Lean change
until the referee engine") is recorded at `proto/DECISIONS.md:2657-2658`.

Minimal, exactly:

- `IR/Syntax.lean:28` — `| string | bool | int | float | null` → `| string | bool | int | null`
- `IR/Syntax.lean:10, 13-14` — comment, "13 kinds / five primitives" → "12 kinds / four primitives"
- `IR/Semantics.lean:106` — the one `.prim .float => …` conformance case deleted
- `IR/Semantics.lean:16-17` — abstraction note reworded
- `IR/README.md` — 2 prose updates

**No theorem statement, proof, or law was touched.** `conforms_resolver_mono`
absorbs the change through `cases p <;> simpa [conforms]` (Semantics.lean:322);
`Ty.close_embed`, `union_extensional`, `sort_preserves_meaning`,
`resolver_mono` are untouched. `bash verify/ir/run.sh` → exit 0. No
scope creep.

One prose defect: → **F9 (minor)**.

### (c) Does the allowlist ship empty?

**Yes.** `verify/moves/kernel-extern-allowlist.txt` is 9 lines, **all of
them comments** — zero entries. The header states the ratification rule
and the format, exactly as brief 22 §Gates requires:

```
# Kernel-owned @[extern] allowlist — intentionally empty at first freeze.
# Any future entry requires an operator-ratified reason recorded on the same
# tab-separated row. Format:
#   Moves/path.lean:LINE<TAB>SHA256_OF_EXACT_SOURCE_LINE<TAB>operator-ratified: DECISION-ID — reason
```

No finding. I additionally verified the mechanism works in both
directions (see Axis 2, probes L/M/N/O).

### (d) Fixtures: generated by executing the model, byte-for-byte?

**Split verdict.**

**Green — the four `wirefix` fixtures regenerate byte-identical.** I ran
the committed generation command into a clean directory and compared:

```
$ go run ./cmd/wirefix -force -dir <scratch>
wirefix: fixtures written
IDENTICAL: types.json
IDENTICAL: chains.json
IDENTICAL: frames.json
IDENTICAL: concierge.json
```

**Red — `sessions.json` has no generator.** `cmd/wirefix/main.go:317-322`
writes exactly four files; `sessions.json` is not one of them, and it
carries no `_provenance` field (`protocol-moves.json` is the only fixture
in that directory that does). This commit adds a **new claim** at
`proto/wire/CONTRACT.md:395-396` — "Its canonical events and dependent
heads are mechanically recomputed through `proto/ts/src/jcs.ts` when the
grammar digest moves" — and commits no script that does it. House law
requires "the provenance line is the generation command, and the gate
diffs a fresh regeneration byte-for-byte." Half of that is now asserted
and none of it is reproducible.

The re-serialization is visible in the diff: the file was rewritten by a
different formatter (`"seed": { "k": "hole" }` → expanded across three
lines), growing 73 → 90 lines. I separated semantic from cosmetic
change:

```
CHANGED /grammarDigest        d5ff3590… -> 78aff5581…
CHANGED /session              flb_session_v0_1190cc9e… -> flb_session_v0_66399b9a…
CHANGED /steps/0/event/grammar, /steps/0/canonical
CHANGED /steps/{0,1,2,3,4}/head
=> semantic value changes: 9
```

**9 values changed; the other ~17 lines are pure formatting churn** in a
file `proto/AGENTS.md:52` calls FROZEN. That violates "Preserve user
changes and avoid unrelated cleanup."

**Mitigating, and I verified it:** the *content* is right. I re-derived
the whole chain with an oracle outside both runtimes (my own
sorted-key canonicalizer + `node:crypto`, not repo code):

```
step 0  head MATCH   d8e6b389138552862591f5b13249af8040826599a4177042dc194b158c937e76
step 1  head MATCH   8070d7c60c75f2409e6bd76118f57e60b31fe01219ceafdf564c30e79037cdcd
step 2  head MATCH   21614d65360414f1f187ac641650fab63378fe012062a044099b9423f9b41ffc
step 3  head MATCH   ac001939629ce14015136c7dd6f7144b7a7e4cf3deb3f503bcbcfe87be24e5f8
step 4  head MATCH   d11f85c85553916e9dcd7c058525030ab45ff9b9c1e0046059b4c6b04b158759
session key MATCH   flb_session_v0_66399b9a769ac3eaa00df91965fdd414c935a99103f2c65e15952a50e378845f
INDEPENDENT ORACLE: sessions.json re-derives
```

So this is a **provenance/reproducibility finding, not a correctness
one** → **F6 (major)**.

**Frozen fixtures confirmed untouched:**

```
$ git diff --name-only e9fe0a3be..7cfb0b660 -- fixtures/ proto/wire/fixtures/golden-conformance.json
(empty)
```

`fixtures/golden-conformance.json` and `fixtures/jcs-rfc8785.json` both
exist and are byte-untouched. `proto/wire/` fixtures NOT touched:
`owned-types-v1.json`, `scheme-bridges.json`, `protocol-moves.json`,
`reply-conformance.json`, `refusal-sorts.json` — consistent with
`proto/DECISIONS.md:2672-2673`.

I also checked the one coupling that would have been easy to miss:
`RefusalSortGrammarDigest` (`proto/go/protod/refusal.go:23`,
`proto/ts/src/wire.ts:52`, `refusal-sorts.json:3`) is **not** derived
from the type grammar — `refusal_sort_test.go:43-59` derives it from
`{grammar, sortByKind}`, so the float drop correctly does not move it.
Not a finding; recorded because it looks like one.

### (e) The JCS seam fence

**Clean.** `go/canonical/**` and `packages/core/**` appear nowhere in
the two-commit diff:

```
$ git diff --name-only e9fe0a3be..7cfb0b660 -- go/canonical packages/core
(empty)
```

The executor stayed inside the boundary brief 21 drew. No finding.

### (f) Negative controls

**Both are correct and both are orphans.** Contents:

```
negative-controls/implemented-by.lean       negative-controls/panic.lean
  def plantedReplacement : Nat := 1           def plantedPanic : Nat :=
  @[implemented_by plantedReplacement]          panic! "negative control"
  def plantedDefinition : Nat := 0
```

Traces (`*.cex.txt`) name the exact check and line:

```
GATE: FAIL — forbidden @[implemented_by] at negative-controls/implemented-by.lean:2
GATE: FAIL — forbidden panic! at negative-controls/panic.lean:2
```

`run.sh:197-221` does the right thing: it requires status **1** (a
planted-violation refusal) and explicitly rejects status 2 as "failed in
gate machinery, not its planted violation", then byte-compares the
diagnostic to the committed trace. Each control is refuted on *its own*
check and passes the others — `panic.lean` clears the `implemented_by`
and `extern` checks before failing on `panic!`, which is the
independence property `verify/AGENTS.md` asks for.

**Orphan rule holds.** `lakefile.toml` declares exactly:

```toml
defaultTargets = ["Moves", "oracle"]
[[lean_lib]] name = "Moves"      [[lean_lib]] name = "Oracle"      [[lean_exe]] name = "oracle" root = "Main"
```

`negative-controls/` is not a lib root and is not under `Moves/`, so it
is unreachable from `lake build` and from the `find Moves` roster at
`run.sh:16-19`. Confirmed by the green build.

Three of the five shipped checks have no control → **F3 (major)**.

### (g) Brief 21's survey deliverable

**Absent from the tree.** The two commits add exactly six files:

```
A  proto/go/protod/float_leaf_test.go
A  verify/moves/kernel-extern-allowlist.txt
A  verify/moves/negative-controls/implemented-by.{lean,cex.txt}
A  verify/moves/negative-controls/panic.{lean,cex.txt}
```

None is a survey. `proto/DECISIONS.md:2649-2661` lists the sites
**touched** ("the Go certifier, completion/frontier alphabets, session
grammar descriptor, value checker, TypeScript author/session/codegen
mirrors, and the Lean TyX reference grammar") but not the sites
**checked-and-clean**, which brief 21 §1 required by name. Per
`AGENTS.md` a run closes with a report on the Multica issue; if the
survey was delivered it is there and outside this seat's reach — I can
only report it is not in the tree. → **F7 (major)**.

**So I built it.** Enumerating every restatement of the v0 kind alphabet
(`git grep -lI 'opaque'` over non-doc source, then reading each):

| # | site | file:line | status |
|---|---|---|---|
| 1 | grammar declaration | `proto/SPEC.md:71` | **touched** |
| 2 | certifier kind list | `proto/go/protod/walk.go:19-22` (`v0Kinds`) | **touched** |
| 3 | certifier leaf switch | `proto/go/protod/walk.go:77` | **touched** |
| 4 | value checker | `proto/go/protod/value_check.go:33-51` | **touched** |
| 5 | completion alphabet | `proto/go/protod/completion.go:27-32` | **touched** |
| 6 | frontier choices | `proto/go/protod/concierge.go:158-163` | **touched** |
| 7 | session grammar descriptor | `proto/go/protod/session.go:166-176` | **touched** |
| 8 | fixture corpus alphabet | `proto/go/cmd/wirefix/main.go:93-131` | **touched** |
| 9 | `contract.describe` surface | `proto/go/protod/contract.go:13-38` | **checked-clean** (describes reply shapes via `vKind`, never enumerates the alphabet) |
| 10 | author fold | `proto/ts/src/author.ts:158-171` | **touched** |
| 11 | effect-schema target | `proto/ts/src/codegen.ts:114-125` | **touched** |
| 12 | json-schema target | `proto/ts/src/codegen.ts:207-218` | **touched** |
| 13 | go target | `proto/ts/src/codegen.ts:334-345` | **touched** |
| 14 | TS session descriptor | `proto/ts/src/session.ts:28-40` | **touched** |
| 15 | Lean reference grammar | `verify/ir/IR/Syntax.lean:27-29` | **touched** |
| 16 | Lean semantics | `verify/ir/IR/Semantics.lean:98-123` | **touched** |
| — | test-side restatements | `conformance_test.go`, `normalize_test.go`, `session_conformance_test.go`, `concierge.test.ts`, `normalize.test.ts`, `session-journal.test.ts`, `author.test.ts`, `codegen.test.ts` | all **touched** |
| — | `packages/core`, `packages/moves`, `go/**` | — | **checked-clean** (no v0 kind alphabet) |

**Result: the cut is complete. No site was missed.** The finding is a
missing deliverable, not a missed cut — which is worth saying plainly,
because it is the difference between a bookkeeping fix and a re-run.

### (h) DECISIONS log entries

**Present on both sides, house format honoured** (decided / alternatives
/ why / load-bearing on every entry).

`proto/DECISIONS.md:2633-2677`, "Task 21 — float leaf drop", three
entries: the refusal reuse; the hard cut across every mirror; the
fixture regeneration and its stated reason. `verify/moves/DECISIONS.md`,
"Task 22 — kernel hygiene gates", two entries: **the kernel-bound scope
definition is recorded** as brief 22 required, plus the line-digest
allowlist binding.

I verified the recorded scope matches the code: DECISIONS says "scan
`Moves.lean` and every `*.lean` file recursively under `Moves/`";
`run.sh:16-19` is `kernel_sources=(Moves.lean)` plus
`find Moves -type f -name '*.lean' | LC_ALL=C sort`. **They match.**

`D??` placeholders rather than task-local numbers technically depart
from `proto/DECISIONS.md:23-26`, but that file already carries ten or
more `### D??` headings from prior merged tasks — this is the repo's
actual practice. Not raised as a finding.

### (i) The float-fill refusal, and the named refusal

**Correct, and the name is from the existing taxonomy.**
`proto/go/protod/float_leaf_test.go:13-40` drives a real fill vector
(`{"partial":{"k":"hole"},"path":[],"subtree":{"k":"float"}}`) through
`serveFill` and asserts four things: kind `invalid-structure`
(`KindInvalidStructure`), the **exact pre-existing law string**
("flb.type.v0: unknown kind refuses — the grammar grows under ticket
004, never by admission on faith"), path `["partial","k"]`, and
`got == "float"`. Pinning the law string is the right move: it is what
makes "no invented refusal name" mechanical rather than aspirational.

`invalid-structure` is in `CONTRACT.md:307`'s frozen table with sort
`structural`; no new kind was minted, so the frozen refusal-sort
manifest does not move (`proto/DECISIONS.md:2646-2647` reasons this
correctly). Consistent with CONTRACT.md's refusal semantics.

A second test (`:42-54`) pins the value-check side. A third
(`:56-105`) is the committed grep guard brief 21 §Gates asked for; it
has coverage gaps → **F8 (minor)**.

TS side carries the mirror behavioural test:
`proto/ts/test/codegen.test.ts:316-325`, "the removed float leaf is
underivable in every target", and `author.test.ts:138-140` asserts the
new `beyond-v0` local refusal for `Schema.Number`.

---

## Axis 2 — gate correctness

I planted violations in a real kernel source (`Moves/Model.lean`), ran
the full `run.sh` each time, and restored (`git status --short` empty
after every probe). `run.sh` is **blocking, not advisory**: the hygiene
sweep runs at lines 190-195, before the spec pin and before `lake build`,
and `exit $?` propagates 1 or 2.

**Does it catch?** Yes — all four:

| probe | planted | exit | diagnostic |
|---|---|---|---|
| A | `@[implemented_by Nat.succ]` | **1** | `GATE: FAIL — forbidden @[implemented_by] at Moves/Model.lean:1962` |
| B | `@[extern "lean_probe"]` | **1** | `GATE: FAIL — unallowlisted @[extern] at Moves/Model.lean:1962` |
| C | `def probeC : Nat := panic! "x"` | **1** | `GATE: FAIL — forbidden panic! at Moves/Model.lean:1962` |
| D | `partial def probeD : Nat := 0` | **1** | `GATE: FAIL — forbidden partial at Moves/Model.lean:1962` |

**Does it false-positive on comments?** No:

| probe | planted | exit | hygiene result |
|---|---|---|---|
| E2 | `-- implemented_by panic! partial extern` | **0** | both hygiene checks PASS |
| F2 | `/- implemented_by panic! partial extern -/` | **0** | both hygiene checks PASS |

The `lean_code_only` awk stripper (`run.sh:23-88`) handles nested `/- -/`,
docstrings, `--` to end-of-line, and multi-line strings, and preserves
line numbers so the reported line is the real one. I read the state
machine for evasion: `in_string` is checked before comment dispatch, so
`"-- text"` stays visible; `block_depth` is checked before `in_string`,
so `/- " -/` cannot leave a dangling string. Sound.

**String literals:** probe G, `def probeG : String := "panic! inside a
string"` → exit **1**. This is *deliberate* and documented at
`run.sh:24-27` ("interpolated strings can contain compiled expressions,
so treating their contents as inert would open an evasion channel"). The
task's "must not false-positive on … string literals" is a design
disagreement with a stated, defensible rationale, not a defect. Recorded
so the operator can rule if they disagree.

**Allowlist mechanism** (untested by any committed control — I tested it):

| probe | scenario | exit | result |
|---|---|---|---|
| L | `@[extern]` + correct `path:line<TAB>digest<TAB>operator-ratified: …` row | — | **both hygiene checks PASS** (the later `GATE: FAIL` is `lake build` rejecting an extern with no C symbol — not a gate defect) |
| M | same row, source line then edited | **1** | `GATE: FAIL — unallowlisted @[extern] at Moves/Model.lean:1962` |
| N | malformed row (`deadbeef`, no `operator-ratified:` prefix) | **2** | `GATE: FAIL — malformed kernel extern allowlist entry` |
| O | allowlist file deleted | **2** | `GATE: FAIL — kernel extern allowlist is missing` |

Probe M is the important one: it proves the D?? claim that "extern
approvals bind to one exact source line" is *mechanically* true, not
just documented. The digest binding works.

**Does the panic-free gate's scope match the DECISIONS entry?** Yes,
verbatim (see (h)).

**Where it does not catch** — the substantive gate finding. `run.sh:171`
greps the literal token `panic!` only:

| probe | planted | exit | verdict |
|---|---|---|---|
| H | `def probeH : Nat := panic "evade"` | **0** | **FALSE NEGATIVE** |
| I | `def probeI : Nat := ([] : List Nat).head!` | **0** | **FALSE NEGATIVE** |
| K | `unsafe def probeK : Nat := 0` | **0** | not checked at all |
| J | `theorem probeJ : (1+1 = 2) := by native_decide` | 1 | caught, but by the pre-existing orphan rule, not by hygiene |

Lean core's `panic [Inhabited α] (msg : String) : α` and the whole
bang-suffixed accessor family (`head!`, `get!`, `toNat!`, `back!`) do
**exactly** what RQ-1 documented — return the type's `Inhabited` default,
write one line to stderr, exit 0 — without ever writing the token
`panic!`. Both probes compiled, and `run.sh` returned **0** with a live
default-returning path inside a kernel-bound source. → **F4 (major)**.

Mitigating: I swept the current roster and it is clean —
`Moves.lean` + `Moves/{Model,Spec,SpecDischarge,SpecProofs,Violations}.lean`
contain no bang-accessor, no `unsafe`, no `noncomputable`, no
`native_decide`. The hole is prospective, not presently open.

---

## Axis 3 — standard code review

**Shell (`verify/moves/run.sh`, +221/-1).** Read line by line. No
correctness bug found. Specifically checked and found sound: `if
check_kernel_hygiene …; else exit $?` correctly propagates 1 vs 2
(confirmed empirically, probes A and N); `first_source_hit` returns 0
with empty stdout when nothing matches (a bare `if` with no `else` exits
0, so the function does not spuriously fail); the allowlist `while read`
runs in the current shell via file redirection so `allowed_extern`
survives; the extern loop's `while … done < <(…)` keeps `return 1` in
the function's frame; `local -A` and `local … source_line` prevent
leakage; `|| true` guards every `grep` under `pipefail`. Only removed
line is the final PASS message, correctly reworded.

Two robustness notes, neither exploitable today: a missing `Moves/`
directory would leave a 1-element roster that passes the
`${#sources[@]} -eq 0` guard (`run.sh:122-125`); and the `sorry` check
at `run.sh:183-187` is strictly weaker than the pre-existing
`grep -rnE '(sorry|admit)'` at `run.sh:243`, which also scans comments
and covers `Oracle`/`Main.lean` — the new one is redundant but harmless
(brief 22 asked for it by name).

Line endings: `.gitattributes` pins `* text=auto eol=lf`, `*.sh text
eol=lf`. `git check-attr -a` confirms `eol: lf` on the new
`kernel-extern-allowlist.txt`, `*.cex.txt`, and `*.lean` controls — so a
Windows checkout cannot break the byte comparison at `run.sh:214-219`.
Correctly handled.

**Go.** `value_check.go` and `walk.go` deletions are clean case removals
with no fallthrough change; the default `valueRefusal` at
`value_check.go:129` now catches `{"k":"float"}`, which is the intended
path. `completion.go`, `concierge.go`, `session.go` are one-line
alphabet deletions. `cmd/wirefix/main.go` swaps the sensor's `celsius:
float` for `reading: opaque` and the payload key accordingly; note
`buildFrames` still indexes `types[len(types)-3]` (`:179`) — that
positional coupling survived the vector deletion because `leaf-float`
was removed from the head of the list, but it is fragile and unrelated
to this change.

**TypeScript.** `author.ts:164-167` is the only behavioural change on the
TS side and it is the right one — `Schema.Number` now returns the
existing local `beyond-v0` refusal instead of minting a leaf, with an
actionable message ("use int, a literal, or opaque"). `codegen.ts` drops
three target cases symmetrically. `session.ts` drops one descriptor row.

**Silent behaviour changes beyond the two briefs — one found.** Removing
the float row from the session grammar descriptor moves the **session
grammar digest**: `d5ff3590…` → `78aff5581…`. Every persisted
`flb.session.v0` journal opened under the old digest is now unopenable
and unreplayable (`session.go:195`, law "flb.session.v0 opens against the
daemon's exact grammar digest"). `proto/DECISIONS.md:2668` records that
the digest moves but not this consequence. Impact is bounded —
`proto/AGENTS.md:85` says tracer data is disposable — but it is an
unrecorded cutover. → **F12 (minor)**.

**Test-side review.** The test edits are minimal and none weakens a wall:
`conformance_test.go:664` tightens the advertised-kind assertion 13 → 12;
the property generators in `normalize_test.go:253` and
`normalize.test.ts:17` narrow the alphabet in step with the grammar;
`session_conformance_test.go:213` updates the deliberately-hand-restated
black-box descriptor. That last one is worth naming: it is a second copy
of the descriptor kept as a drift oracle, and both copies were edited in
the same commit — the independence is only as good as the reviewer's
eye. I read both and they agree.

---

## Findings

| # | sev | file:line | finding |
|---|---|---|---|
| F1 | **blocker** | `proto/SPEC.md:72`, `proto/go/protod/walk.go:101-103` | Non-integer numbers still enter `flb.type.v0` identity bytes via `{"k":"literal","value":<json scalar>}`. `5e-324`, `1e+21`, `1e-7` all mint lawfully and canonicalize to their shortest-round-trip renderings — the exact ES2019 §7.1.12.1 obligation ruling 2 dropped the leaf to avoid. The `int` integrality bound at `value_check.go:45` exists and was not applied to `literal`. REF-2a's canonical-value grammar is not float-free; "proved reachable without formalizing shortest-round-trip printing" does not follow from this cut. `proto/DECISIONS.md:2655-2660` rejects the closing alternative under a reason ("narrowing JCS would cross the task boundary") that does not apply to a type-grammar narrowing. |
| F2 | major | `proto/go/protod/value_check.go:34-35` | `case "opaque": return nil` admits any value; `checkValue({"k":"opaque"}, 21.5)` → `nil`. "Floats unreachable in fill values" is false. Disclosed and leaned on deliberately (`proto/DECISIONS.md:2669-2672`; the sensor fixture now carries `21.5` under an `opaque` field), but it means REF-2a cannot claim the value side either. |
| F3 | major | `verify/moves/run.sh:150-187`; `verify/moves/negative-controls/` | Five hygiene checks ship; only two have committed negative controls. `@[extern]`-allowlist, `partial`, and `sorry` have none, while `VERIFICATION.md:724-731` now claims all five. Brief 22 named only two, so this is house law ("every gate ships its negative controls, one per dropped law") over brief letter. I verified all five fire (probes A–D, M); the branch does not commit that evidence, so three can regress silently. |
| F4 | major | `verify/moves/run.sh:171` | Panic-free gate greps the literal token `panic!` only. Executed: `panic "evade"` (Lean core's `panic [Inhabited α]`) → gate PASS, `run.sh` exit **0**; `([] : List Nat).head!` → gate PASS, exit **0**. Both are RQ-1's default-return channel verbatim. `unsafe` is unchecked entirely. Roster is clean today, so the hole is prospective. |
| F5 | major | `verify/moves/run.sh:12-19`; `verify/moves/Main.lean:86` | Brief 22's premise — "closing them now also hardens the corpus generator the estate already trusts" — is unmet. The corpus generator is `Main.lean` + `Oracle/`, which the ratified roster explicitly excludes. `Main.lean:86` uses `n.toNat!` (panic-backed) on the `emit` path that produces the model-standing `packages/moves/fixtures/moves-conformance.ndjson`. The scope decision is legitimately recorded, but it is scoped precisely around the existing violations, so the gate was green on day one by construction. |
| F6 | major | `proto/wire/CONTRACT.md:395-396`; `proto/wire/fixtures/sessions.json` | `sessions.json` is a model-standing fixture with no `_provenance` line and no committed regeneration command (`cmd/wirefix/main.go:317-322` writes four files, not this one). The commit adds a claim that it is "mechanically recomputed through `proto/ts/src/jcs.ts`" and commits no such script, so "the gate diffs a fresh regeneration byte-for-byte" is unmet. Content verified correct by an oracle outside both runtimes. Additionally ~17 lines of unrelated whitespace re-serialization (73 → 90 lines) in a fixture `proto/AGENTS.md:52` calls FROZEN; only 9 values changed semantically. |
| F7 | major | — (absent) | Brief 21's survey deliverable ("every grammar restatement, touched or checked-clean") is not in the tree; the two commits add six files, none a survey. `proto/DECISIONS.md:2649-2661` lists touched sites only. I reconstructed the survey (16 sites) and **the cut is complete — no site was missed**, so this is a missing deliverable, not a missed cut. |
| F8 | minor | `proto/go/protod/float_leaf_test.go:56-105` | The committed grep guard covers 3 of ~16 restatements and omits the actual certifier alphabet (`walk.go:19-22` `v0Kinds`, `walk.go:77`). The `value_check.go` regex `case\s+"float"\s*:` is evaded by `case "float", "int":`. No TS site is grepped (behavioural cover exists at `codegen.test.ts:316`). |
| F9 | minor | `verify/ir/IR/Semantics.lean:16-17` | New abstraction note says non-integer JSON numbers "remain only in scalar literals and are outside this abstraction", but `Scalar.num` is `Int` (`Syntax.lean:35`) and `Json.num` is `Int` (`Semantics.lean:38`) — non-integer numbers exist nowhere in the model. Reads as if the model represents them. Suggested: "the model has no non-integer numbers; the wire's `literal.value` still admits them and is outside this abstraction." |
| F10 | minor | `proto/SPEC.md:71`; `proto/AGENTS.md:3` | The branch edits `SPEC.md`, which `proto/AGENTS.md:3` forbids ("must not be edited") and root `AGENTS.md:89` echoes ("An executor never edits the spec it builds against"). Brief 21 §2 and ruling 2 explicitly direct the edit, so it is coordinator-authorized — but the contradiction is nowhere recorded, leaving the next executor with a law that reads absolute and a merged counterexample. |
| F11 | minor | `verify/AGENTS.md:53` | Still reads "twenty-four gated axiom reports and five controls"; the roster is 39 (`run.sh:261-275`, matching `VERIFICATION.md`) and this branch adds two more controls. Pre-existing drift the branch widened without correcting. |
| F12 | minor | `proto/go/protod/session.go:166-176`, `:195` | Session grammar digest hard-cutover `d5ff3590…` → `78aff5581…`. Every persisted `flb.session.v0` journal opened under the old digest becomes unopenable/unreplayable. `proto/DECISIONS.md:2668` records the digest movement but not this consequence. Bounded by `proto/AGENTS.md:85` (tracer data is disposable). |

### What is right, and worth saying

- The float-leaf cut is **complete and correct** across all 16
  restatements. I looked for a missed site and did not find one.
- The hygiene gate is **real**: blocking, ordered before `lake build`,
  catches every violation in its declared scope, does not false-positive
  on comments, and binds extern approvals to an exact line digest that
  re-refuses on drift.
- The allowlist **ships empty** with its ratification rule stated, exactly
  as brief 22 required.
- The four `wirefix` fixtures **regenerate byte-identical**.
- The **JCS seam fence held** — the executor did not touch
  `go/canonical` or `packages/core`.
- The Lean IR edit is **minimal** and no law was weakened.
- The refusal test pins the **exact pre-existing law string**, which is
  what makes "no invented refusal name" mechanical.

---

## Explicitly untouched

Verified by `git diff --name-only e9fe0a3be..7cfb0b660`:

- `go/canonical/**`, `packages/core/**` — the RFC 8785 seam and the
  differential wall
- `fixtures/golden-conformance.json`, `fixtures/jcs-rfc8785.json` — both
  frozen files, byte-identical
- `proto/wire/fixtures/{owned-types-v1,scheme-bridges,protocol-moves,reply-conformance,refusal-sorts}.json`
- `proto/go/protod/refusal.go`, `proto/ts/src/wire.ts` — the frozen
  refusal-sort manifest and its digest pin
- `verify/{catalog,implication,pipeline,replay}/**` — the other model gates
- `verify/moves/Moves/**`, `Oracle/**`, `Main.lean`, `Spec.lean` — the
  hygiene commit adds machinery only; the frozen `Spec.lean` sha256 pin
  at `run.sh:233` is unchanged and passes
- `packages/moves/fixtures/moves-conformance.ndjson` — regenerated
  byte-identical by the gate itself

Nothing was written by this seat outside `docs/research/` in the primary
checkout and a scratch worktree at
`C:\Users\kokok\Dev\foldlab-rev-hyg`. No commit, no push, no branch
modification. The review worktree is clean (`git status --short` empty)
and can be removed with
`git worktree remove C:/Users/kokok/Dev/foldlab-rev-hyg`.

---

## Recommended disposition order

1. **F1** — operator ruling required. Either narrow `literal.value` to
   integer scalars (the `value_check.go:45` bound already exists and
   would move the same fixtures again), or restate REF-2a's charter to
   exclude literal scalars and re-price what `proved` buys. This must
   settle **before** DEV-670 generates, for the same reason ruling 2 was
   urgent.
2. **F3, F4** — cheap and mechanical: three more control files, and
   widen `run.sh:171` to the bang-accessor family plus bare `panic` and
   `unsafe`. My probe transcripts above are the acceptance vectors.
3. **F6, F7** — bookkeeping with real teeth: commit a `sessions.json`
   generator (or drop the CONTRACT.md claim), and land the survey.
4. **F2, F5, F9–F12** — record or reword; no machinery.
