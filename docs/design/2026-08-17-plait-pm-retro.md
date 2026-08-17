> **Coordinator adoption record, 2026-08-17.** Subagent-authored retro
> over runs DEV-694..DEV-701 (27 runs, 319.3 seat-minutes), adopted
> with these dispositions: **T1 authority-precedence clause** — ADOPTED
> into the executor-spec template effective the wave-2 dispatches
> (precedence: binding record > named program-doc sections > the
> spec's decisions; apparent contradiction with a binding authority is
> a finding to file, never a reading to choose). **Live-run charge
> discipline** — ADOPTED as coordinator law: check `multica issue runs`
> for a running row before posting any charge; a charge lands between
> runs or cancels first. **Environment hermeticity** — the two
> one-command fixes dispatched to Ops; the gates-bootstrap change rides
> the post-merge hygiene brief. **Generated-not-hand-typed applies to
> gates** — already charged into the spine round-2; validated here.
# Plait wave-1 execution retrospective — faults, costs, and what to change

Scope: project `plait`, issues DEV-694, DEV-695, DEV-696, DEV-697, DEV-698,
DEV-700, DEV-701. Window 2026-08-17 08:22:12Z to 10:51:31Z (2 h 29 m
wall-clock). 27 runs across five seats (Eng CX PC, Rev CC PC, Design CC PC,
DevRel CC PC), 319.3 minutes of measured seat time, two runs still in flight
at the time of this review (DEV-694 `ea825371`, DEV-695 `f47477c3`).

Sources: `multica issue runs --output json` (dispatch/start/complete stamps,
attribution, delivered comment ids), `multica issue run-messages` for all 19
non-trivial runs, `multica issue comment list` for all seven threads, and
`multica issue usage`.

One clean bill first, so it is not lost below: **every run was `attempt 1/2`
and no run carries an `error`**. Nothing in this wave failed for
harness, model, or infrastructure crash reasons. Every fault below is a
coordination, specification, or environment-provisioning fault.

Seat time by issue:

| Issue | Runs | Seat minutes | Cache-read tokens |
|---|---|---|---|
| DEV-694 spine (Eng) | 8 | 72.2 | 59.9 M |
| DEV-695 fabric (Eng) | 12 | 149.3 | 88.9 M |
| DEV-696 Rev #66 r1 | 1 | 13.6 | 3.4 M |
| DEV-697 DevRel | 1 | 10.7 | 5.4 M |
| DEV-698 Rev #67 r1 | 2 | 36.5 | 11.0 M |
| DEV-700 Design part 3 | 2 | 18.8 | 6.3 M |
| DEV-701 Rev #67 r2 | 1 | 18.1 | 7.9 M |

The two build issues took 69 % of seat time and 81 % of token spend. That is
where all the rework lives, and it is what this report is about.

---

## 1. Fault catalog

Nineteen entries. Costs are measured from `dispatched_at`/`completed_at`
unless marked *judged*.

### C1. Phantom Effect authority files stop the spine before the first edit
**Cite:** DEV-694 run `18323f38` (08:22:16–08:26:58), comment `b7df93d3`;
coordinator disposition `8a393dd2`.

The Eng seat loaded `implement`, then `tdd`, `effect`, `board-style`,
`multica-working-on-issues`, `writing`, and `multica-mentioning` in sequence,
and at 08:26:12 — three minutes and forty seconds of instruction loading in —
the `effect` skill halted the build: its two named repository authorities,
`docs/design-effect-conventions.md` and `docs/style-effect-modules.md`, did not
exist. The skill classifies a missing named authority as a provisioning failure
and forbids edits. The seat behaved correctly: it stopped, wrote a reproducible
blocker, and escalated by mention. The coordinator's disposition established
that the two names came from the skill, not the repository — "they had no
history here and nothing at e383577d1 referenced them" — and committed both as
pointer files at `de7236b19`. Note a second instance of the same class inside
the same run, self-resolved: at 08:24:23 the seat recorded that "the skill's
older pin note is superseded by the repository and dispatch records" for the
Effect version pin.

**Root cause:** skill/config interference.
**Cost:** 4.7 min, one run wholly wasted (no code, no PR), plus `2c0e3089`
below, plus the branch collateral in C2.

### C2. Three branch-naming conventions shipped in one wave
**Cite:** DEV-694 run `449ffe2b` seq 56 → 104; `git branch -a` shows
`remotes/origin/agent/design-cc-pc/76983e01`.

The harness checks out `agent/<seat>/<run-id>`. The dispatch says "Eng builds
on `agent/<name>/<issue>`". At 08:33:05 the seat tried
`git branch -m agent/eng-cx-pc/dev-694` and got
`fatal: a branch named 'agent/eng-cx-pc/dev-694' already exists` — the
abandoned blocked run `18323f38` had already claimed that name in a sibling
worktree of the same bare repo, and Windows git resolves the case difference to
a collision. The seat fell back at 08:36:21 to renaming the branch to the issue
**UUID**: `agent/eng-cx-pc/90f24c3e-98b2-48e0-b7b8-babd0f07920e`. PR #67
therefore lives on a UUID branch while PR #66 lives on
`agent/eng-cx-pc/DEV-695`, and the Design seat never renamed at all, shipping
PR #68 on `agent/design-cc-pc/76983e01`. The DevRel seat had to enumerate the
branch list and match by UUID to read the spine (`a7d32b7f` seq 116).

**Root cause:** charge wording plus board mechanics (no reconciliation between
the harness default and the spec's convention; no cleanup of abandoned-run
branches).
**Cost:** ~3 min of in-run fumbling; downstream, every human and agent reader
of PR #67 resolves an opaque ref.

### C3. A comment posted into a live run is invisible to that run
**Cite:** four instances, all confirmed by `delivered_comment_ids`.

| Comment | Posted | Run it was aimed at | Delivered to | Delay |
|---|---|---|---|---|
| `8a393dd2` (DEV-694 disposition) | 08:31:00 | `449ffe2b` (dispatched 08:30:50) | `c35c6bd4` @ 09:08:17 | 37 m 17 s |
| `203a56af` (DEV-695 addendum 1) | 09:16:25 | `d9e42baf` (09:13:40–09:43:45) | `644d8ccd` @ 09:43:45 | 27 m 20 s |
| `f4ab43c8` (DEV-695 addendum 2) | 09:18:36 | `d9e42baf` | `644d8ccd` @ 09:43:45 | 25 m 09 s |
| `dd07e1c4` (DEV-698 addendum) | 09:16:03 | `c4681d89` (09:10:43–09:41:59) | `80cf5ce2` @ 09:41:59 | 25 m 56 s |
| `bf89a81a` (DEV-695 scope correction) | 10:18:00 | `114606dd` (09:59:11–10:25:22) | `3bc67983` @ 10:25:22 | 7 m 22 s |

Mean delivery delay 24 minutes. In each case the board queued the comment and
opened a **new run** when the in-flight run ended. The clearest waste is
`c35c6bd4`: dispatched at 09:08:17, it read the thread, concluded at 09:09:00
that "the triggering ruling has already been carried through", and posted a
53-second duplicate of a report filed 71 seconds earlier (`de9cfc86` vs
`8aed92c9`). `80cf5ce2` was the least wasteful — it produced two genuine new
majors — but it split one review verdict across two comments and two runs, so
the coordinator's repair charge had to reassemble it.

**Root cause:** board mechanics.
**Cost:** four extra runs, 25.9 min total (`c35c6bd4` 0.9 + `644d8ccd` 14.6 +
`80cf5ce2` 5.3 + `3bc67983` 5.1), of which 20.6 min produced no net change to
the tree.

### C4. Build-then-revert: the mid-review scope addendum cycle
**Cite:** DEV-695. Comments `203a56af` (09:16:25) and `f4ab43c8` (09:18:36);
runs `644d8ccd`, `9d1eeadd`, `114606dd`, `3bc67983`; comments `b248bf08`
(P3) and `bf89a81a` (scope correction).

This is the most instructive chain in the wave, and it is entirely
coordinator-side. Two additive `run.sh` amendments — name the first divergent
row in the FINDING message, and add a real `--self-test` — were posted into a
live repair run. They were delivered 27 minutes later to a follow-on run
`644d8ccd`, which built both, pushing `259077c` at **09:56:30** with a
`--force-with-lease` rebase. The reviewer `9d1eeadd` posted its verdict at
**09:57:26** — fifty-six seconds later — with the missing amendments as its
**blocker**: "Neither is in the tree… `run.sh --self-test` silently ignores the
flag and exits 0." The blocker was false on arrival. The coordinator then
charged it again as round-2 item P3 (`b248bf08`, 09:59:10). The next Eng run
recorded at 10:03:45 that "the existing self-test and divergence diagnostics
already satisfy P3" (`114606dd` seq 132). At 10:18:00 the coordinator issued a
scope correction under ratified grill item 19 — "mid-review scope addition
violates the issue-body-is-the-whole-scope law, and the coordinator's earlier P3
charge is corrected accordingly" — and run `3bc67983` spent 5.1 min **removing**
the work `644d8ccd` had spent 14.6 min building, leaving `run.sh` rejecting all
arguments with exit 2.

**Root cause:** coordinator scope addition, amplified by C3's delivery mechanic.
**Cost:** 19.7 min of seat time for zero net tree change; one invalid reviewer
blocker; one phantom charge item; two coordinator interventions; and it directly
caused C5's second instance.

### C5. A review dispatched at a ref that moves under it
**Cite:** two instances. (a) `9d1eeadd` reviewed `0b04231` while `644d8ccd`
force-pushed `259077c` at 09:56:30. (b) `c23765a7` (10:25:27–10:35:04) was asked
for `b529d7e`; head was `07acb5e`, pushed by `3bc67983` at ~10:29.

The mechanism is precise and repeatable. All three Rev re-reviews were
`source: delegation` — the Eng seat's closing `@Rev CC PC` mention dispatched
them, pinned to the commit the Eng seat had just reported. Any coordinator
comment still sitting in the queue then fires a follow-on Eng run in the same
second the Rev run starts (`c23765a7` dispatched 10:25:10, `3bc67983`
dispatched 10:25:22) and moves the head under the reviewer. The Rev seat
handled it well both times — it reviewed the head, diffed the two refs to
establish that the Lean package and fixture were byte-identical, and said so on
the record ("The ref moved under the request") — but it paid time for that, and
the round-1 instance produced a blocker that was already repaired.

**Root cause:** reviewer/ref mechanics.
**Cost:** one invalid blocker (which cost the whole of C4's tail); *judged* 2–3
min of `c23765a7` spent establishing which artifact it was reviewing; and a
report whose named check (`run.sh --self-test`) did not exist at the head it
verified.

### C6. "Tagged unions" in dispatch 29 decision 6 contradicted the binding record
**Cite:** DEV-694 spec decision 6; DEV-697 report §1.5; DEV-698 comment
`f0e429ac`; coordinator ruling `cd69bcec`; repair `3324f3c2`; DEV-701 verdict.

Decision 6 said refusals are "tagged unions carrying kind, `sort`, law
sentence, path, got/expected, `next`" and never said where they travel. The
binding architecture record §3 and part 1 §8.1 rule 1 both say refusals ride the
Effect **error channel** as `Schema.TaggedError`. The executor took the value
-union reading and shipped eight of ten public functions returning bespoke
`{ok}` unions. The consequence was exactly what the design existed to prevent:
`retryAbsence` takes an `Effect`, so decision 6's own final clause — "only
`absence` is retryable by the shipped policies" — was **vacuous** over the eight,
which the reviewer proved by typecheck. Two aggravating details. First, the
finding did not come from the review charge: DEV-698's charge item 2 restated
decision 6's six fields verbatim and inherited its ambiguity, so the Rev seat
passed the union shape on round 1 and later wrote "one of which I missed on my
first pass." It came from the **DevRel** seat reading the branch as an adopting
developer. Second, the sharper half — `Canonical.canonicalBytes` and
`Digest.digestOf` returning `packages/core`'s raw failure value with none of the
six fields — was invisible to both the spec and the gates.

**Root cause:** spec ambiguity, in a clause the spec labelled "the executor
edits none of these".
**Cost:** 28.4 min repair (`3324f3c2`) + 18.1 min re-review (`ba19bd0e`) + two
coordinator rulings + the round-2 charge now in flight. The single largest
rework item on the spine.

### C7. PR #66's fixtures land in a package only PR #67 creates
**Cite:** DEV-695 spec gate list ("The vector corpus lands under
`packages/plait/fixtures/`"); DEV-696 blocker 1; repeated in `ddf354dd`,
`52d539c0`, `76998710`, `114606dd` seq 327, `9d1eeadd`, `16a0d9ba`.

Dispatch 29 and dispatch 30 were dispatched one second apart (08:22:12 and
08:22:13) with dispatch 30 required to write into a directory dispatch 29
creates. The repository's package-test policy refuses a runtime package with no
`package.json`, so PR #66 turned the `negative-controls` CI job red on its first
push and stayed red for all four rounds. The coordinator had to add an
instruction mid-charge — "if main still lacks it when you finish, REPORT rather
than improvise a package.json" — the Eng seat carried a caveat paragraph in five
consecutive reports, and the Rev seat re-verified the same non-finding three
times ("correctly held by sequence rather than improvised").

**Root cause:** sequencing, fixed at spec-authoring time.
**Cost:** no direct minutes, but a permanently red required-adjacent check
across four rounds, one extra charge clause, and *judged* three reviewer
re-verifications of a known non-finding.

### C8. The gate list gated the script's exit code, never its wiring
**Cite:** DEV-696 blocker 2.

Dispatch 30's gate list required `bash verify/fabric/run.sh` green. It did not
require the script to be **invoked by anything**. The Lean CI workflow called
only the moves and IR gates, `bun run gates` called no `run.sh`, and AGENTS.md's
model-gate list did not name fabric. The reviewer's line is the finding: "the
green `lean` tick on the PR carries no information about this package."

**Root cause:** spec gap the spec's own gate list could not catch.
**Cost:** one round of a green tick that meant nothing; repaired inside the
round-1 repair.

### C9. F2b's spec-fixed law kind was unsound as written; three rounds to bind it
**Cite:** dispatch 30 decision 4 F2b; coordinator addendum `f4ab43c8`; DEV-696
finding B2; round-2 charge item P1; landed at `b529d7e`.

The spec fixed F2b "in kind": position-floor-guarded application over an
at-least-once schedule equals exactly-once sequential application. As written
that is falsifiable, which the coordinator discovered only during wave-2 spec
drafting, **after** dispatch: "deliver 6 before 5: applying 6 advances the floor
and 5 is skipped forever." Three rounds followed, each dying on a different
version of the same defect. Round 1 indexed the schedule by position, making
dedup robustness definitional. Round 2 put the buffer's own output equation in
the premise — "a theorem about the buffer's own output is a tautology, not a
law." Round 3 finally quantified over raw arrivals with the shipped
`ingestSchedule` fold in the conclusion. A parallel defect ran alongside: the
F2b step function was addition, so no row could fail for a reordering reason —
the reviewer demonstrated that a consumer with no reorder buffer at all passed
the bounded-reordering row. The vector wall could not hold this; only a probe
could.

**Root cause:** spec ambiguity — the spec fixed what to prove and gave no
criterion for what would count as proving it.
**Cost:** the load-bearing content of `d9e42baf` (30.1), part of `644d8ccd`, and
`114606dd` (26.2), plus three review rounds. *Judged* ≥ 50 min.

### C10. Dispatch 30's fourth negative control was unstatable in the model
**Cite:** DEV-695 re-review `16a0d9ba`; round-3 charge `7cb08c80`; repair
`e701611e`.

The spec named four negative controls, one being "drop the floor guard → killed
by the F2b replay rows." The reviewer proved in Lean — inside the package's own
axiom allowlist — that deleting the floor guard is observationally equivalent,
because the drain reads only positions inside the window the guard admits. So
the specified control cannot exist, and what shipped under that name actually
dropped the successor discipline. The coordinator's response was correct and
exemplary: accept the theorem, remove the redundant guard ("the estate refuses
defenses against scenarios the model proves cannot happen"), roster
`guard_is_redundant` as the documenting theorem, rename the control family, and
record the spec deviation with a citable comment.

**Root cause:** spec ambiguity — a control specified over a component that turns
out not to be load-bearing.
**Cost:** 15.3 min (`e701611e`) plus a fourth review round. Cheap for what it
bought, but it was a round.

### C11. The R5 charge said "every" and got a hand-written list of eleven
**Cite:** coordinator charge `cd69bcec` item R5; repair `3324f3c2`; DEV-701
major; round-2 charge `e2e5d4de` item S1.

R5 asked for "a type-conformance test… asserting every exported effectful
function's error type extends Refusal (compile-time assertion file; a planted
`{ok}`-union export must fail it)". The seat delivered exactly that and it works
for what it lists: the reviewer regressed `factSubject` and got the right error
on the right line. Then the reviewer planted a **new** public fallible export
with a non-Refusal error, and the battery stayed green; then widened
`FabricClient.layer`, the only door to a live client, and it stayed green again.
The verdict names the cost precisely: "a list that must be edited by hand
reproduces the escape shape that let the round-1 findings past a green battery."
The round-2 charge then had to say "THE GATE MUST ENUMERATE, NOT LIST" and cite
"the generated-not-hand-typed law applied to the gate" — a law the estate
already ratified. It was available for the first charge and was not invoked.

**Root cause:** charge wording.
**Cost:** one full extra Eng round (`ea825371`, in flight) plus one review
round.

### C12. The gate battery is not hermetic; every fresh workdir buys a false red
**Cite:** eight runs. `38b990a9` seq 281–291, `449ffe2b` seq 388–397,
`d9e42baf` seq 214, `3324f3c2` seq 312–320, `114606dd` seq 307–318, `e701611e`
seq 210–220, `c4681d89` seq 63/93, `ba19bd0e` seq 86/100.

Every multica run gets a fresh worktree with no `node_modules`. `bun run gates`
does not bootstrap, so it fails twice in a fixed sequence: once on the
dependency-link guard at the root, and again later at `proto/ts`, a non-workspace
package with its own frozen lockfile. The install itself takes ~3 seconds. The
expensive part is that every seat, every run, must decide whether a red gate is
its own change or the environment — and each one wrote that reasoning out:
"the failure is the dependency-link guard, not a code/test result";
"`proto/ts` was an unbootstrapped independent package, not a code regression";
"this is the same fresh-checkout prerequisite, not a change failure." Both Rev
seats also carried it as a caveat on the record, which puts environment noise
into the durable review artifact.

**Root cause:** tooling/environment.
**Cost:** 1.5–2.5 min per run × 8 runs ≈ 16 min, nearly all of it diagnosis,
plus caveat lines in three reports.

### C13. The `gh` CLI token was invalid for the entire wave
**Cite:** `HTTP 401: Requires authentication` in `38b990a9` seq 96, `449ffe2b`
seq 402, `d9e42baf`, `3324f3c2` seq 99, `114606dd` seq 92, `e701611e` seq 226.

Six runs hit it. Each one rediscovered the same fallback: push over the SSH
remote, and route PR-surface writes (create, body edit, review comments) through
the connected GitHub app rather than `gh`. Two seats had to reason about whether
this was a publication blocker before proceeding. One (`38b990a9` seq 295) also
found the publication skill absent from the workspace-local alias and had to
load it from its installed plugin path.

**Root cause:** tooling/environment. One credential, unfixed for 2.5 hours.
**Cost:** *judged* ~1 min per publishing run, ~6 min total, plus the risk that a
seat treats it as a blocker rather than a fallback.

### C14. The binding architecture record shipped with type errors and missing modules
**Cite:** DEV-700 findings H-1 to H-4; DEV-697 report §1.5 (Catalog gap);
coordinator disposition `646919d9`; verification `1c73787a`.

Dispatch 29 declared the architecture record BINDING and decision 1 required the
module map to be "EXACTLY the architecture record's §2." That record had
`Schema.Schema<A, Digest, Catalog | Blobs>` where the pin's one-parameter
`Schema.Schema<out T>` cannot take it (the correct form is
`Schema.Codec<T, E, RD, RE>`); it referenced a `Catalog` service with no home in
its own §2 map; and `Venues` and `Seats`, both called in parts 1 and 2, had no
owning module. Four defects in a binding record, found by two read-only seats in
one hour, repaired at `62882360e` for negligible seat cost. The Design seat's
own note is the lesson: "this correction only surfaced because the shape check
ran against `repos/effect` instead of memory — the rule earned its keep on a
documentation-level defect, which is the cheap place for it to."

**Root cause:** spec gap — an authority declared binding without being
shape-checked.
**Cost:** near-zero here because it was caught in design. The counterfactual is
the cost: an E-series executor building the `Resolved` seam against it.

### C15. A new Lake package's build directory was not covered by ignore rules
**Cite:** `38b990a9` seq 303.

The house model-gate shape had no `.gitignore` provision for a **new** Lake
package, so `verify/fabric/.lake` binaries got staged. The seat's own pre-commit
staging check caught it and added the package-local ignore.
**Root cause:** spec gap / template omission. **Cost:** ~1 min, self-caught.

### C16. `lake` invisible to the bash subshell in a fresh workdir
**Cite:** `e701611e` seq 160: "the first run failed before reaching the new
assertion because this fresh checkout's Bash process cannot see `lake`."
Recovered by resolving the toolchain path. It landed at the exact moment the
seat was establishing a red/green signal, so it briefly polluted the one signal
it was trying to trust.
**Root cause:** tooling/environment. **Cost:** ~1 min.

### C17. Windows worktree removal blocked by Lean build artifacts
**Cite:** `a7d32b7f` seq 111–115: `git worktree remove --force` returned
`Permission denied` (exit 255) on a worktree holding `.lake` output; then
`'../fabric-review' is not a working tree` (exit 128); resolved by `rm -rf` plus
`git worktree prune`.
**Root cause:** tooling/environment. **Cost:** ~30 s, self-recovered, and the
seat still left the branch list clean.

### C18. Complex quoted pwsh one-liners fail through `exec_command`
**Cite:** `449ffe2b` seq 301–302 — a multi-statement command to build and probe
`nats-server` came back as its own mangled echo; the seat abandoned the
one-liner and read the server source out of the Go module cache instead
(08:52:05 → 08:53:57). Six such error results across 1,596 tool calls, so the
rate is 0.4 % and this should not be oversold. The related structural point is
larger: the CX seat has only `exec_command` and `patch_apply` — no read or
search tool — and made **941** shell invocations across this wave, most of them
file reads, versus 209 `Bash` + 111 `Read` + 22 `Grep` on the CC seats.
**Root cause:** tooling/environment. **Cost:** ~2 min in one run.

### C19. The replacement run does not inherit the charge it replaced
**Cite:** five cancellations — `2570dc57`, `76cf7571`, `04ad9ab9`, `6cffb23c`,
`33d21001`. Each was a comment-triggered run cancelled within one second and
replaced by an `issue_assignment` run. In every case the cancelled run holds the
charge in `delivered_comment_ids` and the replacement holds `[]`. The charge is
therefore **not** injected into the prompt of the run that executes it; the seat
finds it by reading the thread. Every seat did read the thread here — "The active
charge is a review repair…", "the active work is the coordinator's round-two
repair charge" — so nothing broke. But the wave depended on an unguarded
behaviour five times.
**Root cause:** board mechanics. **Cost:** ~0 measured; a live latent risk.

---

## 2. Pattern ranking by total cost

1. **Spec ambiguity inside clauses labelled "spec-fixed"** — C6, C9, C10, with
   C8 and C14 as the gap-shaped members. *Judged* ≥ 95 min of rework plus four
   review rounds on #66 and two on #67. Every one of these was in text the
   executor was told it could not edit, which is precisely why the executor
   resolved the ambiguity silently instead of filing a finding. Dominant by a
   wide margin.
2. **Mid-run coordinator comments and the collisions they cause** — C3, C4, C5,
   C19. 25.9 min in four extra runs, 20.6 min of it net-zero, plus one invalid
   reviewer blocker, one phantom charge item, one self-reversed charge, and two
   moved refs. This is the cheapest cluster to eliminate outright.
3. **Non-hermetic environment** — C12, C13, C16, C17. ~23 min of pure
   diagnosis producing zero information, spread thin across nearly every run so
   it never looks urgent. Two of the four are single-command fixes.
4. **Charge wording that under-specifies the artifact** — C11, and C9's
   "what counts as proving it" half. One full Eng round plus one review round on
   C11 alone.
5. **Sequencing collisions authored into the specs** — C7. No direct minutes; a
   red check carried through four rounds, one added charge clause, five caveat
   paragraphs, three reviewer re-verifications.
6. **Skill/config interference** — C1, C2. 5.5 min plus two burned runs plus a
   permanently opaque branch name on PR #67.
7. **Harness and shell friction** — C15, C18. ~3 min. Real, small, worth one
   template line and no more.

---

## 3. Recommendations

### Quick wins, applicable to the E4/E5 dispatch wave

**Q1. Never comment into a live run.** Before posting any charge, ruling, or
addendum, check `multica issue runs` for a `running` row. If one exists, either
wait for it or cancel and re-dispatch with the amended issue body. Applies:
coordinator practice. Cost: one `runs` call per post. Reversal: none needed.
Prevents C3, C4, and C5's second instance — the entire number-two pattern.

**Q2. Re-authenticate `gh` on the host.** Applies: tooling (operator, one
command). Cost: one minute. Reversal: trivial. Prevents C13 for every future
run in this workspace.

**Q3. Make the gate battery bootstrap itself.** Have `scripts/gates.ts` run the
root frozen install and the `proto/ts` frozen install when `node_modules` is
absent, or add a `gates:preflight` step the seat instructions name. Applies:
tooling. Cost: ~10 lines. Reversal: revert the commit. Prevents C12 —
approximately two minutes per run, forever, and it stops environment noise from
entering review artifacts.

**Q4. Pin the ref in Rev charges and state the head rule.** Every Rev charge
should carry: "review the PR head; if it differs from the ref named here, review
the head, say so, and state whether the difference is material." The seats
already did this unprompted both times; codifying it converts good judgement into
a guarantee. Pair it with a coordinator check that no Eng run is queued or
running before honouring an Eng seat's `@Rev` handoff. Applies: coordinator spec
template + board mechanics. Cost: two sentences. Prevents C5.

**Q5. Name the branch literally, and delete abandoned-run branches.** Write
`agent/eng-cx-pc/DEV-704` in the issue body rather than `agent/<name>/<issue>`,
instruct the seat to rename the harness branch to exactly that, and have the
coordinator delete the branch of any cancelled or blocked run before
re-dispatching. Applies: coordinator spec template + board mechanics. Cost:
one line per dispatch. Prevents C2.

**Q6. Audit the seat skills for named repository authorities.** The `effect`
skill's two file names are now pointer files at `de7236b19`, which fixes the
symptom. Grep the remaining skills for repository paths they require and
either create the pointers or amend the skills. Applies: seat instructions.
Cost: one audit pass. Prevents C1's recurrence in a different skill.

### Standing additions to the executor-spec template (`scratch/dispatch/29` and `30` are the current exemplars)

**T1. An authority-precedence clause — the highest-leverage single change.**
Every spec states its own precedence order (binding record > named program-doc
sections > this spec's decisions) and adds: *where this spec's wording appears to
contradict a binding authority, the authority governs and the executor files a
finding rather than choosing a reading.* Dispatch 29 decision 6 is the proof of
need: labelling a clause "the executor edits none of these" is exactly what
converted an ambiguity into a silent choice and then into 46 minutes of rework
plus two rulings. Applies: coordinator spec template. Cost: three sentences.
Reversal: delete them. Prevents C6, and would have surfaced C9 and C14 as
findings on day one.

**T2. Gates gate their own invocation.** Every gate list line names where the
gate is wired — workflow, battery, or both — and requires the PR to show it
executing at the head. Prevents C8.

**T3. Every gate is derived, not enumerated.** Apply the ratified
generated-not-hand-typed law to gates, not only to vectors: any conformance
assertion is generated from the surface it guards (export map, built `.d.ts`
with byte-diff regeneration), and the required negative control is a **newly
added** surface, never an edit to a listed one. Prevents C11. This one line
would have saved the round now in flight.

**T4. A cross-slice-writes clause.** Any artifact this slice writes outside its
own home is named, with the merge order and the check expected to be red until
the other slice lands. Then the executor never needs to be told mid-charge to
report rather than improvise, and the reviewer verifies a declared condition
rather than rediscovering one. Prevents C7.

**T5. Negative controls declare the component they remove, and its
load-bearingness is a claim.** For each control the spec names the component
dropped and asserts it is load-bearing; the spec then states that *if the
executor or reviewer proves it is not, that proof is the deliverable and the
control is renamed.* That is exactly what happened with `guard_is_redundant` —
make it the template's expected path rather than a round-three surprise.
Prevents C10 from costing a round.

**T6. For laws fixed "in kind", state what counts as proving them.** Two
requirements cover both F2b failures: the shipped function must appear in the
theorem's **conclusion**, and no premise may be discharged by computation over
corpus rows. Add a third for the vectors: at least one row family per law must
use an operation the law is sensitive to, so the family can fail for its own
reason. Prevents C9 — three rounds on one law.

**T7. Shape-check any record before declaring it binding.** Every signature in a
record marked BINDING is checked against the pin before dispatch, by the same
rule the specs impose on executors. DEV-700 shows the check is cheap and that
it finds real defects in ratified prose. Prevents C14.

**T8. New-package hygiene line.** A new package declares its build-output
ignore rule in the same commit that creates it. Prevents C15.

### Seat instructions

**S1.** State the fallback publication path in the seat instructions rather than
letting each run derive it: push over the SSH remote, PR-surface writes through
the connected app, `gh` as fallback only. Removes the reasoning cost of C13 even
before Q2 lands.

**S2.** Consider giving the CX seat a read/search tool. 941 shell invocations,
most of them file reads, is the direct cost of `exec_command`-only access, and it
is also the origin of C18's quoting failures. Lower priority than anything
above, and worth measuring before acting.

---

## 4. What worked — keep doing these three

**W1. Refute-first review with planted violations.** The Rev seat's findings
were not readings of dispositions; they were demonstrations. It typechecked
`retryAbsence` against every fallible surface to prove decision 6's final clause
vacuous (DEV-698 `f0e429ac`). It proved `guard_is_redundant` **in Lean, inside
the package's own axiom allowlist**, against the package unchanged (DEV-695
`16a0d9ba`). It planted a new public export and then widened
`FabricClient.layer` to show the R5 gate was a list rather than a quantifier
(DEV-701). It ran a buffer-less consumer against the bounded-reordering row to
show the row could not fail (DEV-695 round 2). Every one of those is a finding no
gate could have produced, and three of them named a defect the coordinator then
turned into a law or a gate. The reviewer also restored every probe and left the
tree pristine each time, on the record.

**W2. Charges that give the reason for the item, not just the item.** The R5
charge is the model: "ADD THE MISSING GATE (the reason these findings escaped a
green battery)… The battery must be able to catch this class from now on." It
produced a real compile-time assertion file plus a committed negative-control
trace in one round, and its only shortfall was a missing word (T3). Compare the
round-1 F2b charge, which said what to prove and not what would count. Same for
DEV-700's "Effect signatures shape-checked against the pin", which found H-1 in a
ratified record, and DEV-696's "a statement weaker than its spec kind is a
finding even if proved", which is what caught the L0/L1 comparator bridge. The
round-3 charge `7cb08c80` is the compact exemplar: five numbered items, a
recorded spec deviation with a citable comment, and "This should be a short
run." It was — 15.3 minutes.

**W3. A read-only seat that reads as an adopter.** The DevRel seat had no repo
writes, no checklist, and no branch of its own. It produced the two observations
that became the spine's largest repair — the error-channel violation and the
undeclared `@foldlab/core` reach — plus the architecture record's Catalog gap,
all of them missed on round one by a review charge that enumerated the same
decisions. It also bounded its own report honestly ("No Plait TypeScript
artifact has been run by me… CrewAI is index-only") and filed two overclaim
defects against ratified records without proposing to weaken anything. Point a
naive-reader seat at every in-flight branch; it is the cheapest finding
generator in this wave at 10.7 minutes.

Worth recording alongside these: the coordinator caught its own violation
mid-wave. Grill item 19 was ratified and immediately applied to reverse the
coordinator's own P3 charge (`bf89a81a`), paying 5.1 minutes to undo 14.6. The
addition should not have happened, but a program that reverses its own charge
against a ratified law within 22 minutes is working.
