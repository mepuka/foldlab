# The laws index

Every law ID cited anywhere in this repository, the file that STATES it, and
the test that ENFORCES it — or `—`, honestly, when nothing does.

This file exists because of a specific failure mode. `proto/AGENTS.md` opens
its law list with "each is a test"; `proto/SPEC.md` heads its own with "each
one is a test somewhere". For most laws that is true. For some it is a
sentence in a comment above a test that checks something adjacent, and for a
few it is not true at all. The distinction is invisible from either end: a
reader of the law list cannot tell which laws are load-bearing, and a reader
of the test file cannot tell that deleting a line of prose retires a ratified
law. **Rewrite the comment and the law is gone**, silently, with every gate
still green.

`scripts/check-laws.ts` reads the tables below and checks them against the
tree. It is a gate: it exits nonzero when the index and reality disagree in
either direction — a row pointing at a file that no longer names the law, and
an ID named in a test file that no row claims. Adding a law without indexing
it fails. Removing the test that binds a law fails. Writing the missing test
for a law recorded here as `—` ALSO fails, because the row is then a lie about
the state of the evidence; upgrade the row in the same commit.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `BOUND` | The named test exists AND the law ID appears as a standalone token within 30 lines of it — in the test's name (`t.Run("W1 …")`, `test("EC1: …")`), its comment, or its refusal message. Deleting the test, renaming it, or removing the ID all break the index, so the binding is checkable. Proximity is the point: an ID sitting elsewhere in a 700-line test file is not a binding, and the checker will not accept it as one. |
| `UNBOUND` | A test covers the law's behaviour, but nothing in the test names the law. The coverage is real; the CORRESPONDENCE is a human judgement recorded here and nowhere else. Every `UNBOUND` row is a cheap upgrade: put the ID in the test name. |
| `—` | No test. The law is a sentence. Each one is a finding. |

Scope: LAWS only. Decision registries (`D<n>`, per `proto/DECISIONS.md`),
verification rungs (`R0`–`R5`), and sweep item numbers (`A<n>`) are not laws
and are not indexed here. The generated fold laws are outside the ID scheme
entirely — see the last section.

## W1–W10 — the tracer bullet's wire laws

Statement: `proto/SPEC.md`, under "Laws (each one is a test somewhere)".

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `W1` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W1 asserted digest the daemon cannot re-derive refuses with both values` | BOUND |
| `W2` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W2 formatting never moves identity or refuses` | BOUND |
| `W3` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W3 same bytes converge, never error` | BOUND |
| `W4` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W4 unknown identity never enters a journal` | BOUND |
| `W5` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W5 an admit reply means durably appended and readable` | BOUND |
| `W6` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W6 the reader recomputes the head the reply claims` | BOUND |
| `W7` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W7 facts teach: every ok reply carries next hints` | BOUND |
| `W8` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W8 remaining refusal kinds arrive as data`; `proto/ts/test/smoke.test.ts::client-local failures are refusal values, marked local (W8)` | BOUND |
| `W9` | `proto/SPEC.md` | — | — |
| `W10` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W10 the catalog fact is scheme-tagged` | BOUND |

`W9` — "the writ is three verbs; the client implements no authority protocol
(no CAS, no fencing)" — has no test. The conformance suite's own header says
so: it covers "W1–W8 (plus W10)". The single `W9` string in that file is a
parenthetical on `unknown-request`, which tests that an unhandled subject
still answers with data — a different claim. W9 is a NEGATIVE law (the client
must not grow an authority protocol), and negative laws want a structural
check, not a behavioural one: an import/AST assertion that the client package
never reaches for CAS or fencing, in the shape of `go/substrate/assumptions_test.go`.

## C1–C5 — the concierge laws

Statement: `proto/AGENTS.md` — as the compressed range `C1-C5`, not five
sentences. C2, C3, and C4 are not individually stated in any contract file;
their only prose lives in test names and in `docs/research/`. That is the
same defect this index exists to expose, so the statement cell records the
range literally rather than pretending each ID has a home.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `C1` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C1 fill and unfill are byte-pure`; `proto/ts/test/concierge.test.ts::C1 fill is pure: the same request returns byte-identical data` | BOUND |
| `C2` | `proto/AGENTS.md#C1-C5` | `proto/ts/test/concierge.test.ts::C2 unfill(fill(p, path, subtree), path) equals p over generated partials` | BOUND |
| `C3` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C3 frontier empty means the decided partial creates`; `proto/ts/test/concierge.test.ts::C3 frontier-empty iff zero holes iff type.create accepts` | BOUND |
| `C4` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C4 every advertised root fill is accepted`; `proto/ts/test/concierge.test.ts::C4 generated reachable partials have no dead ends and every frontier example is accepted` | BOUND |
| `C5` | `proto/AGENTS.md#C1-C5` | `proto/ts/test/concierge.test.ts::C5 holes never bear identity or enter catalog fixtures` | BOUND |

C2 and C5 are TS-island-only: the Go daemon carries C5's refusal sentence in
`proto/go/protod/walk.go` but no Go test names it. Cross-language law coverage
is asymmetric and the index is where that shows.

**ID COLLISION.** `C1` denotes two unrelated laws. Concierge `C1` is
"fill and unfill are byte-pure". Entity `C1` is "entity meaning-fold
totality" (`packages/core/test/entity.test.ts`, the describe wrapping the
EC-laws). Same token, two meanings, both live — the `D<n>` registry collision
recorded as A1 of #33, in the law namespace. The index treats the entity one
as `entity-C1` below so the checker can tell them apart; the real fix is a
namespace prefix in both sources.

## EC1–EC4 — entity composition laws

Statement: `packages/core/test/entity.test.ts` header — a comment. There is no
contract file that states these. `packages/core/src/entity.ts` restates EC4.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `EC1` | `packages/core/test/entity.test.ts` | `packages/core/test/entity.test.ts::EC1: collector over the mixed stream = folds of each entity's subsequence` | BOUND |
| `EC2` | `packages/core/test/entity.test.ts` | `packages/core/test/entity.test.ts::EC2: two backing layers, identical anchors` | BOUND |
| `EC3` | `packages/core/test/entity.test.ts` | `packages/core/test/entity.test.ts::EC3: incremental ingestion equals batch recomputation` | BOUND |
| `EC4` | `packages/core/test/entity.test.ts` | `packages/core/test/entity.test.ts::EC4: composition is deterministic, order-sensitive, and child-history-sensitive` | BOUND |
| `entity-C1` | `packages/core/test/entity.test.ts#(C1)` | `packages/core/test/entity.test.ts::anchors() is total over arbitrary byte payloads` | UNBOUND |

Statement and enforcement are THE SAME FILE for every row here. A law whose
only statement is inside the test that checks it cannot be violated by the
test — it can only be deleted with it. EC1–EC4 are cited as ratified in
`NEXT.md` and in the workflow-engine design; neither can survive an edit to a
comment block in a test file.

## EL0–EL10 — the effector register laws

Statement: `go/effector/effector_test.go` header, lines 5–17 — a comment
table mapping each ID to its test function. Load-bearing and unusually good:
the mapping is explicit, so this index only has to keep it honest.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `EL0` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestOpenPinsBucketShape` | BOUND |
| `EL1` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestClaimIsExclusive` | BOUND |
| `EL2` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestConcurrentDoCommitsOnce` | BOUND |
| `EL3` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestStolenClaimCannotCommit` | BOUND |
| `EL4` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestCommittedWorkIsNotRerun` | BOUND |
| `EL5` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestLapsedClaimIsRecoverable` | BOUND |
| `EL6` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestAdversarialCrashSchedule` | BOUND |
| `EL7` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestCommitIdempotence` | BOUND |
| `EL8` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestStateIsInTheBucketNotTheProcess` | BOUND |
| `EL9` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestWireValuesAreCanonical` | BOUND |
| `EL10` | `go/effector/effector_test.go` | `go/effector/effector_test.go::func TestCommitRefusesToOverwriteAForeignOutcome` | BOUND |

The statement is still only a comment, and `go/cmd/lineartrace/main.go` amends
live law against it (`Law: "EL3 fencing (safety, not clock)"`). The protocol
these eleven laws describe — the "A6 register protocol" cited as proven at
`go/AGENTS.md`, `NEXT.md`, and ticket 019 — has no text in this repository
(#33 A4). These eleven test functions ARE the spec. That is the honest status.

## WL1–WL4 — the register watch laws

Statement: `go/effector/watch_test.go` header, lines 5–8 — a comment.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `WL1` | `go/effector/watch_test.go` | `go/effector/watch_test.go::WL1` | BOUND |
| `WL2` | `go/effector/watch_test.go` | `go/effector/watch_test.go::WL2` | BOUND |
| `WL3` | `go/effector/watch_test.go` | `go/effector/watch_test.go::WL3` | BOUND |
| `WL4` | `go/effector/watch_test.go` | `go/effector/watch_test.go::WL4` | BOUND |

The binding here is section comments above test functions, not test names —
weaker than EL's explicit table. `go/CONTEXT.md` cites `WL1–WL4` as the live
plane's laws; ticket 019 cites WL2 and WL4 while proposing to replace the
substrate underneath them.

## GV1–GV9 — the G1 crash-storm verifier laws

Statement: `docs/gauntlet/G1-crash-storm.md`, "Verifier laws (GV1–GV9)".
Implementation: `go/gauntlet/verify.go` (error classes carry the IDs).
Enforcement in `go/gauntlet/verify_test.go` is by BEHAVIOUR: not one test
names a GV law.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `GV1` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestTamperedJournalRefused` | UNBOUND |
| `GV2` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestTamperedJournalRefused` | UNBOUND |
| `GV3` | `docs/gauntlet/G1-crash-storm.md` | — | — |
| `GV4` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestFencingViolationRefused` | UNBOUND |
| `GV5` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestDishonestDupCountRefused` | UNBOUND |
| `GV6` | `docs/gauntlet/G1-crash-storm.md` | — | — |
| `GV7` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestWrongCounterfactualRefused` | UNBOUND |
| `GV8` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestFloorsRefused`; `go/gauntlet/verify_test.go::func TestG1FloorsArePinned` | UNBOUND |
| `GV9` | `docs/gauntlet/G1-crash-storm.md` | — | — |

`GV1` and `GV2` share one test, which accepts EITHER `ErrChain` or
`ErrSemantics` — so neither law has a control that fires on it alone, and the
two cannot be shown independent. `GV3` (registers strictly digest-sorted, in
bijection), `GV6` (replay digest equality), and `GV9` (manifests canonical)
have no negative control at all: implemented, never refuted. `GV9` is further
adrift — `ErrManifest` in `verify.go` is the only error class in that file
that carries no law ID.

## RL1–RL7 — the R1 variant-loop verifier laws

Statement: `docs/gauntlet/R1-variant-loop-real.md`, "Laws (RL1–RL7)".
Implementation: `go/gauntlet/real.go`.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `RL1` | `docs/gauntlet/R1-variant-loop-real.md` | — | — |
| `RL2` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealDoubleBuyRefused`; `go/gauntlet/real_test.go::func TestRealBrokenWiringRefused` | UNBOUND |
| `RL3` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealCapBreachRefused` | UNBOUND |
| `RL4` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealReuseFloorRefused`; `go/gauntlet/real_test.go::func TestRealValidBundlePasses` | UNBOUND |
| `RL5` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealMissingKillRefused` | UNBOUND |
| `RL6` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealCapBreachRefused` | UNBOUND |
| `RL7` | `docs/gauntlet/R1-variant-loop-real.md` | — | — |

`RL1` (chain + canonical bytes) has no dedicated control in the R1 lane — the
one-line law "as always" inherits its confidence from other lanes' tests, not
from its own. `RL7` is a scope boundary ("the verifier proves record
consistency and nothing about output quality") and is not mechanically
checkable; it is listed so that nobody mistakes its absence for an oversight.
`RL2` is the law #37 G-02 shows is producer-controllable: the reuse factor is
arithmetic on a producer-chosen `k`, and `TestRealReuseFloorRefused` tests the
FLOOR comparison, not the honesty of the input.

## TV1–TV8 — the RG-A transposition verifier laws

Statement: `docs/gauntlet/RG-A-transposition.md`, "Verifier laws (TV1–TV8)".
Implementation: `go/gauntlet/transposition.go`. This is the strongest lane in
the repository (#37 calls it the template) and it is also the only verifier
lane with any law-named tests at all.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `TV1` | `docs/gauntlet/RG-A-transposition.md` | — | — |
| `TV2` | `docs/gauntlet/RG-A-transposition.md` | — | — |
| `TV3` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTranspositionMissingStateRefused` | BOUND |
| `TV4` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTranspositionFrontierViolationRefused` | BOUND |
| `TV5` | `docs/gauntlet/RG-A-transposition.md` | — | — |
| `TV6` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTranspositionSurplusExpansionRefused` | BOUND |
| `TV7` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTranspositionHeroWorkerRefused` | UNBOUND |
| `TV8` | `docs/gauntlet/RG-A-transposition.md` | — | — |

## CL1–CL5 — the R2 climb verifier laws

Statement: `docs/gauntlet/R2-verified-climb.md`, "Laws (RL1–RL7 inherited;
CL1–CL5 new)". Implementation: `go/gauntlet/climb.go`.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `CL1` | `docs/gauntlet/R2-verified-climb.md` | `go/gauntlet/climb_test.go::func TestClimbOutputTamperRefused` | BOUND |
| `CL2` | `docs/gauntlet/R2-verified-climb.md` | `go/gauntlet/climb_test.go::func TestClimbSelectionTamperRefused` | BOUND |
| `CL3` | `docs/gauntlet/R2-verified-climb.md` | `go/gauntlet/climb_test.go::func TestClimbHoldoutBeforeSelectionRefused` | BOUND |
| `CL4` | `docs/gauntlet/R2-verified-climb.md` | `go/gauntlet/climb_test.go::func TestClimbMissingLineageRefused` | BOUND |
| `CL5` | `docs/gauntlet/R2-verified-climb.md` | `go/gauntlet/climb_test.go::func TestClimbSingleWorkerRefused` | BOUND |

Best-bound family outside `EL`. Note what the binding does NOT buy: #37 G-01
shows the R2 corpus pin is self-referential, so all five CL laws can hold on a
bundle whose corpus is fabricated. A bound law is checkable, not sufficient.

## SL1 — the demo server's chain law

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `SL1` | `packages/server/src/server.ts` | — | — |

"The chain remembers what the fold forgives" — stated twice in the demo
server, once as a comment and once as a JSON field served to callers. No test.
It is the only law in the repository that is published to a client and checked
by nobody.

## Families outside the ID scheme

- **The generated fold laws** (`packages/core/test/fold.laws.test.ts`) carry
  no IDs by design: they are generated per declared algebra from the claims
  the declaration makes, and the suite ships its own refutations (a
  last-write-wins register claiming commutativity, addition claiming
  idempotence). This is the shape every family above should aspire to — the
  law and its test are one object, so they cannot drift. Nothing to index.
- **The substrate assumptions** (`go/substrate/assumptions_test.go`) are
  executable assumptions with an admin-success negative control and an AST
  call-site walk. Also unindexed, also nothing to drift.
- **`R0`–`R5`** are verification RUNGS (`docs/map/tickets/009`), recorded in
  `VERIFICATION.md`, not laws.
- **`D<n>`** are decisions. Four live registries collide (#33 A1); that is a
  namespacing debt, not a law debt.
- **`W1`–`W5` in `verify/catalog/`** are the TLA+ SPEC laws of the catalog
  model, which are NOT the same W-laws as `proto/SPEC.md`'s. A second
  collision, and the reason `scripts/check-laws.ts` scopes its reverse scan to
  test files rather than the whole tree.
