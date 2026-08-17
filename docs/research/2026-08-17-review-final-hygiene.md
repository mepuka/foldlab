# Rev round 4 — the final hygiene round on `agent/codex/kernel-hygiene-gates`

Fourth and closing pass by the same Rev seat, 2026-08-17. Baselines, in order:

| round | report | outcome |
|---|---|---|
| 1 | `docs/research/2026-08-16-review-float-hygiene-branch.md` | F1–F12 (1 blocker, 5 major, 6 minor) |
| 2 | `docs/research/2026-08-17-review-float-hygiene-cure.md` | 1 blocker (F1 still open at `check.args`), N2 major, N3/N4 minor |
| 3 | `docs/research/2026-08-17-review-closure-cure.md` | no blocker; R1 major, R2/R3/R4 minor |

Scope law for this diff: dispatch brief 27 (`scratch/dispatch/27-final-hygiene-round.md`),
items Z1–Z4, under rulings 5–7 of `docs/design/2026-08-16-ref0-extraction-grill-record.md`.

Six commits on top of the round-3 tip `334c01618`:

| commit | subject | cures |
|---|---|---|
| `924cee583` | Arm cache-defeat at the stage, not at the package that was measured | Z1 / R1 |
| `8c94f1a43` | Close the walker's type switch over its own domain | Z2 / R2 |
| `370392384` | Sweep the closure law before the TypeScript identity mint | Z3 / R3 |
| `1ee1a538a` | Say where the closure law's magnitude half lives | Z4 / R4 |
| `df60a8ff7` | Record the round's four decisions and the scoped contracts they change | all four |
| `76e6ee65d` | Widen the one-statement guard to all of proto/ts/src, matching its claim | Z3 guard |

Findings only. Nothing was fixed, committed, or pushed.

---

## VERDICT: **APPROVE**, with three minor findings that do not block

**All four Z items are cured, each verified by execution rather than by reading.**
Commit hygiene is clean for the fourth consecutive round: no coordinator record
appears in any of the six commits, and no frozen fixture moves — the grammar
digest does not take a fourth step, so F12's cutover chain stays at three. All
three gates are green at tip and were re-run by this seat after every probe.

**The one sentence:** the branch stopped curing positions and started curing
domains — `-count=1` at the stage instead of the package, a `default:` over the
walk's whole non-JSON domain instead of a list of Go numeric types, and the TS
bound stated below *both* minters instead of at the fold — and the three
residuals are all the same species one more level down: prose that quantifies
slightly wider than the mechanism it describes.

The three minors are **W1** (a false universal in `GRAMMAR-SITES.md`, the fifth
instance of this branch's signature defect and the only one still live), **W2**
(the new minter guard is satisfiable by a substring, though the behavioural
suite in the same commit catches what it misses — I proved both), and **W3** (a
consequence round 3 discovered and no tracked file has adopted — a deferral with
no home, which brief 27's own acceptance rule makes a finding).

None touches a mechanism. None reinstates the shortest-round-trip obligation.
**DEV-670's barrier condition is met** — see §Barrier release.

---

## Review environment

Reviewed from a detached worktree at the branch tip, because the primary
checkout is on the branch and carries the coordinator's uncommitted records:

```
$ git worktree add --detach C:/Users/kokok/Dev/foldlab-rev-r4 76e6ee65d
HEAD is now at 76e6ee65d Widen the one-statement guard to all of proto/ts/src, matching its claim
```

Every build, gate, probe, plant and revert below ran in
`C:\Users\kokok\Dev\foldlab-rev-r4`. `git status --short --untracked-files=all`
was confirmed empty after every probe and at the end; the worktree was removed
when this report was finished. Nothing was written to the primary checkout
except this file.

**Worktree report for the operator, as asked:**

- `C:/Users/kokok/Dev/foldlab-rev-cure` (round 2) — **gone**.
- `C:/Users/kokok/Dev/foldlab-rev-r3` (round 3) — **gone**.
- `C:/Users/kokok/Dev/foldlab-rev-hyg` (round 1) — **STILL EXISTS**, detached at
  `7cfb0b660`, working tree clean. It has now survived three reviews that each
  asked for its removal. `git worktree remove C:/Users/kokok/Dev/foldlab-rev-hyg`.
- `C:/Users/kokok/Dev/foldlab-dev-676` — a separate lane's worktree at
  `31c483524`; not this review's business.

Environment note, confirmed for the third time and still not a branch defect: a
fresh worktree needs `bun install` at the root **and** `cd proto/ts && bun install`
before `bun run gates`; `gates` does not bootstrap `proto/ts`'s own lockfile.

---

## Commit hygiene: **PASS**

No coordinator record was swept into any commit. Checked per commit, not only in
aggregate:

```
$ git diff --name-only 334c01618..76e6ee65d | grep -Ei 'scratch/|docs/research|docs/design|\.gitignore|MEMORY'
(no matches)

per commit — total files / coordinator-record files
  924cee583 : 3 / 0
  8c94f1a43 : 2 / 0
  370392384 : 6 / 0
  1ee1a538a : 2 / 0
  df60a8ff7 : 2 / 0
  76e6ee65d : 1 / 0
```

The primary checkout carries two modified tracked files and twenty-nine
untracked coordinator records at review time; none appears in the diff. Each
commit's file list matches its stated scope and no commit reaches into another's.

The seam fence held for the fourth time. Untouched by the whole round-4 diff:

```
$ git diff --name-only 334c01618..76e6ee65d -- go/canonical packages/core packages/moves \
    fixtures/ verify/moves proto/wire/
(empty)
```

**No fixture moves at all this round.** `sessions.json` is byte-identical to the
round-3 tip and `grammarDigest` is still `3cabc043…`, so the hard cutover F12
records stays at three moves rather than four. The Z3 cure was designed to avoid
a fourth: `findNonIntegralNumber` moved *between* TS modules without touching
the session grammar descriptor.

---

## Gate transcripts (all re-run by this seat, at tip, in the review worktree)

| gate | exit | result |
|---|---|---|
| `bun run gates` | **0** | `FOLDLAB GATES: PASS`, **160 pass / 4 skip / 0 fail** (157 at round 3; the three new ones are `jcs.strict.test.ts`) |
| `bash verify/moves/run.sh` | **0** | 12 `GATE: PASS` lines, unchanged from round 3 |
| `bash verify/ir/run.sh` | **0** | `GATE: PASS (IR model proofs check)`; the one pre-existing `simpa` linter note, no theorem touched |
| `cd proto/go && go test -count=1 ./...` | **0** | all packages ok |
| `cd go && go test -count=1 ./...` | **0** | all packages ok |

`verify/ir/run.sh` was re-run because `1ee1a538a` edits two files in that lane
(prose only, in the `Abstractions, stated` comment blocks — no `Prim`, `Scalar`,
definition, or theorem changed).

The `bun run gates` Go stages at tip, and the load-bearing observation:

```
== go — tests
ok  	foldlab/canonical	0.655s
ok  	foldlab/journal	1.597s

== proto/go — tests
ok  	foldlab/proto/catalogr4	25.346s
ok  	foldlab/proto/cmd/protod	5.400s
ok  	foldlab/proto/cmd/wirefix	1.901s
ok  	foldlab/proto/protod	10.629s
```

**Not one `(cached)` line anywhere.** Round 3's transcript of the same stage read
`ok foldlab/proto/cmd/wirefix (cached)`. That difference is R1's cure, visible
without a probe.

---

# THE FINAL DISPOSITION TABLE

Every finding from all four rounds. **Cured** carries its evidence; **deferred**
carries its home; **open-by-ruling** cites the ruling.

## Round 1 — F1–F12

| # | orig sev | **final disposition** | evidence / home |
|---|---|---|---|
| **F1** | blocker | **CURED** (round 3, at the class) | The bound sits in one traversal in the walker's number-decoding path, guarded by `TestIntegralityBoundHasOneCallSiteInTheWalker`. Round 4 extends the cure to the traversal's *domain* (Z2). Re-verified at this tip: every round-1 literal vector and every round-2 `check.args` vector refuses; see §Z2 and §Z3 transcripts. |
| F2 | major | **OPEN BY RULING** — ruling 6 | `{"k":"opaque"}` admits any value by design. Home: `proto/DECISIONS.md` (ruling-6 entry) + `proto/wire/CONTRACT.md:341-349` + `GRAMMAR-SITES.md`'s number table row "opaque payload → nobody — the sole exception (ruling 6)". Round 3 mapped the exception's propagation through every container; unchanged this round. |
| F3 | major | **CURED** (round 2) | Nine checks, nine committed controls, nine `GATE: PASS` refutation lines re-observed at tip. Plus a control-orphan rule that was not asked for. |
| F4 | major | **CURED** (round 2, beyond the brief) | Bang family matched as Lean's *convention*; hygiene line set unchanged and green at tip. |
| F5 | major | **CURED** (round 2) | Roster includes the corpus generator; `Main.lean:86` `toNat!` replaced; `partial def serve` is a digest-pinned allowlist row. |
| F6 | major | **CURED** (round 2), residual **CURED** (round 3) | All five fixtures regenerate byte-identical; `TestCommittedFixturesAreAFreshEmission` is the gate. Round 4 keeps it as its own stage deliberately (`gates.ts` comment: "the label is what a red line names"). |
| F7 | major | **CURED** (round 2), **extended** (rounds 3–4) | `proto/GRAMMAR-SITES.md` agrees with my independently built 16-site table; the number-position table gains two rows this round. **One sentence in that extension is finding W1.** |
| F8 | minor | **CURED** (round 2), **widened twice** | Grep guard 3 → 14 sites; set-equality guard between the `T ::=` block and `v0Kinds`, verified in both directions in round 3; widened again this round to enumerate all of `proto/ts/src` rather than a named list. Both new halves proved to fire — §Guard probes. |
| **F9** | minor | **CURED** (round 3), **completed** (round 4) | Both `verify/ir` notes now state the post-ruling-5/7 truth *and* the second conjunct. `verify/ir/run.sh` exit 0 before and after. |
| F10 | minor | **CURED** (round 2), residual **DEFERRED with a home** | `proto/AGENTS.md:3-16` states the spec-edit exception and still says *three* instances — correct, because round 4 does not touch `SPEC.md`. Root `AGENTS.md:89` still carries the absolute sentence; that misalignment is owned at `proto/DECISIONS.md:2864` ("aligning it is reported, not done here"). |
| F11 | minor | **CURED** (round 2) | 39 axiom reports and 9 controls; counted in the tree again at this tip. |
| F12 | minor | **CURED** (round 2), **and bounded this round** | Digest chain `d5ff3590… → 78aff5581… → ca4ac75f… → 3cabc043…`. Round 4 adds no fourth move — verified: `proto/wire/` is untouched by the whole diff. |

## Round 2 — the four

| # | orig sev | **final disposition** | evidence / home |
|---|---|---|---|
| **F1-R2** (`check.args`) | **blocker** | **CURED** (round 3), **domain-closed** (round 4) | One traversal, one predicate, one law sentence. Round 3's family hunt found no fourth wire-reachable position. Round 4 closes the traversal's own domain so the universal holds without the "as long as the caller decoded it first" footnote. |
| **N2** (no regeneration gate) | major | **CURED** (round 3); its own residual **CURED** (round 4) | The gate exists, goes red on a one-byte mutation at the claimed offset, and the cache hazard it discovered is now armed at the stage — R1's cure. |
| **N3** (`Semantics.lean` prose) | minor | **CURED** (round 3), **completed** (round 4) | See F9. |
| **N4** (uncommitted citations) | minor | **CURED** (round 3), **held** (round 4) | Swept again at this tip: **round 4 adds zero new dangling citations**, and no tracked file cites brief 26, brief 27, or either round-2/round-3 report by path. The four pre-existing ones resolve when the coordinator's records land — see §Merge checklist. |

## Round 3 — R1–R4, against brief 27's Z items

| # | orig sev | brief clause | **final disposition** |
|---|---|---|---|
| **R1** (stale cached pass armed for one package) | **major** | Z1 | **CURED, and wider than the brief asked.** Brief 27 said "the three packages the round-3 report names". The branch found **four cross-module readers across two modules** — round 3 had named three test files in one package — and armed `-count=1` at both stages rather than at the readers. I reproduced the stale pass and the armed red for **all four**, independently. §Z1. |
| **R2** (walker's type switch has no default) | minor | Z2 | **CURED.** `default:` refuses the whole non-JSON domain under a stated `walkDomainLaw`. Eleven Go-typed probes refuse, none panics, and nothing `canonical.Decode` emits is falsely refused. §Z2. |
| **R3** (TS raw digest utilities mint unbounded) | minor | Z3 | **CURED by sweep-before-mint**, not by value-side scoping — and the value-side option is refuted in the DECISIONS entry with the evidence, as the brief required. The round-3 counterexample digest `ca76451e…` is no longer mintable by either utility. §Z3. |
| **R4** (`verify/ir` states one conjunct) | minor | Z4 | **CURED.** Both notes state the conjunction, name where the magnitude half lives, and name the direction of the gap (model ⊇ wire). Prose only; gate green before and after. |

## Round 4 — this seat's own

| # | sev | file | finding |
|---|---|---|---|
| **W1** | minor | `proto/GRAMMAR-SITES.md:84-85` | The new prose asserts "`Number.isSafeInteger` appears in exactly one function in `proto/ts/src/`, and `float_leaf_test.go` fails if it appears anywhere else". **Both halves are false at the tip that states them.** It appears in two functions in `jcs.ts` — `findNonIntegralNumber:132` and `sequenceRefusal:243` — and the guard skips `jcs.ts` entirely (`float_leaf_test.go:190-197` is `if name == "jcs.ts" { continue }`), so it is a *file*-granular check under a *function*-granular claim. `sequenceRefusal` is pre-existing (present at `7cfb0b660`) and is a genuinely different law — a chain sequence must be a safe **unsigned** integer — so no code is wrong. What is wrong is that the guard's blind spot is exactly `jcs.ts`, the file where a second, inline copy of the term bound is most likely to be written, which is the R3 shape (two mint sites, one bounded) reintroduced inside the file that cured it. This is the fifth instance of this branch's signature defect and the only one still live. |
| **W2** | minor | `proto/go/protod/float_leaf_test.go:200-209` | The minter guard is `strings.Contains(body, "NonIntegralNumber")` over a text slice from `export const structureDigest = ` to the next `\nexport `, but its failure message is "no longer runs the closure sweep before minting" — a behavioural claim a substring cannot make. Executed: replacing the sweep with the comment `// NonIntegralNumber: swept elsewhere` leaves `TestIntegralityBoundIsStatedOnce` **green** (exit 0) while `structureDigest` mints the counterexample again. **Mitigated, and I proved the mitigation:** the same commit's `jcs.strict.test.ts` fails three tests on that mutation, so the estate is not exposed. The defect is that the commit message and `GRAMMAR-SITES.md` credit the grep guard for a wall the behavioural suite is actually holding. |
| **W3** | minor | — (absent) | **A deferral with no home**, which brief 27's acceptance rule makes a finding. Round 3 recorded, as a consequence rather than a finding, that on a daemon whose JetStream catalog predates the closure law a pre-law fact "stays resolvable by digest but every new term that references it now refuses… it is not written down anywhere". It is still not written down anywhere: `git grep -ni 'pre-law\|predates the cure\|pre-cure\|cataloged before'` over tracked files returns one unrelated hit (`protocol.go:273`). The estate's own precedent is against this — F12's structurally identical hard-cutover consequence *did* get a DECISIONS entry with its bound. Home needed: one DECISIONS line under Task 26 or 27, or commit the round-3 report so its §3 becomes readable from a fresh checkout. |

**Deferral audit — every deferred item has a home:** F2 → ruling 6 + three tracked
files; F10 residual → `proto/DECISIONS.md:2864`; F5's deliberately-unchecked
`noncomputable` → `verify/moves/DECISIONS.md` (its own entry, with the reason);
N4's four citations → `proto/DECISIONS.md:3044` + the merge checklist below;
round 3's six out-of-lane dangling citations → **no home**, but they are not this
branch's doing and are a sibling of the two dangling pointers `FREEZING.md`
already documents; W3 → **no home, hence the finding**.

---

# Spot-check transcripts

## Z1 — one mutation probe per armed stage, and then all four readers

Method for each: populate the Go test cache with two clean runs, mutate one byte
of a committed fixture **length-preservingly**, run the unarmed command, run the
armed one, `git checkout --` and confirm the worktree clean.

### Stage `go — tests` — `foldlab/canonical`

```
$ bun flipbyte.ts fixtures/golden-conformance.json '"74234e98afe7498f' '"04234e98afe7498f'
MUTATED at byte 54; length before 9911, after 9911

$ cd go && go test ./...                      # the pre-cure command
ok  	foldlab/canonical	(cached)              <-- STALE PASS
ok  	foldlab/journal	(cached)

$ go test -count=1 ./canonical/               # the armed command
--- FAIL: TestDigests (0.00s)
    conformance_test.go:117: case 0: digest: got 74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b
                                          want 04234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b
EXIT=1

$ go test -count=1 ./...                      # the STAGE as armed
FAIL	foldlab/canonical	0.547s
ok  	foldlab/journal	1.388s
STAGE_EXIT=1

$ git checkout -- fixtures/golden-conformance.json && git status --short --untracked-files=all
(empty)
```

`docs/FREEZING.md`'s table claims exactly this diagnostic. It reproduces verbatim.

### Stage `proto/go — tests` — `foldlab/proto/protod`, the differential wall

```
$ bun flipbyte.ts proto/wire/fixtures/types.json '3b67b844' '0b67b844'
MUTATED at byte 133; length before 6005, after 6005

$ cd proto/go && go test ./...
ok  	foldlab/proto/catalogr4	(cached)
ok  	foldlab/proto/cmd/protod	(cached)
ok  	foldlab/proto/cmd/wirefix	(cached)
ok  	foldlab/proto/protod	(cached)          <-- STALE PASS on all four

$ go test -count=1 ./protod/
--- FAIL: TestTypeFixturesRederive (0.00s)
    wall_test.go:55: leaf-string: digest drifted: got 3b67b844b3d0…f2fc0 want 0b67b844b3d0…f2fc0
EXIT=1
```

### The one R1 was actually about — the closure law's own corpus check

Round 3's argument was that the reader left unarmed included the corpus check
that this same lane added. Probed directly, with a genuine non-integral plant
rather than a digest flip:

```
$ bun flipbyte.ts proto/wire/fixtures/types.json '          "min": 1' '        "min": 1.5'
MUTATED at byte 3366; length before 6005, after 6005   (indentation traded for the fraction)

$ go test ./...                       ok  foldlab/proto/protod  (cached)      <-- STALE PASS
$ go test -count=1 -run TestCommittedTypeVectorsCarryNoNonIntegralNumber ./protod/
--- FAIL: TestCommittedTypeVectorsCarryNoNonIntegralNumber (0.00s)
    closure_law_test.go:370: committed vector "check-min-length" refused:
        Law:flb.type.v0: every number in a type term is integral — whole and within ±(2^53-1);
            a non-integer number has no v0 form
        Path:[check args min]  Got:1.5
        Expected:an integral number: Trunc(n) == n and |n| <= 9007199254740991
    closure_law_test.go:373: committed vector "check-min-length" carries a non-integral number
EXIT=1
```

The closure law's own wall could report a stale pass on exactly the corpus it
exists to watch, and now cannot. That is R1 cured at its centre.

### The other two readers `FREEZING.md` names

```
$ bun flipbyte.ts proto/wire/fixtures/chains.json '"1fa9d673' '"0fa9d673'
$ cd go && go test ./...            ok  foldlab/journal  (cached)             <-- STALE PASS
$ go test -count=1 ./journal/
--- FAIL: TestPipelinedReadMatchesSequentialOnFrozenFixture (0.01s)
    hardening_internal_test.go:116: sequential read differs from independent frozen chain oracle: entry digest
EXIT=1

$ bun flipbyte.ts proto/wire/reply-conformance.json  '"scheme":"flb.type.v1"…' '"scheme":"flb.type.vX"…'
$ cd proto/go && go test ./...      ok  foldlab/proto/catalogr4  (cached)     <-- STALE PASS
$ go test -count=1 ./catalogr4/
--- FAIL: TestReplyConformanceCorpusUsesTheGoDecoderAsItsOracle/create-valid (0.00s)
    reply_conformance_test.go:43: accepted = false, want true
        (error: field "scheme" = "flb.type.vX", want "flb.type.v1")
EXIT=1
```

Both restored byte-identically; worktree clean after each. **All four rows of
`docs/FREEZING.md`'s new table are true, independently measured.** The
`refusal_sort_test.go` addition to the protod row is also accurate — it reads
`../../wire/refusal-sorts.json`, across the module boundary, and round 3 had
missed it.

Fairness note carried forward: on a cold CI cache the stale pass cannot occur.
It bites the warm local cache — the situation of a seat that plants a mutation
and re-runs, and of the operator spot-checking a claim. The cost the DECISIONS
entry accepts is real: the whole Go battery now runs uncached, about 45s.

## Z2 — the walk's domain, probed independently of the committed test

My own probe file, beyond `closure_law_test.go`'s seven cases: named types with
`float64` underlying, slices of `float64`, a `map[string]string`, a typed nil
pointer, and a struct — the shapes an enumeration of Go numeric types would
have missed. Each subtest recovers from panic and fails on one.

```
float32-non-integral       REFUSED kind=invalid-structure got=float32                path=[check args min]
float32-integral           REFUSED kind=invalid-structure got=float32                path=[check args min]
go-int                     REFUSED kind=invalid-structure got=int                    path=[check args min]
go-int64                   REFUSED kind=invalid-structure got=int64                  path=[check args min]
go-uint64-huge             REFUSED kind=invalid-structure got=uint64                 path=[check args min]
json.Number                REFUSED kind=invalid-structure got=json.Number            path=[check args min]
named-float64-underlying   REFUSED kind=invalid-structure got=protod.namedFloat      path=[check args min]
slice-of-float64           REFUSED kind=invalid-structure got=[]float64              path=[check args min]
map-string-string          REFUSED kind=invalid-structure got=map[string]string      path=[check args min]
typed-nil-pointer          REFUSED kind=invalid-structure got=*int                   path=[check args min]
struct                     REFUSED kind=invalid-structure got=struct { X float64 }   path=[check args min]
walkPartial-nested         REFUSED law=<walk domain>  path=[fields b check args min]
```

Refusal, never panic, in all twelve — including through the `serveFill` /
`serveUnfill` seam. `Got` is `%T`, a type *name*, so the refusal itself stays
canonicalizable.

**And the domain is not narrowed** — the risk a `default:` always carries:

```
decoded-args ADMITTED {"min":1,"note":"x","on":true,"off":null,"deep":[1,2,{"z":-9007199254740991}]}
decoded-args ADMITTED {}
```

I also audited every in-process term builder for a Go-typed number that the
`default:` would now falsely refuse — `completion.go`'s `closedTypeGrammar`
witnesses, `concierge.go`'s `frontierChoices` examples, `recursion.go`'s
`walkRefGraph`, and `cmd/wirefix`. None carries a number; the only Go-int
number-bearing term-shaped map in the package is `walk.go:510`'s `exampleCheck()`,
which is a refusal *hint* and is never walked. `go test -count=1 ./...` green in
both modules confirms it.

## Z3 — the TS identity mint, and the round-2 counterexample

The exact term round 2 and round 3 minted, run through both utilities:

```
canonical bytes (unchanged)   {"base":{"k":"string"},"check":{"args":{"min":5e-324},"name":"minLength"},"k":"check"}

structureDigest(counterexample)
  {"ok":false,"refusal":{"_tag":"NonIntegralNumber","path":"$/check/args/min",
   "reason":"every number in a type term is integral — whole and within ±(2^53-1); use opaque for other numbers"}}

sessionStateDigest(counterexample)      same refusal (it is a thin alias)

round-3 digest ca76451e… still minted?  false
```

Every shortest-round-trip rendering the ladder has named, at the mint:

```
structureDigest(literal 5e-324)                  refused  path=$/value
structureDigest(literal 0.1)                     refused  path=$/value
structureDigest(literal 1e+21)                   refused  path=$/value
structureDigest(literal 1e-7)                    refused  path=$/value
structureDigest(literal 1.7976931348623157e+308) refused  path=$/value
structureDigest(literal 9007199254740992)        refused  path=$/value
deep nesting (args.a.b.c[2] = 0.5)               refused  path=$/check/args/a/b/c/2
partial with a hole + counterexample             refused  path=$/fields/b/check/args/min
```

**No false refusal, and no identity drift** — the lawful digests are the ones
already committed:

```
LAWFUL {k:string}      {"ok":true,"digest":"3b67b844b3d096bc06a752cfdb4ff7ba292aa25662d6ee36e65135df797f2fc0"}
                                              ^ byte-identical to proto/wire/fixtures/types.json's leaf-string
LAWFUL literal -0      {"ok":true,"digest":"24f927459a…"}     (-0 canonicalizes to 0, RFC 8785 §3.2.2.3)
LAWFUL literal 2^53-1  {"ok":true,"digest":"928aad2726…"}
LAWFUL check min 1     {"ok":true,"digest":"8f12d111b7…"}
```

**The client-visible fold refusal did not move** when the traversal migrated from
`author.ts` to `jcs.ts` — the coordinate round 3 recorded is still pinned and
green (`bun test test/author.test.ts` → 29 pass / 0 fail):

```
path === ["structure","check","args","exclusiveMin"]     law contains "every number in a type term is integral"
path === ["structure","value"]                           for the literal position
```

**The value-side option was correctly refuted, not ignored.** I checked the
DECISIONS claim against the tree: `session.go` derives its state digest from the
partial *after* `walkPartial` has applied the closure law, and no TS module
digests a fill value — `grep sha256Hex proto/ts/src` returns exactly three sites,
of which `structureDigest` (swept), `entryDigest` (a chain entry over
`{payload, prev, seq}`, not a term), and `SESSION_GRAMMAR_DIGEST` (a descriptor).
Both utilities are term-side, so scoping around them would have been scoping
around nothing. That is the brief's "or be provably value-side-scoped" branch,
correctly closed the other way.

**The TS mint is total over its domain** — the mirror of the Z2 question, which
the brief did not ask and which the sweep-after-canonicalization ordering answers
for free. I looked for a TS analogue of the `float32` gap:

```
bigint 10n                     refused  NonCanonicalValue: non-plain objects are outside the canonical domain
bigint 9007199254740993n       refused  NonCanonicalValue
undefined member               refused  NonCanonicalValue: undefined is outside the canonical domain
NaN / Infinity / -Infinity     refused  NonCanonicalValue: number is not finite
Date / function / symbol       refused  NonCanonicalValue
boxed new Number(0.5)          refused  NonCanonicalValue
nested bigint in check.args    refused  NonCanonicalValue  path=$/check/args/min
```

`canonicalizeStructure` runs first and refuses everything outside RFC 8785's
domain, so there is no `float32`-shaped hole on the TS side. The ordering the
DECISIONS entry justifies for cycle-safety delivers domain totality as well.

## Guard probes — do the new guards actually fire?

```
G1  plant `Number.isSafeInteger` in proto/ts/src/session.ts
    --- FAIL: TestIntegralityBoundIsStatedOnce
        float_leaf_test.go:196: proto/ts/src/session.ts restates the integrality bound;
                                call findNonIntegralNumber
    EXIT=1                                                            <-- fires

G2  delete the sweep block from structureDigest
    --- FAIL: TestIntegralityBoundIsStatedOnce
        float_leaf_test.go:207: jcs.tsexport const structureDigest =  no longer runs the
                                closure sweep before minting
    EXIT=1                                                            <-- fires

G3  replace the sweep with the COMMENT `// NonIntegralNumber: swept elsewhere`
    ok  foldlab/proto/protod                                          <-- DOES NOT fire  (finding W2)
    but: bun test → 157 pass / 3 fail, jcs.strict.test.ts:198          <-- behavioural wall holds
```

All three restored; worktree clean after each. (G2's message has a cosmetic
missing separator — `jcs.tsexport const structureDigest = ` — worth one space at
`float_leaf_test.go:207`, not worth a finding.)

## Z4 — the IR notes

`verify/ir/run.sh` exit 0 at tip, `GATE: PASS (IR model proofs check)`, with the
one pre-existing `simpa` linter note at `IR/Semantics.lean:371:18`. The diff is
two comment blocks; `git diff` confirms no `inductive`, `def`, or `theorem` line
changed. Both notes now state the conjunction, name `isIntegralJSONNumber` as
where the magnitude half lives, say that no definition or theorem in the package
states it, and name the direction (model ⊇ wire) — which is the claim R4 asked
for and the reason R4 was minor.

---

## Barrier release — DEV-670

Rulings 5 and 7 held DEV-670's generation barrier on one condition: that **no
non-integral number can enter `flb.type.v0` identity bytes**. At this tip that
condition is met on every surface the four rounds have found:

| surface | state |
|---|---|
| `literal.value` | bounded (round 2's cure, re-verified) |
| `check.args`, at any depth, under any enclosing kind, through every seam | bounded by one traversal (round 3's cure; round 3's family hunt found no fourth wire position) |
| the traversal's own domain (in-process Go-typed numbers) | **bounded this round** — `default:` refuses |
| the TS identity mints (`structureDigest`, `sessionStateDigest`) | **bounded this round** — sweep before mint |
| the TS author fold | bounded (round 3) |
| opaque payloads | **open by ruling 6**, declared in three tracked files, values not terms |
| journal frame payloads | open and **declared on the wire itself** in every admit reply |
| `flb.protocol.v0` | no numeric position exists in the grammar at all (round 3, read field by field) |

The two open surfaces are both *value*-side and both ratified. Nothing here
blocks the barrier. **Release it.**

---

## What is right, and worth saying

- **The branch stopped curing members and started curing classes.** Brief 27
  asked for three packages; the branch armed two stages after measuring four
  readers, and wrote down why: "a defense attached to the members that were
  measured is a defense a member added tomorrow does not inherit." That sentence
  is the whole ladder in one line, and the executor got there from its own
  evidence rather than from the brief.
- **The `default:` refuses a domain, not a list.** The DECISIONS entry names the
  rejected alternative — enumerate the Go numeric types — and says exactly why:
  "enumerating the types that need checking is the identical shape to enumerating
  the positions that need checking, which is the shape ruling 7 was issued
  against." That is the executor arguing from the ladder's own history.
- **Z3 refuted the escape hatch instead of taking it.** The brief offered
  "or scope precisely per certifier semantics if state digests are value-side".
  The executor read the evidence, found both utilities term-side, said so with
  the call chain, and did the harder thing. I checked the claim independently and
  it holds.
- **The traversal moved without moving a single client-visible refusal.** Coordinates,
  law strings and lawful digests are all byte-identical across the move — verified,
  not assumed.
- **No fourth grammar-digest move.** The cheapest way to close R3 would have been
  to restate the bound in `jcs.ts` and leave `author.ts` alone; the branch moved
  it instead and paid nothing in fixture churn.
- **`FREEZING.md` turned a prospective hazard into a measured inventory.** Four
  rows, four diagnostics, every one of which I reproduced. Round 3's complaint was
  that the file "states the hazard prospectively when it is already actual for
  three present readers"; the answer names four and shows each one red.
- **The IR note says what the abstraction ADDS.** "A theorem that needed the
  wire's magnitude bound would have to import it rather than assume it" is the
  sentence that makes the note arguable, which is that file's stated charter.

---

# MERGE CHECKLIST for the coordinator

### 1. The commits, in order

Merge `agent/codex/kernel-hygiene-gates` at `76e6ee65d` into `main` (`e9fe0a3be`).
Sixteen commits, four dispatch rounds:

```
d8393388b  Drop float leaf from flb.type.v0                              (brief 21, ruling 2)
7cfb0b660  Add kernel source hygiene gates                               (brief 22, ruling 4)
   ── round-1 review boundary ──
589f8496c  Give sessions.json a committed generator                      (brief 25)
4517b0bb2  Narrow literal scalars to integers                            (brief 25, ruling 5)
0b75a6c0e  Land the restatement survey and the laws around it            (brief 25)
157ee53f5  Widen kernel hygiene to the default channel and the generator (brief 25)
   ── round-2 review boundary ──
19422b670  Close the grammar over integrality                            (brief 26, ruling 7)
86b7bb0f1  Build the regeneration gate the estate assumed it had         (brief 26)
cf1b10e98  Say what the IR model's Int abstraction actually drops        (brief 26)
334c01618  Cite brief 26 by number, not by a path a fresh checkout lacks (brief 26)
   ── round-3 review boundary ──
924cee583  Arm cache-defeat at the stage, not at the package measured    (brief 27, Z1)
8c94f1a43  Close the walker's type switch over its own domain           (brief 27, Z2)
370392384  Sweep the closure law before the TypeScript identity mint    (brief 27, Z3)
1ee1a538a  Say where the closure law's magnitude half lives             (brief 27, Z4)
df60a8ff7  Record the round's four decisions and the scoped contracts    (brief 27)
76e6ee65d  Widen the one-statement guard to all of proto/ts/src         (brief 27)
```

### 2. Coordinator records that MUST land with the merge

Four tracked files cite paths a fresh checkout cannot open. All four targets
exist in the primary checkout as untracked files; the branch was right to leave
them out of its commits, and the coordinator has to put them in.

| cited path | cited by | status |
|---|---|---|
| `scratch/dispatch/21-float-leaf-drop.md` | `proto/GRAMMAR-SITES.md` | untracked, present |
| `scratch/dispatch/25-float-hygiene-cure.md` | `proto/SPEC.md`, `proto/DECISIONS.md`, `proto/GRAMMAR-SITES.md`, `verify/moves/DECISIONS.md` | untracked, present |
| `docs/research/2026-08-16-review-float-hygiene-branch.md` | `proto/DECISIONS.md`, `proto/GRAMMAR-SITES.md`, `verify/moves/DECISIONS.md` | untracked, present |
| `docs/design/2026-08-16-ref0-extraction-grill-record.md` | `proto/DECISIONS.md` | untracked, present |

`SPEC.md`'s citation is the load-bearing one — it is the recorded authority for
editing a coordinator-owned spec. **Recommended, not required:** land briefs 26
and 27 and the round-2/3/4 review reports in the same commit. Nothing cites them
by path (verified), but the branch's own DECISIONS states the principle that
decides it — "a deliverable no fresh checkout can read is a deliverable that does
not exist" — and W3's remedy is cheapest if the round-3 report is readable.

Also in the primary checkout and **not** part of this merge: two modified tracked
files (`.gitignore`, `scratch/dispatch/07-moves-vector-wall.md`) and the RQ sweep
`docs/research/2026-08-16-rq*.md`, dispatch drafts 17–24, and
`docs/research/reference/`. Land or hold them on their own judgement; none is
cited by a tracked file.

### 3. D?? renumbering

**36 `### D??` headings** need final numbers at merge:

| file | task block | count |
|---|---|---|
| `proto/DECISIONS.md` | Task 21 — float leaf drop | 3 |
| `proto/DECISIONS.md` | Task 25 — float/hygiene cure | 10 |
| `proto/DECISIONS.md` | Task 26 — the closure law | 11 |
| `proto/DECISIONS.md` | Task 27 — the final hygiene round | 4 |
| `verify/moves/DECISIONS.md` | Task 22 — kernel hygiene gates | 2 |
| `verify/moves/DECISIONS.md` | Task 25 — the hygiene cure | 6 |

(`proto/DECISIONS.md` goes 68 → 96 `D??` headings; `verify/moves/DECISIONS.md`
0 → 8. Each block's header already says "task-local D?? entries — final numbers
assigned at merge". Other `D??` in the tree — `proto/go/catalogr4/TASK24-DECISIONS.md`
and the 57 pre-existing ones in `proto/DECISIONS.md` — are not this merge's.)

**The two allowlist cross-references.** `verify/moves/run.sh:156` validates only
that the reason field begins with `operator-ratified: `, so a `D??` placeholder
passes the gate today — the number is not machine-checked and must be fixed by
hand:

1. **`verify/moves/kernel-partial-allowlist.txt:12`** — the one live row:
   `Main.lean:68 <sha256> operator-ratified: D?? (brief 25 C5) — the oracle
   serve loop is a non-terminating daemon transport…`. Renumber `D??` to the
   final number of `verify/moves/DECISIONS.md`'s **"`partial def serve` is a
   per-site exception, never a roster carve-out"** entry. **Safe:** the row's
   SHA-256 pins the *Lean source line*, not the row, so editing the reason text
   does not invalidate the approval or move the digest. Re-run
   `bash verify/moves/run.sh` after (exit 0 expected).
2. **`verify/moves/kernel-extern-allowlist.txt:5`** and
   **`kernel-partial-allowlist.txt:6`** — the format templates read
   `operator-ratified: DECISION-ID — reason`. These are documentation, not
   entries; leave them as `DECISION-ID`. Named here so the renumbering pass does
   not mistake them for live rows and so the extern allowlist's still-empty state
   is a deliberate confirmation rather than an oversight.

### 4. DEV-670 barrier release

The barrier condition — no non-integral number in `flb.type.v0` identity bytes —
is met on every surface four rounds of adversarial search have found. See
§Barrier release for the surface-by-surface table. **Release the barrier and
dispatch DEV-670** (`scratch/dispatch/07-moves-vector-wall.md`, slice stage 4).
No re-pricing of REF-2a is owed: round 2's blocker offered "bound `check.args`
**or** narrow the universal and re-price `proved`", and the branch took the first
branch, so REF-2a's whole-grammar charter is satisfiable as written.

### 5. The three round-4 minors — land or defer, explicitly

None blocks. Each is one edit:

- **W1** — `proto/GRAMMAR-SITES.md:84-85`: replace "appears in exactly one
  function in `proto/ts/src/`" with what the guard checks — appears in exactly
  one *file*, `jcs.ts`, where a second occurrence (`sequenceRefusal`) states a
  different law (safe **unsigned** integer, for a chain sequence). Optionally
  tighten `float_leaf_test.go` to count occurrences inside `jcs.ts` and require
  exactly two, named.
- **W2** — `float_leaf_test.go:200-209`: either say what the guard checks ("names
  `NonIntegralNumber`") or make the claim true by asserting the call
  `findNonIntegralNumber(` rather than the type name. Add the missing space in
  the message at `:207`.
- **W3** — one DECISIONS line under Task 26 or 27 recording the pre-law catalog
  consequence and its bound (`proto/AGENTS.md`'s disposable-tracer-data law, the
  same bound F12 uses), **or** land the round-3 report so its §3 is readable from
  a fresh checkout.

### 6. Worktrees to clean

```
git worktree remove C:/Users/kokok/Dev/foldlab-rev-hyg     # round 1, detached at 7cfb0b660, clean — third ask
```

`foldlab-rev-cure` (round 2), `foldlab-rev-r3` (round 3) and `foldlab-rev-r4`
(this round) are all removed. `C:/Users/kokok/Dev/foldlab-dev-676` belongs to
another lane and should be left alone.

---

*Reviewed at `76e6ee65deabb0fb7719255cf2658927c99d2de4`. Review worktree left
clean and removed. Nothing on the branch was modified, committed, or pushed.*
