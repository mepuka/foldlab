# The kernel act language: generated reference

Generated from `sample-kernel-conformance.ndjson` (schema v1, source `verify/kernel`).
Do not edit: regenerate. Every row below is a fact the Lean model emitted about itself.

## Declaration kinds

Every identifier in the language is the content address of a declaration of one of these 12 kinds. A digest of one kind never compares with a digest of another.

| Rank | Kind |
|---|---|
| 0 | `schema` |
| 1 | `program` |
| 2 | `policy` |
| 3 | `capability` |
| 4 | `lane` |
| 5 | `algebra` |
| 6 | `index` |
| 7 | `resource` |
| 8 | `ontology` |
| 9 | `schedule` |
| 10 | `template` |
| 11 | `language` |

## Hole stages

A hole is a declared parameter of a program. Its stage rises and never falls; a production may observe a stage only in the reached-at-least direction.

| Rank | Stage |
|---|---|
| 0 | `opened` |
| 1 | `filled` |
| 2 | `disputed` |
| 3 | `decided` |
| 4 | `sealed` |

## Refusals

The door is the one place a candidate act becomes a lawful act. It never refuses without naming the law it defends and teaching a legal next move. 16 reasons; 4 of the repairs are machine-applicable, meaning the lawful rewrite is a function of the refused candidate alone and an agent may apply it with no new information.

### `clock-read`

**Law.** the fold carrier has no clock parameter (f11_query_deterministic)

**Repair.** emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value

**Applicability.** advisory

### `absence-trigger`

**Law.** the trigger grammar is closed at five monotone productions (f10_stability)

**Repair.** route acting-on-silence through the deadline seat: a fenced decide fed by tick facts

**Applicability.** advisory

### `unfenced-decide`

**Law.** only a fenced token commits (at_most_one_landed_commit)

**Repair.** hold the register's token and commit with it; grant and renew are runtime liveness, not grammar

**Applicability.** advisory

### `last-writer-wins`

**Law.** cells merge by join under a declared ACI algebra (f1_cell_merge_aci)

**Repair.** declare the merge algebra; idempotent join leaves nothing for arrival order to choose

**Applicability.** machine-applicable

### `unverified-read`

**Law.** a decode re-derives the digest of what it fetched (verify-on-read)

**Repair.** resolve and let the door re-derive; absence is retryable, a mismatch is structural

**Applicability.** machine-applicable

### `cross-sort-identifier`

**Law.** tokens are per-register and positions are per-partition; sorts never compare across spaces

**Repair.** compare a token only within its register and a position only within its partition

**Applicability.** advisory

### `minted-identifier`

**Law.** every identifier is a digest of a declaration or a derivation from one

**Repair.** declare the value and use its digest; nothing mints a name

**Applicability.** advisory

### `ambient-query-input`

**Law.** a derived read is a function of support and query alone (f11_topk_of_support)

**Repair.** read state through a fold at an anchor, and put any seed inside the declared query value

**Applicability.** advisory

### `forward-reference`

**Law.** pins name already-admitted digests (c7_pin_well_founded)

**Repair.** declare the referent first; the reference graph is a DAG by admission order

**Applicability.** advisory

### `secret-carrier`

**Law.** the wire grammar admits no secret position

**Repair.** carry credentials in the environmental band as redacted configuration, outside meaning

**Applicability.** advisory

### `absence-claim`

**Law.** a local view is a lattice lower bound (cell_absorb_inflationary)

**Repair.** claim at-least from a replica, never not-present-anywhere

**Applicability.** advisory

### `past-mutation`

**Law.** journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)

**Repair.** declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon

**Applicability.** machine-applicable

### `off-writ-referent`

**Law.** a declaration's identifiers lie inside the universe its writ pins

**Repair.** spawn under a writ that pins the referent, or request the referent into the pinned universe

**Applicability.** advisory

### `closure-introspection`

**Law.** a program's identity is its declaration, never its closure bytes

**Repair.** reference computation by digest: declare the fold and pin its digest

**Applicability.** advisory

### `anchored-resolve`

**Law.** a digest names one value forever, so no anchor can change a resolve

**Repair.** drop the anchor; read head-relative state through a fold at an anchor

**Applicability.** machine-applicable

### `unfilled-hole`

**Law.** only closed programs execute; a hole is a declared parameter, not a wildcard

**Repair.** fill every declared hole; disjoint fills commute, so fill order is free

**Applicability.** advisory

## Machine-applicable repair catalog

These are the codemods. Each is driven by the door's refusal output alone.

| Reason | Repair |
|---|---|
| `last-writer-wins` | declare the merge algebra; idempotent join leaves nothing for arrival order to choose |
| `unverified-read` | resolve and let the door re-derive; absence is retryable, a mismatch is structural |
| `past-mutation` | declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon |
| `anchored-resolve` | drop the anchor; read head-relative state through a fold at an anchor |

## Types

The closed type list, in the model's declaration order. A parameter marked *brand* is part of the type's identity: two values whose brands differ do not compare.

### `DeclKind`

*inductive*

- `schema` — _no fields_
- `program` — _no fields_
- `policy` — _no fields_
- `capability` — _no fields_
- `lane` — _no fields_
- `algebra` — _no fields_
- `index` — _no fields_
- `resource` — _no fields_
- `ontology` — _no fields_
- `schedule` — _no fields_
- `template` — _no fields_
- `language` — _no fields_

### `Digest` \[kind: *brand*\]

*structure*

- `mk` — id: `Nat`

### `Value`

*structure*

- `mk` — bytes: `Nat`

### `StateLabel`

*structure*

- `mk` — value: `Nat`

### `Petname`

*structure*

- `mk` — text: `String`

### `Token` \[register: *brand*\]

*structure*

- `mk` — value: `Nat`

### `LanePartition`

*structure*

- `mk` — lane: `Digest(lane)`, shard: `Nat`

### `Position` \[partition: *brand*\]

*structure*

- `mk` — value: `Nat`

### `AnchorFact` \[declared: *brand*, partition: *brand*\]

*structure*

- `mk` — floor: `Position(partition)`, state: `StateLabel`, head: `Position(partition)`

### `HoleStage`

*inductive*

- `opened` — _no fields_
- `filled` — _no fields_
- `disputed` — _no fields_
- `decided` — _no fields_
- `sealed` — _no fields_

### `KTriggerPredicate`

*inductive*

- `evidenceAppears` — lane: `Digest(lane)`, pattern: `Value`
- `cellReaches` — cell: `Digest(resource)`, threshold: `Value`
- `holeReaches` — hole: `Nat`, target: `HoleStage`
- `outcomeLanded` — register: `Digest(program)`
- `headAdvancedPast` — partition: `LanePartition`, position: `Position(partition)`

### `Act`

*inductive*

- `declare` — kind: `DeclKind`, value: `Value`, writ: `Digest(policy)`
- `resolve` — kind: `DeclKind`, target: `Digest(kind)`
- `emit` — lane: `Digest(lane)`, body: `Value`
- `join` — cell: `Digest(resource)`, contribution: `Value`
- `fold` — declared: `Digest(index)`, partition: `LanePartition`, anchor: `AnchorFact(declared,partition)`, query: `Value`
- `decide` — register: `Digest(program)`, token: `Token(register)`, outcome: `Value`
- `trigger` — predicate: `KTriggerPredicate`, declaration: `Digest(program)`
- `spawn` — parent: `Digest(policy)`, request: `Digest(policy)`

### `RawArg`

*inductive*

- `digestRef` — kind: `DeclKind`, id: `Nat`
- `literal` — value: `Nat`
- `hole` — name: `Nat`
- `clockNow` — _no fields_
- `randomSeed` — _no fields_
- `secretBytes` — bytes: `Nat`
- `mintedId` — token: `Nat`
- `functionValue` — code: `Nat`

### `CandidateAnchor`

*structure*

- `mk` — foldId: `Nat`, lane: `Nat`, shard: `Nat`, floor: `Nat`, state: `Nat`, head: `Nat`

### `TokenClaim`

*structure*

- `mk` — register: `Nat`, value: `Nat`

### `MergeStrategy`

*inductive*

- `declaredAlgebra` — algebra: `Nat`
- `lastWriterWins` — _no fields_

### `CandidatePredicate`

*inductive*

- `evidenceAppears` — lane: `Nat`, pattern: `Nat`
- `cellReaches` — cell: `Nat`, threshold: `Nat`
- `holeReaches` — hole: `Nat`, stage: `Nat`
- `outcomeLanded` — register: `Nat`
- `headAdvancedPast` — lane: `Nat`, shard: `Nat`, position: `Nat`
- `onAbsence` — subject: `Nat`
- `negation` — inner: `CandidatePredicate`
- `deadline` — tick: `Nat`
- `absentEverywhere` — cell: `Nat`

### `CandidateAct`

*inductive*

- `declare` — kind: `DeclKind`, payload: `List(RawArg)`, writ: `Nat`
- `resolveDigest` — kind: `DeclKind`, target: `Nat`, anchor: `Option(Nat)`
- `trustBytes` — kind: `DeclKind`, target: `Nat`, asserted: `Nat`
- `emit` — lane: `Nat`, body: `List(RawArg)`
- `join` — cell: `Nat`, contribution: `List(RawArg)`, strategy: `MergeStrategy`
- `readLatest` — subject: `Nat`
- `fold` — declared: `Nat`, anchor: `Option(CandidateAnchor)`, query: `List(RawArg)`
- `decide` — register: `Nat`, token: `Option(TokenClaim)`, outcome: `List(RawArg)`
- `trigger` — predicate: `CandidatePredicate`, declaration: `Nat`
- `spawn` — parent: `Nat`, request: `Nat`
- `updateInPlace` — target: `Nat`, payload: `List(RawArg)`

### `RefusalReason`

*inductive*

- `clockRead` — _no fields_
- `absenceTrigger` — _no fields_
- `unfencedDecide` — _no fields_
- `lastWriterWins` — _no fields_
- `unverifiedRead` — _no fields_
- `crossSortIdentifier` — _no fields_
- `mintedIdentifier` — _no fields_
- `ambientQueryInput` — _no fields_
- `forwardReference` — _no fields_
- `secretCarrier` — _no fields_
- `absenceClaim` — _no fields_
- `pastMutation` — _no fields_
- `offWritReferent` — _no fields_
- `closureIntrospection` — _no fields_
- `anchoredResolve` — _no fields_
- `unfilledHole` — _no fields_

### `Refusal`

*structure*

- `mk` — reason: `RefusalReason`, law: `String`, repair: `String`

### `Applicability`

*inductive*

- `machineApplicable` — _no fields_
- `advisory` — _no fields_

### `Door`

*structure*

- `mk` — catalog: `List(Ref)`, pinned: `List(Ref)`

## Conformance vectors

These check an implementation against the model's verdicts. They are safety statements about admission and encoding only; they promote no runtime guarantee.

### Canonical encodings

| Vector | Encoding |
|---|---|
| `lawfulDeclareAct` | `[0, 0, 7000051000172, 4]` |
| `resolveSchemaEight` | `[1, 0, 8]` |
| `emitLaneOne` | `[2, 1, 42]` |
| `joinResourceSix` | `[3, 6, 42]` |
| `foldAtGroundAnchor` | `[4, 2, 1, 0, 4, 11, 6, 42]` |
| `decideFencedRegisterThree` | `[5, 3, 7, 42]` |
| `triggerHoleReachesFilled` | `[6, 2, 0, 1, 0, 3]` |
| `spawnPolicyFourFive` | `[7, 4, 5]` |

### Admission verdicts

| Candidate | Verdict | Reason or encoding |
|---|---|---|
| `clockFold` | refused | `clock-read` |
| `absenceTrigger` | refused | `absence-trigger` |
| `unfencedDecide` | refused | `unfenced-decide` |
| `lastWriterJoin` | refused | `last-writer-wins` |
| `trustingRead` | refused | `unverified-read` |
| `crossRegisterDecide` | refused | `cross-sort-identifier` |
| `mintedDeclare` | refused | `minted-identifier` |
| `latestRead` | refused | `ambient-query-input` |
| `forwardDeclare` | refused | `forward-reference` |
| `secretEmit` | refused | `secret-carrier` |
| `absenceClaimTrigger` | refused | `absence-claim` |
| `pastMutation` | refused | `past-mutation` |
| `offWritDeclare` | refused | `off-writ-referent` |
| `functionDeclare` | refused | `closure-introspection` |
| `anchoredResolve` | refused | `anchored-resolve` |
| `holeyEmit` | refused | `unfilled-hole` |
| `lawfulDeclare` | admitted | `[0, 0, 7000051000172, 4]` |

