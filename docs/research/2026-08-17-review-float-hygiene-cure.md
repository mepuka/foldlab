# Rev re-review — the brief-25 cure on `agent/codex/kernel-hygiene-gates`

Same Rev seat as `docs/research/2026-08-16-review-float-hygiene-branch.md`,
2026-08-17. Four cure commits on top of the reviewed tip `7cfb0b660`:

| commit | subject | cures |
|---|---|---|
| `589f8496c` | Give sessions.json a committed generator | C6 / F6 |
| `4517b0bb2` | Narrow literal scalars to integers | C1 / F1 |
| `0b75a6c0e` | Land the restatement survey and the laws around it | C2, C7, C8a/b/d / F2, F7, F8, F10, F12 |
| `157ee53f5` | Widen kernel hygiene to the default channel and the generator | C3, C4, C5, C8c / F3, F4, F5, F11 |

Findings only. Nothing was fixed, committed, or pushed.

---

## VERDICT: **FINDINGS**

**One blocker, one major, two minors.** Ten of twelve prior findings are
cured — most of them cured well, several cured better than the brief
asked. Commit hygiene is clean. Every gate is green and every mechanical
claim I spot-checked reproduced.

**The blocker is that F1 is not cured, and the branch now asserts that it
is.** The narrowing of `{"k":"literal"}` is exactly right and the brief's
four named vectors are dead. But `{"k":"check"}` carries `args` as an
unconstrained JSON object with no recursive bound, so `5e-324` still
enters `flb.type.v0` identity bytes and the type digest — the same
shortest-round-trip obligation, one grammar production over. Four tracked
files, including the coordinator-owned `SPEC.md`, now state as law that
this cannot happen, and the branch's own passing property test mints the
counterexample in the same commit.

---

## Review environment

Reviewed from a detached worktree at the branch tip, because the primary
checkout is on the branch and carries the coordinator's uncommitted
records:

```
$ git worktree add --detach C:/Users/kokok/Dev/foldlab-rev-cure 157ee53f5
HEAD is now at 157ee53f5 Widen kernel hygiene to the default channel and the generator
```

All builds, gates, and probes below ran in
`C:\Users\kokok\Dev\foldlab-rev-cure`. It was left clean
(`git status --short` empty) after every probe and removed at the end of
this review.

**Note for the operator: the earlier review worktree
`C:/Users/kokok/Dev/foldlab-rev-hyg` STILL EXISTS**, detached at
`7cfb0b660`, and its working tree is clean. Remove it with
`git worktree remove C:/Users/kokok/Dev/foldlab-rev-hyg`.

This file is written to the primary checkout and is untracked. Do not let
it ride into a branch commit.

---

## Commit hygiene: **PASS**

The primary checkout carries two modified tracked files (`.gitignore`,
`scratch/dispatch/07-moves-vector-wall.md`) and twenty-three untracked
coordinator records (the `docs/research/2026-08-16-rq*.md` sweep, the
grill record, dispatch drafts 17–25, this review's predecessor). **None
of them appears in any of the four cure commits.**

```
$ git diff --name-only 7cfb0b660..157ee53f5 | grep -Ei 'scratch/|docs/research|docs/design|\.gitignore|MEMORY'
(no matches)
```

The full 43-file changeset is confined to `VERIFICATION.md`,
`docs/FREEZING.md`, `proto/**`, and `verify/{AGENTS.md,moves/**}`. Each
commit's file list matches its stated scope; no commit reaches into
another's. The JCS seam fence held again — `go/canonical/**` and
`packages/core/**` are untouched, as are `fixtures/`, every frozen
`proto/wire/fixtures/*.json` except `sessions.json`, `Moves/Spec.lean`
(frozen sha256 pin unchanged and passing), and `gate-exclusions.txt`.

---

## Gate transcripts (all re-run by this seat)

| gate | exit | result |
|---|---|---|
| `bash verify/moves/run.sh` | **0** | 12 `GATE: PASS` lines; corpus regenerates byte-identical |
| `bash verify/ir/run.sh` | — | not re-run; `verify/ir/**` is untouched by the cure (0 files) |
| `cd proto/go && go test ./...` | **0** | all packages ok |
| `bun run gates` | **0** | `FOLDLAB GATES: PASS`, 152 pass / 4 skip / 0 fail |

`verify/moves/run.sh`, full `GATE:` line set:

```
GATE: PASS (kernel annotations: implemented_by absent, extern and partial allowlists clean)
GATE: PASS (kernel sources: panic!, panic, bang accessors, unsafe, native_decide, and sorry absent)
GATE: PASS (implemented_by negative control refuted on its named check)
GATE: PASS (extern negative control refuted on its named check)
GATE: PASS (panic! negative control refuted on its named check)
GATE: PASS (panic negative control refuted on its named check)
GATE: PASS (bang accessor negative control refuted on its named check)
GATE: PASS (unsafe negative control refuted on its named check)
GATE: PASS (native_decide negative control refuted on its named check)
GATE: PASS (partial negative control refuted on its named check)
GATE: PASS (sorry negative control refuted on its named check)
GATE: build passed
GATE: PASS (move-calculus proofs, kernel hygiene, axiom footprint, spec pin, orphan rule, corpus regeneration)
```

Counted independently: the axiom roster in `run.sh` holds **39** entries
and `negative-controls/` holds **9** `.lean` files — both matching the
corrected claims in `verify/AGENTS.md` and `VERIFICATION.md`.

---

## Per-finding disposition, F1–F12

| # | prior sev | disposition | evidence |
|---|---|---|---|
| **F1** | blocker | **PARTIALLY CURED — the finding is still open, and now contradicted by law** | literal narrowing verified dead-on; `check.args` still mints `5e-324` into identity bytes. See §F1 below. |
| F2 | major | **CURED as ruled** (ruling 6) | No admission change, as ruled. `checkValue({"k":"opaque"}, 21.5)` → `nil`, confirmed. Law written where the contract lives: `proto/wire/CONTRACT.md:341-349` states uninterpreted canonical bytes, identity IS byte equality, kernel never parses, JCS seam owns canonicity. DECISIONS entry present, house format. |
| F3 | major | **CURED** | Nine checks, nine committed controls, each planting exactly its own violation and clearing the checks before it; traces byte-compared; `negative-controls/` unreachable from `lake build` (proved by the green build — the controls contain `sorry`, `panic!`, `unsafe`). A control-orphan rule (`run.sh:341-353`) refuses a control that is committed but never run — that closes the other direction and was not asked for. |
| F4 | major | **CURED, beyond the brief** | Probes H, I, K all now exit 1; `native_decide` and unqualified `get!` too. See §Probe battery. The bang family is matched as Lean's *convention*, not a name list, with the curation rule and its stated bounds in `verify/moves/DECISIONS.md`. `noncomputable` is deliberately unchecked with its reason recorded, as C4 asked. |
| F5 | major | **CURED** | Roster is now `Moves.lean Main.lean` + `find Moves Oracle`. `Main.lean:86`'s `n.toNat!` replaced by `String.toNat?` + usage refusal; executed: `lake exe oracle emit x` → **exit 2**, `usage: oracle (emit N \| serve)`; `emit 3` → exit 0 with vectors. `partial def serve` is a digest-pinned allowlist row, not a carve-out; verified in four directions (§Allowlist probes). |
| F6 | major | **CURED** (one brief clause unmet on a false premise) | All five fixtures regenerate byte-identical from the committed command (§Regeneration). `_provenance` present and *required* by both readers. Residual: the brief's "the regeneration byte-diff joins the gate that already covers the wirefix four" — no such gate exists for the four either. See finding **N2**. |
| F7 | major | **CURED** | `proto/GRAMMAR-SITES.md` lands beside the grammar. I compared it site-by-site against my own table from the prior review: **the two agree on all sixteen rows**, including the `contract.go` checked-clean call. Sites 15/16 (Lean) are excluded from the grep guard with a stated boundary reason. |
| F8 | minor | **CURED** | Guard widens 3 → 14 sites and greps the quoted kind name rather than a shape, which closes the `case "float", "int":` evasion I named. A second guard (`TestIntegralityBoundIsStatedOnce`) requires that only `walk.go` states `9007199254740991` and that `author.ts` mirrors it. |
| **F9** | minor | **STILL OPEN — and the cure made the stale text more wrong** | `verify/ir/**` is untouched (0 files in the diff). See finding **N3**. |
| F10 | minor | **CURED** | `proto/AGENTS.md:3-16` states the exception, its shape, and names both merged instances. Honest about scope: DECISIONS records that root `AGENTS.md` carries the same absolute sentence and that "aligning it is reported, not done here." |
| F11 | minor | **CURED** | `verify/AGENTS.md:53-58` now reads thirty-nine gated axiom reports, five model-level violation controls, three frozen mutant kills, nine source-hygiene controls. I counted 39 and 9 in the tree; both match. |
| F12 | minor | **CURED** | DECISIONS entry records the hard cut across *both* digest moves (`d5ff3590… → 78aff5581… → ca4ac75f…`), names the consequence (pre-cut journals unopenable and unreplayable), and bounds it by `proto/AGENTS.md`'s disposable-tracer-data law. |

---

## F1 — the blocker: the narrowing is right, the claim around it is false

### What the cure got exactly right

`{"k":"literal"}` is narrowed, and it is narrowed the way ruling 5 said:
one predicate, `isIntegralJSONNumber` (`walk.go:35-37`), called by both
the `int` leaf and the literal position, mirrored in TypeScript by
`Number.isSafeInteger`. The refusal is `invalid-structure` under its own
new law rather than the scalar-shape law, so the teaching names the bound
instead of calling `0.1` a non-scalar. No refusal kind was minted.

Executed in my worktree (probe removed afterwards; worktree clean):

```
literal 5e-324                 REFUSED kind=invalid-structure path=[value]
literal 0.1                    REFUSED kind=invalid-structure path=[value]
literal 1e21                   REFUSED kind=invalid-structure path=[value]
literal 1e-7                   REFUSED kind=invalid-structure path=[value]
literal 9007199254740992       REFUSED kind=invalid-structure path=[value]
literal 1e2                    STILL LAWFUL   canonical = {"k":"literal","value":100}
literal 9007199254740991       STILL LAWFUL   canonical = {"k":"literal","value":9007199254740991}
```

Every vector the brief named as an acceptance set is dead, the boundary
is placed correctly on both sides, and the two admitted values are the
ones that should be admitted.

### What is still open

`walkCheck` (`proto/go/protod/walk.go:354-359`) is the whole of the
`args` validation:

```go
if _, ok := checkValue["args"].(map[string]any); !ok {
    return structureRefusal(...)
}
return nil
```

`args` is an arbitrary JSON object, never recursed into. `check` is a
**type** node, so `args` is part of the term's canonical bytes and its
digest. Executed:

```
walkStructure: ADMITTED
walkPartial (the serveFill seam): ADMITTED
identity bytes     = {"base":{"k":"string"},"check":{"args":{"min":5e-324,"tol":1e-7},"name":"minLength"},"k":"check"}
flb.type.v0 digest = 1d477bce2ae1a30fdef0a52fe701fefb487f3949f61f3ac63631aa5b86aa7f94
```

(Identity bytes produced through `go/canonical`, the RFC 8785
canonicalizer, not through `json.Marshal`.) Also admitted: `0.1`,
`1e+21`, `1.7976931348623157e+308`, and a non-integer nested three levels
down (`args.deep.a[0] = 0.5`). `5e-324`, `1e-7` and `1e+21` are again
*exactly* the ES2019 §7.1.12.1 / RFC 8785 §3.2.2.3 shortest-round-trip
renderings — the object RQ-9 measured and the object ruling 2 dropped the
float leaf to avoid formalizing.

This hole is **pre-existing** — `walkCheck` is untouched by the cure. The
new defect is what the cure says about it.

### The new defect: four tracked files assert the universal

Ruling 5 states the cure "completes ruling 2's intent: non-integer
numbers no longer enter type identity bytes by any construct." The branch
writes that conclusion down as law in four places, all of them refuted by
the probe above:

- `proto/SPEC.md:88-95` — "Every number position in the grammar — the
  `int` leaf and a literal's `value` — carries the same integrality
  bound … no v0 term can carry a number whose canonical form needs
  shortest-round-trip printing, so a canonical-value law over this whole
  grammar owes no such proof obligation." *This is the
  coordinator-owned behavioural spec.*
- `proto/wire/CONTRACT.md:350-354` — "Every number position in a v0 TERM
  is integral … The consequence is the point: no v0 term canonicalizes
  through shortest-round-trip number printing."
- `proto/AGENTS.md:72-76` — same universal, plus "Non-integer numbers
  reach the protocol only as opaque bytes."
- `proto/go/protod/walk.go:32-34` — "The bound is what keeps non-integer
  numbers out of identity bytes entirely: no construct in v0 can carry a
  value whose canonical form needs shortest-round-trip printing."

### The branch refutes itself in the same commit

`proto/ts/test/concierge.test.ts:40-41`, added by `0b75a6c0e`:

```ts
// Check args are an unconstrained JSON object, so this arbitrary keeps the
// non-integer extremes.
const jsonScalarArbitrary: FastCheck.Arbitrary<Json> = FastCheck.oneof(
  ... FastCheck.constantFrom(..., Number.MIN_VALUE, Number.MAX_VALUE),
)
```

`jsonScalarArbitrary` feeds `arg` at `:83`, which becomes
`check: { name, args: { [argKey]: arg } }` at `:122`. `Number.MIN_VALUE`
*is* `5e-324`. So the branch ships a **passing** property test that mints
lawful v0 check terms carrying `5e-324`, and `bun run gates` is green on
it, in the same commit whose sibling files say that term cannot exist.
The executor saw the hole clearly enough to write a comment about it and
still let the universal stand.

The `literalScalarArbitrary` added immediately below it is the correct
instinct applied to the wrong half of the problem, and its own comment
states the principle the check side violates: generating an unlawful
value "would test the refusal path under the name of the admission path."

### Why this is a blocker rather than a note

REF-2a's charter quantifies over the whole grammar. One admitted
non-integer number reinstates the shortest-round-trip proof obligation —
the branch's own DECISIONS entry says exactly this ("**Load-bearing?
yes** — REF-2a's canonical-value theorem quantifies over this grammar,
and one admitted non-integer number reinstates the shortest-round-trip
proof obligation"). That sentence is correct and it applies to
`check.args`. DEV-670's generation barrier was held for ruling 5 for this
reason; the barrier's condition is not yet met.

Note also that the survey (`GRAMMAR-SITES.md`) enumerates *kind-alphabet*
restatements. It has no row for a number position. That is how a third
number position stayed invisible to a sixteen-site audit, and it is worth
fixing in the survey's shape, not only in the code.

**Disposition is an operator ruling, not a silent fix.** Either bound
`check.args` (recursively, reusing `isIntegralJSONNumber` — but note this
moves the grammar digest a third time and re-regenerates `sessions.json`),
or narrow the universal in all four files to the two positions it
actually covers and re-price what REF-2a's `proved` buys. What must not
merge is the current state: a false law in the coordinator-owned spec
with a green test minting its counterexample.

---

## Other findings

### N2 (major) — `sessions.json` is reproducible but nothing re-runs it

C6 is otherwise cured well, and the generator design is better than the
brief asked for: `buildSessions` drives a **live daemon** and records what
it journaled, and `learnSessionGrammar` obtains the grammar digest from
the daemon's own teaching refusal rather than restating the descriptor —
which is the difference between a generator and a fifteenth copy of the
grammar. Both readers now *require* the `_provenance` line
(`session_test.go:157-161`, `session-journal.test.ts:55,70`), so it cannot
quietly disappear.

What is unmet is the brief's clause "the regeneration byte-diff joins the
gate that already covers the wirefix four." **No such gate exists.**
`docs/FREEZING.md`'s inventory lists the Guard for all five wirefix
fixtures as `-force`, which is overwrite protection, not a regeneration
diff; `bun run gates` never runs `wirefix`. The brief asked the cure to
join a gate that was never there, so this is a false premise in brief 25
rather than an evasion by the executor — but the consequence is real: a
drifted `sessions.json` is caught only insofar as the two readers
re-derive it, and nothing mechanically proves the committed bytes are a
fresh emission. Mitigating, and I verified it: `session_test.go` pins the
grammar digest against `sessionGrammarDigest()` and the TS reader
re-derives every chain head from `GENESIS`, so content drift *is* walled.

### N3 (minor) — F9 is still open, and ruling 5 made the stale prose worse

`verify/ir/` is untouched by the cure (0 files), and brief 25's C8 lists
items a–d covering F8, F10, F11, F12 — F9 has no item despite the section
header reading "minors (F8–F12)". So this is a gap in the brief, faithfully
executed.

The cost is that the prose is now doubly wrong.
`verify/ir/IR/Semantics.lean:16-17` still reads:

> `int` accepts the model's integer `num`; non-integer JSON numbers remain
> only in scalar literals and are outside this abstraction.

Ruling 5 just removed non-integer numbers from scalar literals entirely.
The sentence now points at the one position the cure closed. Same for
`IR/Syntax.lean:13-14` ("non-integer literal identity questions are the
number-determinism dossier's lane"). My prior suggested wording is also
now wrong, since it named `literal.value` as where they survive; the
accurate statement after this cure is that the model has no non-integer
numbers and the wire admits them only in `check.args` and in opaque
payloads — which is the same sentence F1 needs settled first.

### N4 (minor) — tracked docs cite three files a fresh checkout does not have

`proto/SPEC.md`, `proto/GRAMMAR-SITES.md`, `proto/DECISIONS.md`, and
`verify/moves/DECISIONS.md` cite
`scratch/dispatch/25-float-hygiene-cure.md`,
`docs/research/2026-08-16-review-float-hygiene-branch.md`, and
`docs/design/2026-08-16-ref0-extraction-grill-record.md`. All three are
untracked; none is in the tree at the branch tip. `SPEC.md`'s citation is
load-bearing — it is the recorded authority for editing a
coordinator-owned spec, and a fresh checkout cannot read it.

This is not a commit-hygiene failure: the commits were *right* to leave
the coordinator records out. It is the tension that correct hygiene
creates, and it needs a coordinator decision. Prior practice cuts the
other way — dispatch briefs 15 and 16 are tracked at `7cfb0b660`, and
root `AGENTS.md` already cites `scratch/dispatch/` paths. The branch's own
DECISIONS states the principle that decides this: "a deliverable no fresh
checkout can read is a deliverable that does not exist."

---

## Spot-check transcripts

### Probe battery — real kernel sources, real gate

Each violation was appended to a real rostered source, the full `run.sh`
was executed, and the file was restored. `git status --short` was empty
after the run.

| probe | planted | target | exit | diagnostic |
|---|---|---|---|---|
| A | `@[implemented_by Nat.succ]` | `Moves/Model.lean` | **1** | `forbidden @[implemented_by] at Moves/Model.lean:1962` |
| B | `@[extern "lean_probe"]` | `Moves/Model.lean` | **1** | `unallowlisted @[extern] at Moves/Model.lean:1962` |
| C | `panic! "x"` | `Moves/Model.lean` | **1** | `forbidden panic! at Moves/Model.lean:1962` |
| D | `partial def probeD` | `Moves/Model.lean` | **1** | `unallowlisted partial at Moves/Model.lean:1962` |
| **H** | `panic "evade"` | `Moves/Model.lean` | **1** | `forbidden panic at Moves/Model.lean:1962` |
| **I** | `([] : List Nat).head!` | `Moves/Model.lean` | **1** | `forbidden bang accessor at Moves/Model.lean:1962` |
| **K** | `unsafe def probeK` | `Moves/Model.lean` | **1** | `forbidden unsafe at Moves/Model.lean:1962` |
| **J** | `by native_decide` | `Moves/Model.lean` | **1** | `forbidden native_decide at Moves/Model.lean:1962` |
| P | `get! (some 1)` (unqualified) | `Moves/Model.lean` | **1** | `forbidden bang accessor at Moves/Model.lean:1962` |
| Q | `:= sorry` | `Moves/Model.lean` | **1** | `forbidden sorry at Moves/Model.lean:1962` |
| G1 | `panic "evade"` | `Main.lean` | **1** | `forbidden panic at Main.lean:100` |
| G2 | `"3".toNat!` | `Main.lean` | **1** | `forbidden bang accessor at Main.lean:100` |
| G3 | `unsafe def` | `Main.lean` | **1** | `forbidden unsafe at Main.lean:100` |
| O1 | `panic "evade"` | `Oracle/Codec.lean` | **1** | `forbidden panic at Oracle/Codec.lean:65` |

H, I and K are the brief's named acceptance vectors and each now exits 1.
J is now caught by hygiene by name rather than incidentally by the orphan
rule. P is mine, not the brief's: it confirms the unqualified branch of
the bang pattern fires, not only the dot-notation branch. G1–G3 and O1
confirm C5 — the generator half of the roster is genuinely armed, not
just declared.

**False-positive probes** (hygiene phase must return 0):

| probe | planted | hygiene |
|---|---|---|
| E2 | `-- implemented_by panic! panic partial extern unsafe native_decide sorry .head!` | **both PASS lines printed** |
| F2 | `/- … same tokens … -/` | **both PASS lines printed** |
| S | `def probeS : String := s!"value {1}"` | **both PASS lines printed** |
| T | `def probeT : Bool := (1 : Nat).succ != 2` | **both PASS lines printed** |

E2/F2 also trip the *pre-existing* comment-scanning grep at `run.sh:366`
(`GATE: FAIL — lean sources mention sorry/admit`), which is correct
behaviour — that grep deliberately scans comments and my probe text
contains `sorry`. The hygiene sweep itself did not false-positive on any
of the nine checks. S and T confirm the two evasion-adjacent shapes the
DECISIONS entry claims are safe by construction: `s!` interpolation is
not matched, and `!=` is excluded by the trailing-`=` guard.

### Allowlist probes — the `partial` mechanism, four directions

| probe | scenario | exit | result |
|---|---|---|---|
| M1 | approved line edited in place (digest moves) | 1 | `unallowlisted partial at Main.lean:68` |
| M2 | approved line pushed down one line (location moves) | 1 | `unallowlisted partial at Main.lean:69` |
| N | malformed row (`deadbeef`, no `operator-ratified:`) | **2** | `malformed kernel partial allowlist entry: Main.lean:99` |
| O | allowlist file deleted | **2** | `kernel partial allowlist is missing` |

M1 and M2 together prove the claim in DECISIONS that the approval binds
to one exact line and re-enters review when it moves *or* changes. N and
O prove the machinery/violation distinction is preserved on the new
allowlist: status 2 for a broken gate, never 1.

### Oracle usage refusal (C5)

```
$ lake exe oracle emit x
usage: oracle (emit N | serve)
EXIT=2

$ lake exe oracle emit 3
{"command":"lake exe oracle emit 3","format":1,"generator":"verify/moves oracle"}
{"fences":{...},"moves":[...],...}
EXIT=0
```

The forged-verdict channel the commit message describes is closed: a
non-numeric count refuses instead of emitting the zero-vector corpus at
exit 0.

### Fixture regeneration byte-diff (C6)

```
$ cd proto/go && go run ./cmd/wirefix -force -dir <scratch>
wirefix: fixtures written
IDENTICAL  types.json
IDENTICAL  chains.json
IDENTICAL  frames.json
IDENTICAL  concierge.json
IDENTICAL  sessions.json
```

All five, including `sessions.json`, regenerate byte-for-byte from the
command named in the `_provenance` line — through a live daemon over
NATS, into a clean directory, in a fresh worktree. The generator is
deterministic across daemon instances (the session key and every chain
head reproduced). This is the strongest single result on the branch.

I also confirmed the "exactly nine values move" claim in DECISIONS for
the literal-narrowing regeneration: commit `4517b0bb2`'s `sessions.json`
diff is exactly 9 removed and 9 added value lines, with no formatting
churn — which is what "machine-owned" buys and what the prior review's F6
was about.

---

## What is right, and worth saying

- The literal narrowing is **the right cut, at the right seam, stated
  once**. The `int` case now calls the shared predicate rather than
  restating it, and a grep guard mechanically prevents a second
  statement from appearing.
- The hygiene gate went from a **token** check to a **channel** check.
  Matching Lean's bang convention rather than a name list is the choice
  that does not rot, and the DECISIONS entry states its bounds honestly
  instead of overclaiming.
- The **control-orphan rule** was not asked for and is the best thing in
  the hygiene commit: a control that nothing runs cannot fail, and the
  gate now refuses that.
- `partial` becoming a **digest-pinned per-site row** instead of a roster
  carve-out is exactly the discipline the brief asked for, and I could
  not break it.
- `learnSessionGrammar` asking the daemon for its digest **via its own
  teaching refusal** avoids minting a fifteenth restatement of the
  grammar, and doubles as a live demonstration of W7.
- `GRAMMAR-SITES.md` **agrees with my independently built table on all
  sixteen rows**, and lands beside the grammar rather than in a dated
  research file.
- `VERIFICATION.md` and `verify/AGENTS.md` are now **accurate**,
  including their stated bounds. Claims that were aspirational are now
  true.
- DECISIONS entries are in house format throughout, name their rejected
  alternatives, and are honest where scope was left open (root
  `AGENTS.md` alignment "reported, not done here").

---

## Recommended disposition order

1. **F1 / the blocker** — operator ruling. Bound `check.args` recursively
   (reusing `isIntegralJSONNumber`; expect a third grammar-digest move and
   another `sessions.json` regeneration), **or** narrow the universal in
   `SPEC.md`, `CONTRACT.md`, `AGENTS.md`, and `walk.go` to the two
   positions it covers and re-price REF-2a. Either way, add a number-position
   row to `GRAMMAR-SITES.md` so the next audit sees all of them. This must
   settle before DEV-670 generates, for the same reason ruling 2 was urgent.
2. **N2** — decide whether a wirefix regeneration gate is owed for all
   five fixtures (the brief assumed one exists). Cheap: the byte-diff I ran
   is four lines of script.
3. **N3** — reword `IR/Semantics.lean:16-17` and `IR/Syntax.lean:13-14`
   after F1 settles, since the correct sentence depends on the ruling.
4. **N4** — coordinator decision on whether dispatch briefs and Rev
   reports get committed, given that `SPEC.md` now cites one as its
   authority.
