# Checked laws index

This is the repository index for the named law families currently asserted by
the tracer, concierge, entity collector, and effector contracts. `checked`
means the advertised gate executes the cited test; it does not promote an
example to a model proof. `held` means the law remains named but a reported
finding prevents the repository from claiming it.

The root Go gate parses this table, requires the complete family set, and
requires every evidence marker to exist in an executable test file. Adding or
removing a named law without updating its test and this index fails the gate.

| Law | Status | Evidence bound | Executable evidence |
| --- | --- | --- | --- |
| `proto/W1` | checked | Go black-box daemon | `proto/go/protod/conformance_test.go#t.Run("W1 asserted digest` |
| `proto/W2` | checked | Go black-box daemon | `proto/go/protod/conformance_test.go#t.Run("W2 formatting` |
| `proto/W3` | checked | Go black-box daemon | `proto/go/protod/conformance_test.go#t.Run("W3 same bytes` |
| `proto/W4` | checked | Go black-box daemon | `proto/go/protod/conformance_test.go#t.Run("W4 unknown identity` |
| `proto/W5` | checked | Go black-box daemon | `proto/go/protod/conformance_test.go#t.Run("W5 an admit reply` |
| `proto/W6` | checked | Go black-box daemon refold | `proto/go/protod/conformance_test.go#t.Run("W6 the reader recomputes` |
| `proto/W7` | checked | Go black-box daemon | `proto/go/protod/conformance_test.go#t.Run("W7 facts teach` |
| `proto/W8` | checked | Go daemon and TS local refusal | `proto/go/protod/conformance_test.go#t.Run("W8 remaining refusal; proto/ts/test/smoke.test.ts#test("client-local failures are refusal values, marked local (W8)` |
| `proto/W9` | checked | TS source/dependency authority boundary | `proto/ts/test/writ.test.ts#test("W9: the client owns only the three transport verbs` |
| `proto/W10` | checked | Go black-box daemon | `proto/go/protod/conformance_test.go#t.Run("W10 the catalog fact` |
| `concierge/C1` | checked | Go black-box purity | `proto/go/protod/conformance_test.go#t.Run("C1 fill and unfill are byte-pure` |
| `concierge/C2` | checked | TypeScript generated partials only | `proto/ts/test/concierge.test.ts#test("C2 unfill(fill(p, path, subtree), path) equals p over generated partials` |
| `concierge/C3` | checked | Go black-box daemon | `proto/go/protod/conformance_test.go#t.Run("C3 frontier empty means the decided partial creates` |
| `concierge/C4` | checked | Go advertised root examples | `proto/go/protod/conformance_test.go#t.Run("C4 every advertised root fill is accepted` |
| `concierge/C5` | checked | TypeScript generated partials and fixtures only | `proto/ts/test/concierge.test.ts#test("C5 holes never bear identity or enter catalog fixtures` |
| `entity/EC1` | checked | TypeScript property suite | `packages/core/test/entity.test.ts#test("EC1: collector over the mixed stream` |
| `entity/EC2` | checked | TypeScript two-backing example | `packages/core/test/entity.test.ts#test("EC2: two backing layers` |
| `entity/EC3` | checked | TypeScript property suite | `packages/core/test/entity.test.ts#test("EC3: incremental ingestion equals batch recomputation` |
| `entity/EC4` | checked | TypeScript property suite | `packages/core/test/entity.test.ts#test("EC4: composition is deterministic` |
| `effector/EL0` | checked | Go embedded-NATS examples | `go/effector/effector_test.go#func TestOpenPinsBucketShape; go/effector/effector_test.go#func TestOpenRefusesWrongShape; go/effector/effector_test.go#func TestOpenAcceptsConformantVariant` |
| `effector/EL1` | checked | Go embedded-NATS example | `go/effector/effector_test.go#func TestClaimIsExclusive` |
| `effector/EL2` | checked | Go embedded-NATS concurrent example | `go/effector/effector_test.go#func TestConcurrentDoCommitsOnce` |
| `effector/EL3` | checked | Go embedded-NATS examples | `go/effector/effector_test.go#func TestStolenClaimCannotCommit; go/effector/effector_test.go#func TestExpiredButUnsupersededClaimStillCommits` |
| `effector/EL4` | checked | Go embedded-NATS example | `go/effector/effector_test.go#func TestCommittedWorkIsNotRerun` |
| `effector/EL5` | checked | Go embedded-NATS examples | `go/effector/effector_test.go#func TestLapsedClaimIsRecoverable; go/effector/effector_test.go#func TestFailedEffectCommitsNothing` |
| `effector/EL6` | checked | Go bounded adversarial schedule | `go/effector/effector_test.go#func TestAdversarialCrashSchedule` |
| `effector/EL7` | checked | Go embedded-NATS example | `go/effector/effector_test.go#func TestCommitIdempotence` |
| `effector/EL8` | checked | Go two-binding example | `go/effector/effector_test.go#func TestStateIsInTheBucketNotTheProcess` |
| `effector/EL9` | checked | Go canonical-wire example | `go/effector/effector_test.go#func TestWireValuesAreCanonical` |
| `effector/EL10` | checked | Go foreign-outcome example | `go/effector/effector_test.go#func TestCommitRefusesToOverwriteAForeignOutcome` |
| `effector/WL1` | held (#15) | Retention race can lose a transition | `go/effector/watch_test.go#func TestWatchObservesClaimThenCommit` |
| `effector/WL2` | held (#15) | Retention race can lose a steal-chain transition | `go/effector/watch_test.go#func TestWatchObservesStealChain` |
| `effector/WL3` | checked | Go late-watcher example | `go/effector/watch_test.go#func TestLateWatcherCatchesUp` |
| `effector/WL4` | checked | Go context/authority example | `go/effector/watch_test.go#func TestWatchEndsWithContextRegisterRemains` |

The effector rows index the shipped EL/WL executable contract only. The
historical R3/R4 theorem artifacts are not in this repository; that formal
claim remains held by ticket 013. WL1 and WL2 additionally remain held pending
the issue #15 retention-contract disposition.
