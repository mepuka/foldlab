# The kernel language

<!-- GENERATED FILE - DO NOT EDIT. -->

Rendered from `packages/plait/fixtures/kernel-conformance.ndjson` by `bun run generate:kernel-prose`, which reads the interchange emitted from `verify/kernel` by `verify/unity emit` at format 2. Every name, rank, law, repair, and docstring on this page is the model's own text, reproduced verbatim - not paraphrased, not reflowed, not truncated. Two mechanical exceptions, and no others: inside a table cell a line break becomes a space and a pipe is escaped, because a cell holds neither; and trailing spaces are trimmed from line ends, which Markdown discards anyway. The untrimmed text is what the generated schemas carry.

**What this page is not.** These are the model's verdicts, not guarantees about any running system. A conforming implementation is one whose door refuses the same candidates for the same reasons, encodes the same sentences the same way, and serializes the same values to the same bytes. Nothing more is claimed, and nothing more should be read into a green conformance run.

## Declaration kinds

The universe is closed: these are all of them, and a rank is what an encoded sentence carries, so renumbering one changes the identity of every declaration of that kind.

| Rank | Kind |
| --- | --- |
| 0 | schema |
| 1 | program |
| 2 | policy |
| 3 | capability |
| 4 | lane |
| 5 | algebra |
| 6 | index |
| 7 | resource |
| 8 | ontology |
| 9 | schedule |
| 10 | template |
| 11 | language |

## Hole stages

A hole passes through these as it is filled, disputed, decided, and sealed. The rank is ordinal and is read in the reached-at-least direction only: a sealed hole has reached filled. The distance between two ranks means nothing.

| Rank | Stage |
| --- | --- |
| 0 | opened |
| 1 | filled |
| 2 | disputed |
| 3 | decided |
| 4 | sealed |

## Taught refusals

Each refusal carries the law it defends and the legal next move. The model's teaching function is total, so a reason with no law and no repair cannot exist.

### clock-read

**Law.** the fold carrier has no clock parameter (f11_query_deterministic)

**Repair.** emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value

**Applicability.** advisory

### absence-trigger

**Law.** the trigger grammar is closed at five monotone productions (f10_stability)

**Repair.** route acting-on-silence through the deadline seat: a fenced decide fed by tick facts

**Applicability.** advisory

### unfenced-decide

**Law.** only a fenced token commits (at_most_one_landed_commit)

**Repair.** hold the register's token and commit with it; grant and renew are runtime liveness, not grammar

**Applicability.** advisory

### last-writer-wins

**Law.** cells merge by join under a declared ACI algebra (f1_cell_merge_aci)

**Repair.** declare the merge algebra; idempotent join leaves nothing for arrival order to choose

**Applicability.** machine-applicable

### unverified-read

**Law.** a decode re-derives the digest of what it fetched (verify-on-read)

**Repair.** resolve and let the door re-derive; absence is retryable, a mismatch is structural

**Applicability.** machine-applicable

### cross-sort-identifier

**Law.** tokens are per-register and positions are per-partition; sorts never compare across spaces

**Repair.** compare a token only within its register and a position only within its partition

**Applicability.** advisory

### minted-identifier

**Law.** every identifier is a digest of a declaration or a derivation from one

**Repair.** declare the value and use its digest; nothing mints a name

**Applicability.** advisory

### ambient-query-input

**Law.** a derived read is a function of support and query alone (f11_topk_of_support)

**Repair.** read state through a fold at an anchor, and put any seed inside the declared query value

**Applicability.** advisory

### forward-reference

**Law.** pins name already-admitted digests (c7_pin_well_founded)

**Repair.** declare the referent first; the reference graph is a DAG by admission order

**Applicability.** advisory

### secret-carrier

**Law.** the wire grammar admits no secret position

**Repair.** carry credentials in the environmental band as redacted configuration, outside meaning

**Applicability.** advisory

### absence-claim

**Law.** a local view is a lattice lower bound (cell_absorb_inflationary)

**Repair.** claim at-least from a replica, never not-present-anywhere

**Applicability.** advisory

### past-mutation

**Law.** journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)

**Repair.** declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon

**Applicability.** machine-applicable

### off-writ-referent

**Law.** a declaration's identifiers lie inside the universe its writ pins

**Repair.** spawn under a writ that pins the referent, or request the referent into the pinned universe

**Applicability.** advisory

### closure-introspection

**Law.** a program's identity is its declaration, never its closure bytes

**Repair.** reference computation by digest: declare the fold and pin its digest

**Applicability.** advisory

### anchored-resolve

**Law.** a digest names one value forever, so no anchor can change a resolve

**Repair.** drop the anchor; read head-relative state through a fold at an anchor

**Applicability.** machine-applicable

### unfilled-hole

**Law.** only closed programs execute; a hole is a declared parameter, not a wildcard

**Repair.** fill every declared hole; disjoint fills commute, so fill order is free

**Applicability.** advisory

## The codemod catalog

4 of the 16 repairs are machine-applicable: the lawful rewrite is a function of the refused candidate alone, so an agent may apply it with no new information. The rest need something the candidate does not carry, and are advisory.

| Reason | Repair |
| --- | --- |
| last-writer-wins | declare the merge algebra; idempotent join leaves nothing for arrival order to choose |
| unverified-read | resolve and let the door re-derive; absence is retryable, a mismatch is structural |
| past-mutation | declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon |
| anchored-resolve | drop the anchor; read head-relative state through a fold at an anchor |

## The type vocabulary

22 types, in the model's declaration order. A field's type is a small grammar: a leaf (`Nat`, `String`, `Ref`), a declared type, or a one-argument container, optionally applied to brand arguments. A brand argument is either one of the declaration kinds above or the name of an earlier field or parameter of the same constructor.

### DeclKind

The closed universe of declaration kinds. One brand per kind: a
digest is always the digest of a declaration of a known kind.

A sum type, with 12 constructors.

- `schema`
- `program`
- `policy`
- `capability`
- `lane`
- `algebra`
- `index`
- `resource`
- `ontology`
- `schedule`
- `template`
- `language`

### Digest

A content address branded by the declaration kind it names. Digests
are modeled as identity labels; that a real digest is a hash over
one canonical byte form stays in the trusted base. A digest of one
kind never compares with a digest of another: the comparison has no
type, which is the referent-pinning discipline carried by the sort
system itself.

Branded by `kind`. A brand is carried in the type rather than in the data, so two values that differ only by it do not compare.

A product type, with one constructor.

- `mk` — id : Nat

### Value

An immutable value at its canonical byte form, modeled as an opaque
identity label. Canonical-byte identity (one value, one byte form)
is the certifier's own wall and is not restated here.

A product type, with one constructor.

- `mk` — bytes : Nat

### StateLabel

The digest of a fold state: a value identity, never a declaration
identity. Its own sort keeps it out of every declaration-digest
position.

A product type, with one constructor.

- `mk` — value : Nat

### Petname

A human-facing petname. Naming, never identity: no operation in this
package derives a digest from a petname, because resolution is a
head-relative read served by a fold, outside the identity plane.

A product type, with one constructor.

- `mk` — text : String

### Token

A fencing token, meaningful only within the register that issued
it. The register is part of the token's type: a cross-register
comparison fails to elaborate, so the proven-but-vacuous-bound
failure (two sides of a comparison denominated in different spaces)
has no syntax.

Branded by `register`. A brand is carried in the type rather than in the data, so two values that differ only by it do not compare.

A product type, with one constructor.

- `mk` — value : Nat

### LanePartition

A lane partition: the venue-local shard of an evidence stream.

A product type, with one constructor.

- `mk` — lane : Digest(lane), shard : Nat

### Position

A journal position, meaningful only within its partition. As with
tokens, the space rides the type.

Branded by `partition`. A brand is carried in the type rather than in the data, so two values that differ only by it do not compare.

A product type, with one constructor.

- `mk` — value : Nat

### AnchorFact

An anchor fact: `(fold digest, partition) -> (floor, state, head)`.
A fact, not a cache -- the resume coordinate every head-relative
read carries. The fold digest and partition are part of the type:
an anchor replays nowhere but at its own fold and partition.

Branded by `declared` and `partition`. A brand is carried in the type rather than in the data, so two values that differ only by it do not compare.

A product type, with one constructor.

- `mk` — floor : Position(partition), state : StateLabel, head : Position(partition)

### HoleStage

The epistemic stages of a hole, in rising rank order. `opened` is
the protocol stage named open; the language keyword forces the
spelling.

A sum type, with 5 constructors.

- `opened`
- `filled`
- `disputed`
- `decided`
- `sealed`

### KTriggerPredicate

The closed trigger grammar at kernel sorts: exactly the five
monotone productions. Every production reads its component upward
(presence, reached-at-least, landed, advanced-past), so stability
under growth is a property of the grammar's shape.

A sum type, with 5 constructors.

- `evidenceAppears` — lane : Digest(lane), pattern : Value
- `cellReaches` — cell : Digest(resource), threshold : Value
- `holeReaches` — hole : Nat, target : HoleStage
- `outcomeLanded` — register : Digest(program)
- `headAdvancedPast` — partition : LanePartition, position : Position(partition)

### Act

One lawful kernel sentence: the eight generators, each constructor
demanding exactly the sorts its licensing law names.
`resolve` is anchor-free because a digest names one value forever;
every head-relative read is `fold` at an anchor -- the
immutable/head-relative split carried by the constructors
themselves. `decide` is commit-with-token: the token's type pins
the register, so an unfenced or cross-register commit has no
derivation.

A sum type, with 8 constructors.

- `declare` — kind : DeclKind, value : Value, writ : Digest(policy)
- `resolve` — kind : DeclKind, target : Digest(kind)
- `emit` — lane : Digest(lane), body : Value
- `join` — cell : Digest(resource), contribution : Value
- `fold` — declared : Digest(index), partition : LanePartition, anchor : AnchorFact(declared,partition), query : Value
- `decide` — register : Digest(program), token : Token(register), outcome : Value
- `trigger` — predicate : KTriggerPredicate, declaration : Digest(program)
- `spawn` — parent : Digest(policy), request : Digest(policy)

### RawArg

A raw argument atom. The lawful atoms are digest references and
literals; holes are lawful in program declarations and refused in a
single sentence; every other atom is an unlawful shape kept
spellable so the door's refusal of it is demonstrable.

A sum type, with 8 constructors.

- `digestRef` — kind : DeclKind, id : Nat
- `literal` — value : Nat
- `hole` — name : Nat
- `clockNow`
- `randomSeed`
- `secretBytes` — bytes : Nat
- `mintedId` — token : Nat
- `functionValue` — code : Nat

### CandidateAnchor

A candidate anchor: the raw spelling of a resume coordinate, its
fold carried as data rather than as a type index -- which is exactly
what lets a cross-fold anchor be spelled and refused.

A product type, with one constructor.

- `mk` — foldId : Nat, lane : Nat, shard : Nat, floor : Nat, state : Nat, head : Nat

### TokenClaim

A raw token claim: the register the claimant believes the token
belongs to, carried as data so a cross-register claim is spellable
and refused.

A product type, with one constructor.

- `mk` — register : Nat, value : Nat

### MergeStrategy

A candidate merge strategy. The lawful strategy names a declared
merge algebra; last-writer-wins is spellable here and refused at
the door, because no such carrier exists in the fabric.

A sum type, with 2 constructors.

- `declaredAlgebra` — algebra : Nat
- `lastWriterWins`

### CandidatePredicate

The candidate trigger grammar: the five lawful productions plus the
shapes the closed grammar deliberately cannot carry -- absence,
negation, deadline, and the not-present-anywhere claim a local
replica can never ground.

A sum type, with 9 constructors.

- `evidenceAppears` — lane : Nat, pattern : Nat
- `cellReaches` — cell : Nat, threshold : Nat
- `holeReaches` — hole : Nat, stage : Nat
- `outcomeLanded` — register : Nat
- `headAdvancedPast` — lane : Nat, shard : Nat, position : Nat
- `onAbsence` — subject : Nat
- `negation` — inner : CandidatePredicate
- `deadline` — tick : Nat
- `absentEverywhere` — cell : Nat

### CandidateAct

The raw candidate grammar. Every generator is spellable, and so is
every unlawful shape: an anchored resolve, a trusted read, an
unfenced or cross-register decide, a last-writer-wins join, an
unanchored latest read, and an in-place mutation of the past.

A sum type, with 11 constructors.

- `declare` — kind : DeclKind, payload : List(RawArg), writ : Nat
- `resolveDigest` — kind : DeclKind, target : Nat, anchor : Option(Nat)
- `trustBytes` — kind : DeclKind, target : Nat, asserted : Nat
- `emit` — lane : Nat, body : List(RawArg)
- `join` — cell : Nat, contribution : List(RawArg), strategy : MergeStrategy
- `readLatest` — subject : Nat
- `fold` — declared : Nat, anchor : Option(CandidateAnchor), query : List(RawArg)
- `decide` — register : Nat, token : Option(TokenClaim), outcome : List(RawArg)
- `trigger` — predicate : CandidatePredicate, declaration : Nat
- `spawn` — parent : Nat, request : Nat
- `updateInPlace` — target : Nat, payload : List(RawArg)

### RefusalReason

The closed refusal reasons of the kernel door.

A sum type, with 16 constructors.

- `clockRead`
- `absenceTrigger`
- `unfencedDecide`
- `lastWriterWins`
- `unverifiedRead`
- `crossSortIdentifier`
- `mintedIdentifier`
- `ambientQueryInput`
- `forwardReference`
- `secretCarrier`
- `absenceClaim`
- `pastMutation`
- `offWritReferent`
- `closureIntrospection`
- `anchoredResolve`
- `unfilledHole`

### Refusal

A structural refusal: the reason, the law it defends, and the
taught repair. Refusal parity as data: the door never refuses
without teaching the legal next move.

A product type, with one constructor.

- `mk` — reason : RefusalReason, law : String, repair : String

### Applicability

How a taught repair may be applied. A repair is machine-applicable
exactly when the lawful rewrite is a function of the refused
candidate alone -- an agent may apply it mechanically, with no new
information; it is advisory when the repair needs something the
candidate does not carry (a token to hold, a value to declare, an
authority to request). The Rust diagnostic discipline, adopted by
the operator's ruling.

A sum type, with 2 constructors.

- `machineApplicable`
- `advisory`

### Door

The admission context: the already-admitted catalog and the
universe of referents the acting writ pins.

A product type, with one constructor.

- `mk` — catalog : List(Ref), pinned : List(Ref)

## Encoding vectors

A sentence's identity is its canonical framing. Element zero is the generator tag and the arity is fixed per tag, so a decoder dispatches on length and tag alone. The emitter round-trips every vector before writing it.

| Vector | Encoding |
| --- | --- |
| lawful-declare | `[0, 0, 7000051000172, 4]` |
| resolve-schema | `[1, 0, 8]` |
| emit-lane | `[2, 1, 42]` |
| join-cell | `[3, 6, 42]` |
| fold-at-anchor | `[4, 2, 1, 0, 4, 11, 6, 13]` |
| decide-fenced | `[5, 3, 7, 42]` |
| trigger-evidence-appears | `[6, 0, 1, 17, 0, 3]` |
| trigger-cell-reaches | `[6, 1, 6, 23, 0, 3]` |
| trigger-hole-reaches | `[6, 2, 0, 3, 0, 3]` |
| trigger-outcome-landed | `[6, 3, 3, 0, 0, 3]` |
| trigger-head-advanced-past | `[6, 4, 1, 0, 6, 3]` |
| spawn-under-writ | `[7, 4, 5]` |

## The door's verdicts

Every planted candidate and the verdict the model's door returns for it. The admitted row is not optional: a suite of refusals alone cannot tell a correct door from one that refuses everything.

| Candidate | Verdict | Reason or encoding |
| --- | --- | --- |
| clockFold | refused | clock-read |
| absenceTrigger | refused | absence-trigger |
| unfencedDecide | refused | unfenced-decide |
| lastWriterJoin | refused | last-writer-wins |
| trustingRead | refused | unverified-read |
| crossRegisterDecide | refused | cross-sort-identifier |
| mintedDeclare | refused | minted-identifier |
| latestRead | refused | ambient-query-input |
| forwardDeclare | refused | forward-reference |
| secretEmit | refused | secret-carrier |
| absenceClaimTrigger | refused | absence-claim |
| pastMutation | refused | past-mutation |
| offWritDeclare | refused | off-writ-referent |
| functionDeclare | refused | closure-introspection |
| anchoredResolve | refused | anchored-resolve |
| holeyEmit | refused | unfilled-hole |
| lawfulDeclare | admitted | `[0, 0, 7000051000172, 4]` |

## Canonical form

The interchange is written in one canonical form, and these vectors are the cross-implementation reference for it: an implementation agrees exactly when it produces these bytes from these values. The bytes below are what the canonicalizer writes for each vector's value, which is also what the corpus carries for it.

| Vector | Bytes |
| --- | --- |
| empty-object | `{}` |
| empty-array | `[]` |
| empty-string | `""` |
| zero | `0` |
| big-integer | `9007199254740993` |
| key-order | `{"a":2,"b":1}` |
| nested-object | `{"z":{"y":[3,4]}}` |
| nested-array | `[[],[{}]]` |
| string-escapes | `"a\"b\\c\nd\te"` |
| control-char | `"\u0001"` |

Members sort by key, no whitespace anywhere, and every number is an unbounded non-negative integer in minimal decimal - never a double, which is what the big-integer vector exists to catch.
