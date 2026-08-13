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
| `DESIGN` | A scope or honesty boundary, not a mechanically refutable behaviour. It is indexed so absence is explicit, but manufacturing a mutant would pretend the verifier proves something the law says it does not. |
| `—` | No test. The law is a sentence. Each one is a finding. |

Scope: LAWS only. Decision registries (`D<n>`, per `proto/DECISIONS.md`),
verification rungs (`R0`–`R5`), and sweep item numbers (`A<n>`) are not laws
and are not indexed here. The generated fold laws are outside the ID scheme
entirely — see the last section.

## proto-wire:W1–W10 — the tracer bullet's wire laws

Statement: `proto/SPEC.md`, under "Laws (each one is a test somewhere)".

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `proto-wire:W1` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W1 asserted digest the daemon cannot re-derive refuses with both values` | BOUND |
| `proto-wire:W2` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W2 formatting never moves identity or refuses` | BOUND |
| `proto-wire:W3` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W3 same bytes converge, never error` | BOUND |
| `proto-wire:W4` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W4 unknown identity never enters a journal` | BOUND |
| `proto-wire:W5` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W5 an admit reply means durably appended and readable` | BOUND |
| `proto-wire:W6` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W6 the reader recomputes the head the reply claims` | BOUND |
| `proto-wire:W7` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W7 facts teach: every ok reply carries next hints` | BOUND |
| `proto-wire:W8` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W8 remaining refusal kinds arrive as data`; `proto/ts/test/smoke.test.ts::client-local failures are refusal values, marked local (W8)` | BOUND |
| `proto-wire:W9` | `proto/SPEC.md` | — | — |
| `proto-wire:W10` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W10 the catalog fact is scheme-tagged` | BOUND |

`proto-wire:W9` — "the writ is three verbs; the client implements no authority protocol
(no CAS, no fencing)" — has no test. The conformance suite's own header says
so: it covers "W1–W8 (plus W10)". The single `W9` string in that file is a
parenthetical on `unknown-request`, which tests that an unhandled subject
still answers with data — a different claim. W9 is a NEGATIVE law (the client
must not grow an authority protocol), and negative laws want a structural
check, not a behavioural one: an import/AST assertion that the client package
never reaches for CAS or fencing, in the shape of `go/substrate/assumptions_test.go`.

## catalog-model:W1–W5 — the catalog model's local law names

`verify/catalog/Catalog.tla` reuses W1–W5 as source-local identifiers. The
registry qualifies them because an unadorned `W3` citation otherwise cannot
say whether it means the public wire contract or this model abstraction. The
frozen TLA module is not renamed here: `catalog-model:*` is an index alias.
W2 and W5 deliberately collapse in the abstraction and are not claimed;
their `DESIGN` status records that boundary rather than inventing a control.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `catalog-model:W1` | `verify/catalog/Catalog.tla#W1 no asserted identity` | `verify/catalog/run.sh::expect_violation CatalogBroken.assert` | BOUND |
| `catalog-model:W2` | `verify/catalog/Catalog.tla#W2 (canonicalization)` | — | DESIGN |
| `catalog-model:W3` | `verify/catalog/Catalog.tla#W3 create converges` | `verify/catalog/run.sh::expect_clean  Catalog.cap2` | UNBOUND |
| `catalog-model:W4` | `verify/catalog/Catalog.tla#W4 create before publish` | `verify/catalog/run.sh::expect_violation CatalogBroken        ` | BOUND |
| `catalog-model:W5` | `verify/catalog/Catalog.tla#W5 (read-your-admissions)` | — | DESIGN |

## concierge:C1–C5 — the concierge laws

Statement: `proto/AGENTS.md` — as the compressed range `C1-C5`, not five
sentences. C2, C3, and C4 are not individually stated in any contract file;
their only prose lives in test names and in `docs/research/`. That is the
same defect this index exists to expose, so the statement cell records the
range literally rather than pretending each ID has a home.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `concierge:C1` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C1 fill and unfill are byte-pure`; `proto/ts/test/concierge.test.ts::C1 fill is pure: the same request returns byte-identical data` | BOUND |
| `concierge:C2` | `proto/AGENTS.md#C1-C5` | `proto/ts/test/concierge.test.ts::C2 unfill(fill(p, path, subtree), path) equals p over generated partials` | BOUND |
| `concierge:C3` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C3 frontier empty means the decided partial creates`; `proto/ts/test/concierge.test.ts::C3 frontier-empty iff zero holes iff type.create accepts` | BOUND |
| `concierge:C4` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C4 every advertised root fill is accepted`; `proto/ts/test/concierge.test.ts::C4 generated reachable partials have no dead ends and every frontier example is accepted` | BOUND |
| `concierge:C5` | `proto/AGENTS.md#C1-C5` | `proto/ts/test/concierge.test.ts::C5 holes never bear identity or enter catalog fixtures` | BOUND |

C2 and C5 are TS-island-only: the Go daemon carries C5's refusal sentence in
`proto/go/protod/walk.go` but no Go test names it. Cross-language law coverage
is asymmetric and the index is where that shows.

**Registry resolution.** Source-local `C1` denotes two unrelated laws. `concierge:C1` is
"fill and unfill are byte-pure". Entity `C1` is "entity meaning-fold
totality" (`packages/core/test/entity.test.ts`, the describe wrapping the
EC-laws). `entity:C1` names the latter in this registry. These are aliases;
renaming the source-local tokens in coordinator-owned contracts remains a
ratification boundary.

## EC1–EC4 — entity composition laws

Statement: `packages/core/test/entity.test.ts` header — a comment. There is no
contract file that states these. `packages/core/src/entity.ts` restates EC4.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `EC1` | `packages/core/test/entity.test.ts` | `packages/core/test/entity.test.ts::EC1: collector over the mixed stream = folds of each entity's subsequence` | BOUND |
| `EC2` | `packages/core/test/entity.test.ts` | `packages/core/test/entity.test.ts::EC2: two backing layers, identical anchors` | BOUND |
| `EC3` | `packages/core/test/entity.test.ts` | `packages/core/test/entity.test.ts::EC3: incremental ingestion equals batch recomputation` | BOUND |
| `EC4` | `packages/core/test/entity.test.ts` | `packages/core/test/entity.test.ts::EC4: composition is deterministic, order-sensitive, and child-history-sensitive` | BOUND |
| `entity:C1` | `packages/core/test/entity.test.ts#(C1)` | `packages/core/test/entity.test.ts::anchors() is total over arbitrary byte payloads` | BOUND |

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
| `GV1` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestGV1BrokenChainRefused` | BOUND |
| `GV2` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestGV2WrongSemanticsRefusedWithValidChain` | BOUND |
| `GV3` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestGV3UnsortedRegistersRefused` | BOUND |
| `GV4` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestFencingViolationRefused` | UNBOUND |
| `GV5` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestDishonestDupCountRefused` | UNBOUND |
| `GV6` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestGV6WrongReplayDigestRefused` | BOUND |
| `GV7` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestWrongCounterfactualRefused` | UNBOUND |
| `GV8` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestFloorsRefused`; `go/gauntlet/verify_test.go::func TestG1FloorsArePinned` | UNBOUND |
| `GV9` | `docs/gauntlet/G1-crash-storm.md` | `go/gauntlet/verify_test.go::func TestGV9NonCanonicalManifestRefused` | BOUND |

`GV1` and `GV2` now have independent controls: GV1 separately breaks outer
canonical bytes and position, while GV2 changes a payload and rebuilds the
entire outer chain before calling `Verify`. GV3, GV6, and GV9 each mutate one public artifact;
GV9's G1-specific manifest sentinel wraps the shared `ErrManifest`, retaining
API compatibility while naming the law that refused.

## RL1–RL7 — the R1 variant-loop verifier laws

Statement: `docs/gauntlet/R1-variant-loop-real.md`, "Laws (RL1–RL7)".
Implementation: `go/gauntlet/real.go`.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `RL1` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRL1NonCanonicalJournalRefused` | BOUND |
| `RL2` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealDoubleBuyRefused`; `go/gauntlet/real_test.go::func TestRealBrokenWiringRefused` | UNBOUND |
| `RL3` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealCapBreachRefused` | UNBOUND |
| `RL4` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealReuseFloorRefused`; `go/gauntlet/real_test.go::func TestRealValidBundlePasses` | UNBOUND |
| `RL5` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealMissingKillRefused` | UNBOUND |
| `RL6` | `docs/gauntlet/R1-variant-loop-real.md` | `go/gauntlet/real_test.go::func TestRealCapBreachRefused` | UNBOUND |
| `RL7` | `docs/gauntlet/R1-variant-loop-real.md` | — | DESIGN |

`RL1` now has its own R1 public-seam control with two subcontrols: parseable
JSON that loses canonical byte form, and canonical bytes with a wrong previous
head. `VerifyReal` refuses both on the chain class. `RL7` is a scope boundary ("the verifier proves record
consistency and nothing about output quality"), explicitly `DESIGN` rather
than an unenforced behaviour; adding a mutant would invent the very quality
claim it excludes.
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
| `TV1` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTV1NonCanonicalJournalRefused` | BOUND |
| `TV2` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTV2WrongSemanticsRefusedWithValidChain` | BOUND |
| `TV3` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTranspositionMissingStateRefused` | BOUND |
| `TV4` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTranspositionFrontierViolationRefused` | BOUND |
| `TV5` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTV5ZeroFenceRefused` | BOUND |
| `TV6` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTranspositionSurplusExpansionRefused` | BOUND |
| `TV7` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTranspositionHeroWorkerRefused` | UNBOUND |
| `TV8` | `docs/gauntlet/RG-A-transposition.md` | `go/gauntlet/transposition_test.go::func TestTV8WrongReplayDigestRefused` | BOUND |

TV1 mirrors RL1's two independent byte/link subcontrols. TV2 rebuilds a valid
outer chain around a wrong derived result; TV5 keeps the register set intact
and changes only one fence; TV8 changes only the canonical manifest's claimed
state digest.

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

## SL1 and SL4 — the demo server's public laws

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `SL1` | `packages/server/src/server.ts` | `packages/server/test/health.surface.test.ts::test("SL1: the machine probe is plain while the browser demos retain their laws"` | BOUND |
| `SL4` | `packages/server/src/server.ts` | `packages/server/test/health.surface.test.ts::test("SL1: the machine probe is plain while the browser demos retain their laws"` | BOUND |

"The chain remembers what the fold forgives" — stated in the demo server and
served as a JSON field. The in-process HTTP test now binds that exact value at
the public route while independently requiring unequal chain heads and equal
fold-state digests through the response produced by the core operations.
The same route test binds SL4's exact served fork-law string; this closes the
adjacent base drift where the checker saw SL4 but the index omitted it.

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
- **Source-local `W1`–`W5` in `verify/catalog/`** are registered as
  `catalog-model:W1`–`catalog-model:W5`; the tracer bullet's are
  `proto-wire:W1`–`proto-wire:W5`. Likewise source-local `C1` is registered as
  `concierge:C1` or `entity:C1`. The aliases remove ambiguous citations
  without editing frozen authority; an actual source-ID rename requires
  coordinator ratification.
