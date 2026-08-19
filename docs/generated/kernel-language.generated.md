# The kernel language

<!-- GENERATED FILE - DO NOT EDIT. -->

Rendered from the kernel corpus `b5a7c9ba123dc2e3e28c209a63752ed9129600e19b7960e3847f60416b1762d3` at interchange format 2. That is the corpus's identity - SHA-256 over its canonical bytes - and it is what this page names its source by, because everything in this language refers to a digest or to a derivation of one. A path would name wherever a reader happens to be standing, which is precisely the ambient reference the algebra refuses; a digest names one byte sequence forever, so a reader who wants to know whether they hold this page's source hashes what they have and compares.

Every name, rank, law, repair, and docstring on this page is the model's own text, reproduced verbatim - not paraphrased, not reflowed, not truncated. Two mechanical exceptions, and no others: inside a table cell a line break becomes a space and a pipe is escaped, because a cell holds neither; and trailing spaces are trimmed from line ends, which Markdown discards anyway. The untrimmed text is what the generated schemas carry.

**One thing on this page is not the model's.** Each refusal kind's *meaning* - the one or two sentences closing its section, and the runtime structural kinds section - is house prose, read from the reviewed refusal-kind roster rather than from the corpus, because the corpus carries no field a meaning could ride in. Those sentences are RATIFIED: the operator's taste pass ruled on the corpus and its voice, so each stands as written and an amendment is an ordinary reviewed change to the roster. Read them as the house explaining its own vocabulary, never as a model verdict.

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

Each also carries its standing **meaning**: one to two sentences saying what fact the reason names and what that implies. The two registers are deliberately different acts. A law and a repair speak at the moment of refusal, to whoever presented the candidate, about this one presentation. A meaning speaks about the reason itself, standing, to anyone reading the vocabulary. The model corpus has no field to carry a meaning in, so these are reviewed house data rendered here beside the teaching — every one of them ratified by the operator's taste pass and standing as written.

### clock-read

**Law.** the fold carrier has no clock parameter (f11_query_deterministic)

**Repair.** emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value

**Applicability.** advisory

A fold read a clock. The fold carrier has no clock parameter, so a time a fold consumes arrives as a tick fact on an evidence lane like every other fact.

### absence-trigger

**Law.** the trigger grammar is closed at five monotone productions (f10_stability)

**Repair.** route acting-on-silence through the deadline seat: a fenced decide fed by tick facts

**Applicability.** advisory

A trigger fires on silence rather than on a fact. The trigger grammar is closed at five monotone productions, so acting on the absence of evidence has no production to be written in.

### unfenced-decide

**Law.** only a fenced token commits (at_most_one_landed_commit)

**Repair.** hold the register's token and commit with it; grant and renew are runtime liveness, not grammar

**Applicability.** advisory

A commit was attempted without holding a fencing token. Only a fenced token lands an outcome, so an unfenced decide has nothing making it at most once.

### last-writer-wins

**Law.** cells merge by join under a declared ACI algebra (f1_cell_merge_aci)

**Repair.** declare the merge algebra; idempotent join leaves nothing for arrival order to choose

**Applicability.** machine-applicable

A write was resolved by arrival order. Cells merge by join under a declared ACI algebra, so an idempotent merge leaves arrival order nothing to decide.

### unverified-read

**Law.** a decode re-derives the digest of what it fetched (verify-on-read)

**Repair.** resolve and let the door re-derive; absence is retryable, a mismatch is structural

**Applicability.** machine-applicable

A fetched value was trusted without re-deriving its digest. A decode re-derives the identity of what it fetched, so an unverified read makes the store, rather than the bytes, the authority.

### cross-sort-identifier

**Law.** tokens are per-register and positions are per-partition; sorts never compare across spaces

**Repair.** compare a token only within its register and a position only within its partition

**Applicability.** advisory

Two identifiers were compared across the spaces that mint them. Tokens are per-register and positions are per-partition, so a comparison across spaces is a sort error wearing the shape of a number.

### minted-identifier

**Law.** every identifier is a digest of a declaration or a derivation from one

**Repair.** declare the value and use its digest; nothing mints a name

**Applicability.** advisory

A name was invented rather than derived. Every identifier is the digest of a declaration or a derivation from one, so nothing in the language mints a name out of nothing.

### ambient-query-input

**Law.** a derived read is a function of support and query alone (f11_topk_of_support)

**Repair.** read state through a fold at an anchor, and put any seed inside the declared query value

**Applicability.** advisory

A derived read depends on something outside its support and its query value. Such a read is a function of those two alone, so an ambient input would make one query at one anchor answerable two ways.

### forward-reference

**Law.** pins name already-admitted digests (c7_pin_well_founded)

**Repair.** declare the referent first; the reference graph is a DAG by admission order

**Applicability.** advisory

A pin names a declaration that has not been admitted. The reference graph is a DAG in admission order, so a referent is declared before anything points at it.

### secret-carrier

**Law.** the wire grammar admits no secret position

**Repair.** carry credentials in the environmental band as redacted configuration, outside meaning

**Applicability.** advisory

A secret was carried in the wire grammar. The grammar admits no secret position, so credentials ride the environmental band as redacted configuration, outside meaning.

### absence-claim

**Law.** a local view is a lattice lower bound (cell_absorb_inflationary)

**Repair.** claim at-least from a replica, never not-present-anywhere

**Applicability.** advisory

A read claimed that something is present nowhere. A local view is a lattice lower bound, so it licenses an at-least claim and never a global negative.

### past-mutation

**Law.** journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)

**Repair.** declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon

**Applicability.** machine-applicable

A recorded fact was changed after the fact. Journals are append-only, so a correction is a successor value pinning its predecessor and forgetting is fenced compaction above the horizon.

### off-writ-referent

**Law.** a declaration's identifiers lie inside the universe its writ pins

**Repair.** spawn under a writ that pins the referent, or request the referent into the pinned universe

**Applicability.** advisory

A declaration names an identifier outside the universe its writ pins. The writ is the boundary a declaration's references live inside, so reaching past it would let a spawn read what its grant never admitted.

### closure-introspection

**Law.** a program's identity is its declaration, never its closure bytes

**Repair.** reference computation by digest: declare the fold and pin its digest

**Applicability.** advisory

A program's identity was taken from its closure bytes. A declaration is the identity, so computation is referenced by the digest of a declared fold and never by the shape of a function value.

### anchored-resolve

**Law.** a digest names one value forever, so no anchor can change a resolve

**Repair.** drop the anchor; read head-relative state through a fold at an anchor

**Applicability.** machine-applicable

A resolve was qualified by an anchor. A digest names one value forever, so an anchor could only decorate that answer; head-relative reading belongs to a fold read at an anchor instead.

### unfilled-hole

**Law.** only closed programs execute; a hole is a declared parameter, not a wildcard

**Repair.** fill every declared hole; disjoint fills commute, so fill order is free

**Applicability.** advisory

Execution was attempted on a declaration with a hole still open. Only closed programs execute, and a hole is a declared parameter rather than a wildcard, so it is filled before the declaration is a run.

## The codemod catalog

4 of the 16 repairs are machine-applicable: the lawful rewrite is a function of the refused candidate alone, so an agent may apply it with no new information. The rest need something the candidate does not carry, and are advisory.

| Reason | Repair |
| --- | --- |
| last-writer-wins | declare the merge algebra; idempotent join leaves nothing for arrival order to choose |
| unverified-read | resolve and let the door re-derive; absence is retryable, a mismatch is structural |
| past-mutation | declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon |
| anchored-resolve | drop the anchor; read head-relative state through a fold at an anchor |

## Runtime structural refusal kinds

44 structural refusal kinds the plait runtime can mint, in the persisted order of the shipped union. These are not model rows: a spelling the corpus above also carries is corpus-backed, and a spelling it does not is marked staged debt. The roster they come from is reviewed house data, and the same rows are generated into the kernel table with their ancestry and into the truth plane as the shipped union.

Each carries its standing meaning on the same terms as a taught refusal above, and for the same reason: the refusal-time teaching for these kinds is minted where each refusal fires and is pinned byte for byte by its own wall, while what follows is the kind's meaning in the language. Every one of them is ratified and stands as written.

### non-canonical-value

**Ancestry.** staged debt

The presented value has no canonical form under the estate's RFC 8785 seam, so it cannot be given a content address. Identity here is bytes, and a value the canonicalizer will not admit has no identity to name.

### invalid-subject-token

**Ancestry.** staged debt

A routing token presented to the fabric is not one literal NATS token. Subjects route and never identify, so a token that could expand or wildcard would widen a route no declaration named.

### malformed-envelope

**Ancestry.** staged debt

The presented bytes do not carry the fixed v0 envelope shape the fabric contract declares. The envelope is the frame every fact travels in, so a shape the grammar does not admit is refused before anything reads a body.

### malformed-blob-reference

**Ancestry.** staged debt

A body claiming to reach outside itself is not the exact closed blob-reference form envelope v0 reserves. That reserved form is the only way a body may name bytes it does not carry, so a near miss is refused rather than guessed at.

### inline-body-too-large

**Ancestry.** staged debt

A canonical body exceeds what envelope v0 carries inline. Bodies above the pinned threshold travel as blobs, which is what keeps the emit path inside a measured substrate budget instead of discovering the ceiling under load.

### digest-mismatch

**Ancestry.** staged debt

Bytes re-derived on read do not hash to the digest that named them. Verify-on-read is what makes a content address a claim about bytes rather than a claim about a store, so a mismatch is structural and is never retried.

### substrate-shape

**Ancestry.** staged debt

The commons control stream is not the shape the fabric declares for it. A carrier's shape is part of its meaning, so a stream that evicts, imports, or admits evidence the declaration excludes is refused before anything is written to it.

### invalid-lane-declaration

**Ancestry.** staged debt

A lane declaration is not canonical data carrying one literal route handle, a positive partition count, and a declared key path. A lane is the addressing unit every partition under it inherits, so an ill-formed one would place facts on routes no declaration names.

### invalid-partition-key

**Ancestry.** staged debt

A partition key was derived from something other than the declared path over the admitted event, or names a partition the fold handle does not expose. Routing is a function of the declaration alone, so an ambient or invented key is refused.

### lane-evidence-mismatch

**Ancestry.** staged debt

An arriving event is not addressed by the lane and partition key its pump declared. A durable pump consumes only its own declared evidence, so a foreign arrival is refused rather than folded into a state that could no longer be attributed.

### lane-substrate-shape

**Ancestry.** staged debt

The stream backing a declared lane partition is not the exact non-evicting shape the declaration requires. Each declared pair owns one stream whose dense sequence is the successor position, so an evicting or duplicated stream would break the successor discipline that protects application.

### payload-substrate-shape

**Ancestry.** staged debt

The live substrate advertises a maximum payload too small to carry an emit at the pinned inline threshold. The threshold is pinned against a measured budget, so a substrate below it is refused at open time rather than at emit time.

### mirrored-authority-carrier

**Ancestry.** staged debt

An authority carrier was opened against a stream that imports its facts from another origin. A mirroring or sourcing stream is a locally read-only copy of someone else's journal, so holding it as an authority would attribute decisions to facts it does not own.

### expiring-authority-carrier

**Ancestry.** staged debt

An authority carrier was opened against a stream whose server may expire the facts it holds. A fact the substrate deletes un-decides every decision that cited it, so material meant to expire belongs on a carrier no decision reads.

### invalid-algebra-declaration

**Ancestry.** staged debt

A declared algebra's definition or initial state is not a canonical wire-grammar value. An algebra is declared before it is trusted, so a definition with no canonical bytes has no digest to seed its law suite from.

### invalid-fold-declaration

**Ancestry.** staged debt

A fold declaration carries a flow-control or pinned-head value outside the domain the runtime admits. The declaration is what every pump and checkpoint under the fold is configured from, so an out-of-domain field is refused here rather than surfacing later as a runtime failure.

### unearned-commutative-algebra

**Ancestry.** staged debt

An algebra was spread across more than one partition without having earned the commutative brand. F4 licenses partition fan-out only for an algebra whose digest-seeded law suite passed, so an unearned brand would let arrival order choose the answer.

### invalid-anchor-advance

**Ancestry.** staged debt

An anchor advance is not the contiguous successor step the anchor discipline admits. A floor advances by exactly one applied position, so a jump would record a frontier no application actually reached.

### anchor-substrate-shape

**Ancestry.** staged debt

The anchor bucket is not the non-evicting, revision-retaining shape the fold plane declares. Anchors are what a resumption reads back, so a bucket that evicts or carries admin surface beyond the declaration cannot be trusted to still hold the frontier.

### malformed-anchor-state

**Ancestry.** staged debt

An anchor and the content-addressed state it names do not re-derive to the recorded canonical digests. The anchor is the record a resumption trusts, so state that does not re-derive is refused rather than resumed from.

### lost-anchor-cas

**Ancestry.** staged debt

This pump lost the anchor revision CAS it held. One live pump owns each fold partition, so a lost revision means another owner exists and this one detaches; there is deliberately no re-read-and-continue path.

### consumer-substrate-shape

**Ancestry.** staged debt

A fold partition's durable consumer is not the explicit-ack, bounded-in-flight pull consumer the fold plane declares. That window is what bounds the reorder buffer, so a consumer outside the shape would let the buffer grow past its declared bound.

### fold-buffer-overflow

**Ancestry.** staged debt

Positions arrived beyond what the position-addressed reorder buffer may hold. The buffer is bounded by the durable consumer's in-flight window, so an overflow reports a substrate not honouring that window rather than a buffer that should grow.

### invalid-session-declaration

**Ancestry.** staged debt

A session declaration is missing its holder, its set of declared views, an anchor policy this seam knows, or a partition its fold's lane declares. A session is read-plane state judged before any layer is reached, so an ill-formed one is refused where no fixture service can drop it.

### undeclared-view

**Ancestry.** staged debt

A session asked for an image outside the declared views its writ names. A session emits only the image of the declared fold it subscribed to, and only while the writ still names that view.

### invalid-chaos-request

**Ancestry.** staged debt

A chaos run was requested over something other than one pinned span of one admitted declared fold. Chaos measures the real durable-consumer protocol, so an ambient head or an arbitrary program would measure something no declaration describes.

### invalid-fold-state

**Ancestry.** staged debt

A presented fold state is not a wire-grammar value whose state digest re-derives over its canonical bytes. Fold state is content-addressed like everything else, so a state whose digest does not re-derive cannot be anchored.

### invalid-register-key

**Ancestry.** staged debt

A work digest presented to the register plane does not map to one literal key. A register is keyed by the work it fences, so a key that could expand would fence something other than what was named.

### malformed-register-state

**Ancestry.** staged debt

The bytes stored at a register key are not the closed holder-and-outcome record the register plane writes. Only that adapter writes the bucket, so a value outside the closed shape means the substrate holds something no lawful write produced.

### register-absent

**Ancestry.** staged debt

Renew, commit, or expire-steal was attempted against a register that does not exist. A grant creates the register before anything fences on it, so this names a missing grant and not a retryable observation.

### register-substrate-shape

**Ancestry.** staged debt

The register bucket is not the non-evicting, revision-retaining shape the fencing plane declares. A fencing token is that bucket's revision order, so a bucket that evicts or renumbers would make a stale token indistinguishable from a current one.

### duplicate-grant

**Ancestry.** staged debt

A grant was attempted against work whose register already exists. A grant requires absence, so admitting a second one would hand two holders a lease over the same work.

### outcome-already-landed

**Ancestry.** staged debt

The register already carries a landed outcome. An outcome, once set, never changes, so this round is over whether or not the presented token is current.

### stale-register-token

**Ancestry.** staged debt

The presented fencing token is not the register's current one. Only a current token renews or commits, so a stale one belongs to a superseded round and must never land.

### concurrent-register-update

**Ancestry.** staged debt

An expire-steal lost its compare-and-set against a concurrently advancing register. A steal grants a strictly larger token from the revision it read, so a moved revision is re-read and the steal re-attempted against it.

### malformed-value

**Ancestry.** staged debt

Presented bytes do not decode as their declared schema, or do not decode as one wire value at all. A decoder that repairs its input names a different value, so a near miss is refused rather than coerced.

### invalid-cell-key

**Ancestry.** staged debt

A cell name does not map to one literal key. A cell is named by that key, so a name that could expand would merge into a keyspace the caller never named.

### malformed-cell-state

**Ancestry.** staged debt

The bytes stored at a cell key are not the canonical array of holder-attributed observations. Only a join writes that bucket, so a value outside the canonical shape means the substrate holds something no merge produced.

### cell-substrate-shape

**Ancestry.** staged debt

The cell bucket is not the non-evicting, single-revision shape the lattice plane declares. A cell is a join-semilattice carrier, so a bucket retaining extra revisions would offer a history the merge discipline does not admit.

### invalid-petname

**Ancestry.** staged debt

A petname carries a separator or a control character, or is one of the relative forms. Petnames name values rather than positions, so the relative forms are refused along with anything a reader could take for a path.

### not-a-directory

**Ancestry.** staged debt

A hop of a path opened a value that is not a directory. A walk never reinterprets a value, so it stops here instead of guessing at a structure the value does not have.

### unbound-petname

**Ancestry.** staged debt

The directory reached at this hop binds no such name. A root digest names one immutable directory, so the answer never moves: this is structural, never a retryable absence.

### ambiguous-binding

**Ancestry.** staged debt

This name is bound to more than one digest in the directory reached. A directory carries a binding set and nothing in a walk arbitrates, so an ambiguous name resolves to none of its candidates.

### incarnation-mismatch

**Ancestry.** staged debt

An incarnation is one life of a store — the store a name resolved to at the moment a fence was taken against it. A store reborn under that name is a different store answering to it and owes nothing to its predecessor's fences, so a fence from the dead incarnation names a store that no longer exists rather than a round that has merely moved on.

## The type vocabulary

27 types, in the model's declaration order. A field's type is a small grammar: a leaf (`Nat`, `String`, `Ref`), a declared type, or a one-argument container, optionally applied to brand arguments. A brand argument is either one of the declaration kinds above or the name of an earlier field or parameter of the same constructor.

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

A candidate merge strategy. Both spellings retain the intended
declared algebra. Last-writer-wins additionally asks arrival order
to override that algebra and is refused at the door. Retaining the
algebra makes dropping the unlawful override a candidate-only
repair: no catalog lookup or new choice is smuggled into it.

A sum type, with 2 constructors.

- `declaredAlgebra` — algebra : Nat
- `lastWriterWins` — algebra : Nat

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
- `updateInPlace` — kind : DeclKind, target : Nat, payload : List(RawArg), writ : Nat

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

### AdmitResult

The admission verdict: an intrinsic sentence, or a taught
structural refusal.

A sum type, with 2 constructors.

- `admitted` — act : Act
- `refused` — refusal : Refusal

### GenTag

The generator a program node applies.

A sum type, with 8 constructors.

- `declare`
- `resolve`
- `emit`
- `join`
- `fold`
- `decide`
- `trigger`
- `spawn`

### ProgramNode

One node of a program declaration: a program-scoped name, the
generator it applies, its raw arguments (holes permitted here --
the program's typed parameters), and the names of the prior nodes
it consumes.

A product type, with one constructor.

- `mk` — name : Nat, generator : GenTag, args : List(RawArg), uses : List(Nat)

### RunStep

One judged node of a run: the program-scoped name, the context the
node was judged at, the candidate sentence it completed to, and the
intrinsic sentence the door translated that candidate into.

A product type, with one constructor.

- `mk` — node : Nat, context : Door, candidate : CandidateAct, act : Act

### RunOutcome

How one run ended. A landed run reports the context it reached and
every step in walked order; a refused run reports the refusing
node, its taught refusal, and the steps that stood before it. The
reached context is this model's sharpening: the carriage holds the
same replica behind its own reference and does not return it.

A sum type, with 2 constructors.

- `landed` — context : Door, steps : List(RunStep)
- `refused` — node : Nat, refusal : Refusal, steps : List(RunStep)

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
| staleStageTrigger | refused | absence-trigger |
| lawfulDeclare | admitted | `[0, 0, 7000051000172, 4]` |
| catalogedTrigger | admitted | `[6, 0, 1, 17, 0, 3]` |

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

## Program declarations

A program is a DAG of named generator applications, written as one canonical value whose bytes are its identity. The value has four members. `nodes` carries the applications, **newest first** - the same orientation the model's admission relation reads, so a node may consume only names standing after it. `edges` makes each consumption explicit, from the consuming node to the consumed one. `holes` carries the declared parameters, ascending by name. `lineage` carries the declarations this one descends from.

A node's arguments are keyed by the model's own field names, never by position, and the map is partial: a slot a node leaves unwired is absent rather than filled, and a field the declaration form carries no reference for - a declaration kind, a token, a lane partition, an anchor fact, a trigger predicate - is absent always.

An argument is one of four references, and there is no fifth. A `digest` reaches outside the declaration and carries the kind it is branded to. A `local` names a prior node, which is a consumption and puts an edge in the list. A `hole` names one of this declaration's own parameters, which is a requirement and puts no edge anywhere. A `literal` carries an identity label. There is deliberately no closure form: a function value has no canonical bytes, so nothing can reference it.

**A declaration is not a run.** These vectors record what a program *is*, never what happened when one was executed. Nothing on this page is an execution record, an ordering, or a claim that any of it has run.

| Vector | Nodes | Edges | Holes | Lineage |
| --- | --- | --- | --- | --- |
| ground-two-node | 2 | 1 | 0 | 0 |
| holey | 2 | 1 | 1 | 0 |
| holey-filled | 2 | 1 | 0 | 0 |
| distill-shape | 4 | 3 | 0 | 1 |

### ground-two-node

2 nodes, 1 consumption, 0 declared parameters, lineage empty.

- `2` `emit` — body = local 1
- `1` `declare`

Canonical bytes, which are this declaration's identity:

```json
{"edges":[{"from":2,"to":1}],"holes":[],"lineage":[],"nodes":[{"args":{"body":{"arg":"local","name":1}},"generator":"emit","name":2},{"args":{},"generator":"declare","name":1}]}
```

### holey

2 nodes, 1 consumption, 1 declared parameter, lineage empty.

- `2` `emit` — lane = digest lane 1, body = local 1
- `1` `declare` — value = hole 7, writ = digest policy 4

Declared parameters, ascending by name:

- `7` — schema 88

Canonical bytes, which are this declaration's identity:

```json
{"edges":[{"from":2,"to":1}],"holes":[{"name":7,"schema":88}],"lineage":[],"nodes":[{"args":{"body":{"arg":"local","name":1},"lane":{"arg":"digest","id":1,"kind":"lane"}},"generator":"emit","name":2},{"args":{"value":{"arg":"hole","name":7},"writ":{"arg":"digest","id":4,"kind":"policy"}},"generator":"declare","name":1}]}
```

### holey-filled

2 nodes, 1 consumption, 0 declared parameters, lineage empty.

- `2` `emit` — lane = digest lane 1, body = local 1
- `1` `declare` — value = literal 42, writ = digest policy 4

Canonical bytes, which are this declaration's identity:

```json
{"edges":[{"from":2,"to":1}],"holes":[],"lineage":[],"nodes":[{"args":{"body":{"arg":"local","name":1},"lane":{"arg":"digest","id":1,"kind":"lane"}},"generator":"emit","name":2},{"args":{"value":{"arg":"literal","value":42},"writ":{"arg":"digest","id":4,"kind":"policy"}},"generator":"declare","name":1}]}
```

### distill-shape

4 nodes, 3 consumptions, 0 declared parameters, lineage 9.

- `4` `join` — cell = digest resource 6, contribution = local 3
- `3` `emit` — lane = digest lane 1, body = local 2
- `2` `decide` — register = digest program 5, outcome = local 1
- `1` `resolve` — target = digest index 8

Canonical bytes, which are this declaration's identity:

```json
{"edges":[{"from":4,"to":3},{"from":3,"to":2},{"from":2,"to":1}],"holes":[],"lineage":[9],"nodes":[{"args":{"cell":{"arg":"digest","id":6,"kind":"resource"},"contribution":{"arg":"local","name":3}},"generator":"join","name":4},{"args":{"body":{"arg":"local","name":2},"lane":{"arg":"digest","id":1,"kind":"lane"}},"generator":"emit","name":3},{"args":{"outcome":{"arg":"local","name":1},"register":{"arg":"digest","id":5,"kind":"program"}},"generator":"decide","name":2},{"args":{"target":{"arg":"digest","id":8,"kind":"index"}},"generator":"resolve","name":1}]}
```
