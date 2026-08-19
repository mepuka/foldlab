# packages/plait — module vocabulary

Local terms hidden behind the seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

**Truth**:
The vocabulary every sentence speaks.

**Kernel**:
The language: corpus, door, programs, and wire grammar.

**Admission door**:
`KernelDoor.admit`: the one pure projection from a model-generated candidate
and catalog/pinned-universe context to an intrinsic act or the generated
reason/law/repair refusal. Model identity labels remain `bigint`; runtime
content digests are independent evidence, not a conversion source.

**Planes**:
The state carriers, one seam per plane.

**Carriage**:
Hosts and transport clients.

**Surface**:
Entry points.

**Envelope**:
The closed version-zero wire value that carries one fabric fact. Its identity
is the SHA-256 digest of its canonical, uncompressed bytes.

**Message ID**:
The envelope digest copied verbatim into `Nats-Msg-Id`. A consumer accepts a
message only when re-deriving the payload digest produces that header value.

**Fabric subject**:
One typed route in the ruled `flb.fab.ev`, `flb.fab.fact`, or `flb.fab.node`
families. Constructors accept routing tokens, never digests.

**Inline body**:
An envelope body whose canonical bytes fit within 256 KiB. Larger bodies must
cross the seam as a blob reference. The threshold is a quarter of the
`max_payload` measured at the pinned server, and the quarter is the margin that
absorbs the worst emit it admits: a lane keyed by the whole event carries the
body twice in one frame.

**Payload budget**:
What one published frame may occupy on the substrate — the server's advertised
`max_payload`, less the emit path's `Nats-Msg-Id` header block, both measured
rather than assumed. It is a floor the emit seam checks against the pin at
acquisition, because `max_payload` is operator-set and a substrate advertising
less makes the inline threshold unenforceable.

**Blob reference**:
The exact closed body form `{ "blob": Digest }`, naming content stored outside
the envelope.

**Fabric client**:
The transport-free Effect service through which callers publish canonical
envelopes or subscribe to verified ones. Its live layer owns the NATS
connection in `Scope`; its fixture layer exercises the same service tag.

**Declared lane**:
Canonical data naming an event-schema digest, literal routing handle, partition
count, and closed partition-key path. Each `(lane, partition)` owns one exact
file-backed stream, so that stream's dense sequence is the fold position.

**Declared algebra**:
A content-addressed reducer definition and wire-grammar initial state. A
commutative algebra carries a runtime witness earned from at least 32 distinct
triples derived by the declaration door from a digest-seeded arbitrary, then
checked for identity, associativity, and commutativity; caller-enumerated cases
and asserted TypeScript casts do not earn it. That witness is one law-atom set,
so a rung is read off it rather than counted in symbols.

**Law atom, rung, brand**:
A law atom is one equation a declared reducer can be checked against — total,
associative, identity, commutative, idempotent, bounded, inverse. A rung is a
named bundle of atoms; climbing adds atoms, so "at least this rung" is set
inclusion and the ladder is a poset, not a chain (an idempotent group is
trivial, so the two tops are incomparable). A brand is the earned atom set,
carried in the type and non-enumerably at runtime. A brand is earned by a
suite, never asserted: the door walks the same atom list it then attaches, so
the checked set and the earned set are one array, and an asserted cast erases
at the door, which reads the runtime witness regardless of what the type said.
Brands never reach canonical bytes, so nothing on this ladder changes a digest.

Two bounds ride the atoms. `bounded` is entailed by `identity` — `e ∘ a = a` is
`e ≤ a` under the derived order — so it is a named consequence rather than an
independent obligation, and a bounded semilattice discriminates on `idempotent`
alone. `inverse` has no predicate at all: a declared algebra carries a reducer
and no inversion, so the two group rungs are type-level names with no door.

**Brand durability**:
The runtime witness is a non-enumerable own property, which is exactly why it
never reaches the wire — and exactly why a spread or `Object.assign` copy drops
it. A copied algebra keeps the phantom type and loses the witness, so the fold
door refuses it on a value the compiler still calls commutative. Re-earn the
brand after copying; do not re-assert it.

**Quotient, and the rung⇒carrier rule**:
Three stages, deepest last: the positioned plane keeps order and duplicates,
the multiset presentation forgets order, the set plane forgets multiplicity
too. A fold may read from the deepest quotient its algebra respects —
commutative reaches the multiset presentation, commutative and idempotent
reaches the set plane, anything weaker stays positional.

**Declared fold**:
A lane, algebra, and per-event contribution under one digest. Its step is
derived as `combine(state, contribution(event))`, so step/algebra compatibility
holds by construction. One partition keeps arrival order and reads the
positioned plane; more than one erases that order and reads the multiset
presentation, which demands the commutative rung at both the type and runtime
doors.

**Successor discipline**:
The position-addressed pump rule: every raw arrival enters its own position,
and only the consecutive entry at `floor + 1` may apply. Gaps stop draining;
redelivery replaces only its own position. This discipline protects against
duplicate application and skips.

**Anchor**:
The checkpoint fact `(floor, stateDigest, head)` stored per fold partition in
`flb-fab-anchor`. The floor records the contiguous frontier and is the resume
coordinate; it is not the protection. State bytes are content-addressed in the
same file-backed R=1 KV bucket before revision-CAS advances the anchor.

**Fatal detach**:
The only response to a lost anchor revision CAS. A pump never re-reads and
continues after ownership evidence moves; one live pump per fold partition is
the stated operational assumption until register-backed exclusivity arrives.

**Chaos scoreboard**:
The canonical measured record emitted by `plait chaos`: pinned heads, seed,
terminal digests, admitted/applied/suppressed counts, protocol redeliveries,
reordered-buffer drains, kills, anchor writes, refusal counts, substrate
envelope, corpus digest, and law citations. It is a measurement of one run,
never a proof.

**Commitment register**:
The per-work-digest authority with five actions: grant, renew, commit,
expire-steal, and observe. Its fencing token is the KV revision order; the
holder name is descriptive and never decides authority.

**Landed outcome**:
The unique terminal value stored with the fencing token that was current when
it committed. Once present, no later commit or steal is admitted. The claim is
bounded to one backing-stream incarnation, and the register enforces that bound:
the backing stream's creation time is pinned at open and re-asserted ahead of
every action, so a token minted under a destroyed bucket refuses
`incarnation-mismatch` rather than being honored by the reborn one.

**Incarnation**:
One life of a bucket's backing stream, named by the creation time the server
stamps on it. A delete-and-recreate mints a new incarnation and restarts the
revision order, which is why a fence never crosses one.

**Zombie**:
A dispossessed holder that completes after a steal. Its stale token is evidence
for refusal, regardless of holder identity.

**Observation**:
One holder-attributed pair `{holder, value}` — the only delta a cell admits.
Both components are wire values; the holder is attribution, never authority.

**Cell**:
The canonical, duplicate-free observation set stored at one key of the
`flb-fab-cell` bucket, merged by set union. Its identity is the digest of the
canonical set. Order is the declared canonical-bytes order, so every
TypeScript replica that verified the same set holds byte-identical state; the
Lean carrier's own comparator order is a different order and is never compared.

**Merge-write loop**:
Read the cell, join the delta locally, CAS at the observed revision, and on a
lost race re-read and re-merge. A read-back that already carries the delta is
success, whether this append landed or a rival's join subsumed it. Termination
is liveness and is never claimed; convergence of the value is F1. The loop is
one module — `casJoinLoop` — shared by every lattice carrier; what a carrier
supplies is its join, its empty state, its identity, its reads and writes, and
the absence it refuses when the attempt bound runs out.

**Merge discipline**:
The two steps of that loop a negative control may replace: `next`, the state a
delta writes over the current state, and `reconciled`, whether a read-back after
a failed CAS carries the delta. The pre-CAS guard is deliberately outside the
seam, so a control swaps exactly one behaviour and shares the rest by
construction.

**Local replica**:
One process's join of everything it has observed, mirrored from a cell by
polling. It is a lattice LOWER BOUND — "at least this", never "exactly this",
and never "not present anywhere" — so it answers no absence question, carries no
durability role, and a subscriber that misses intermediate values loses nothing
because the latest join absorbs every state it skipped.

**Payload seam**:
The catalog-internal read of a cataloged value's bytes, under
`Resolved.resolve` and verified there. Get-only, `Option`-returning, and
unverified by design: it exists so a control can lie beneath the one verify
door. It is not a blob store and application code never reaches for it.

**Blob store**:
The public content-addressed store of opaque byte payloads: put derives the
digest over the exact bytes handed in, get re-derives it over the bytes fetched
and refuses on disagreement, and presence is head-relative. Verification is
inside the service, absence is a `blob-absent` refusal, and a backend is a
`Layer` written against capabilities — never against a vendor's vocabulary.

**Resolved reference**:
A digest whose decode fetches the value and re-derives its identity before
returning it. Decoding requires the catalog and payload services from the
environment; encoding requires nothing and publishes nothing.

**Resolve memo**:
The digest-keyed cache over the one verified resolution seam. A hit is licensed
by content addressing, not by freshness: the value it returns was re-derived
against that digest when it was resolved, and a digest names one canonical byte
string forever. Successes never expire, failures are never recorded, keys are
digests and never anchors, and capacity is a memory budget — nothing it holds
or drops is identity-bearing.

**Publication**:
The explicit act of admitting a value to the catalog. No encode path performs
it; the write-through codec exists only for the emit path.

**Petname**:
One name inside a directory. Naming, never identity: nothing derives a digest
from a petname. The carrier is the model's own — the generated `KernelPetname`,
`{ text }` — and this package adds the law it needs to walk with: non-empty,
carrying no separator and no control character, and never `.` or `..`, because
the relative forms name a position rather than a value and a path this package
admits depends on its root and its names alone.

**Directory**:
The cataloged value a path walks through: the finite set of `(petname, digest)`
bindings, merged by set union, under a closed `{ v, kind }` header. The set is
the carrier, so one name bound to two digests is representable and resolution
refuses it rather than choosing. Canonical binding order is declared — the RFC
8785 canonical bytes of each binding, compared as bytes — so a folded
directory's digest is a name for the set. Byte order, not UTF-16 order: the two
disagree outside the BMP, and a directory fold written on another runtime has
to agree with this one.

**Path**:
An explicitly named root digest and a petname list read from it. Each hop
resolves the current digest, decodes a directory, and reads one binding out of
it; there is no current directory and no relative escape, so the answer is a
function of the root and the names. A lawful root is read at an anchor and
handed in — `Anchor.ts` owns that read, because it is head-relative and a walk
that performed one would be resolving against whatever is current. Under a fixed
root every verdict is permanent: unbound and ambiguous are structural, and the
only head-relative fact on the walk is whether a store holds a directory yet.

**Advisory**:
The standing of a KV watch feed. An arriving entry is a hint that state has
moved, joined like any other observation; the feed's silence, its ordering,
and its `isUpdate` flag carry no information. Nothing advisory may answer
"does this exist" or "has this stopped" — absence is read head-relative from
the store, never inferred from a feed.

**Writ**:
The canonical declaration of a read scope: a holder name and the set of declared
views that holder may image. The views are a set, so two writs naming the same
views carry one digest; the empty writ is the least scope and names none. The
holder is attribution, never authority, and a writ guards nothing outside the
seam that reads it.

**Session**:
Read-plane state — one consumer's position in a declared fold's partition plus
the writ scoping what it may image. A session names truth and never carries it:
no revision, no substrate handle, and no authority is in the value. Opening one
teaches the substrate nothing, and closing one is dropping it.

**View**:
The image of one anchored read under a declared, writ-scoped fold: the folded
state, the anchor coordinate it was read at, the view digest whose image it is,
and the writ digest that scoped it. The consumer position it started from rides
with it, so the interval a view covers is positions, never a clock.

**Consumer step**:
The coalgebra half stated as a signature — a session yields one view and the
session it becomes. The writ is judged on every step; admission is never cached
on a session, and a fold the writ does not name refuses instead of being served.

**Context program**:
The cataloged declaration of an ordered list of (selector, renderer) pairs,
each tagged with a volatility class. A declaration only — no assembly executor
exists, and nothing in this package assembles a context value.

**Connection machine**:
The lifecycle machine over the transcribed status vocabulary: an alphabet split
into transitions and readings, a table total over it, a terminal that absorbs,
and an initial position named by no event because establishment is not a status
event. Every state is named by the transition that enters it, so no state
carries a word the substrate never said.

**Connection reading**:
What folding one session's status facts through that machine answers: the state
those facts support, and the position of the last fact consumed. A state and a
position, never an age — the reading says what the lane supported by that
position and nothing about now. `null` state at `null` position is a session no
fact cited; `null` state at a real position is a session established and moved
nowhere since.

**Trace view**:
A read over the causal chain of facts reachable by digest from a root. The
connection reading is the first named one: it consumes facts, never spans, log
lines, or console output, which are evidence machinery and are never read back
into meaning.

**Landed fact**:
One fact as its partition carries it: which partition, its dense position in
that partition's own stream, the identity of the envelope that carried it, the
holder the envelope attributes it to, and the fact itself. The partition and the
position are ONE coordinate — a position alone names nothing, because two
partitions' positions come from two sequences and are not comparable. There is
no time on the value: the substrate stamps one on every stored message, and
reading it back as meaning would put a clock where the estate has positions.

**Bounded tail**:
The last N positions of each of a lane's partitions, oldest first within each
partition and never interleaved across them. N has a default and a ceiling, so
"read the lane" is a bounded request by construction; the admitted bound travels
with the answer, which is what lets a reader tell a short answer from a clipped
one. A tail acknowledges nothing and checkpoints nothing, so it may be taken
beside a deployed fold without moving the frontier that fold owns.

**Read face**:
The planes served over HTTP: bounded reads, one live change stream, and no
write. Every answer is the canonical bytes of one wire value — `v` and `kind`
naming it, the coordinates it was taken at, and exactly one member carrying the
plane read verbatim — so a digest over a served payload is the digest of the
value. A refusal's status is a fold over the two sorts; a request the route
table does not carry reaches no plane read and says instead why it was not
carried. The face authenticates nobody: attribution is never authority here
either, and whoever reaches the listener takes every read on it.

**Run trace**:
One program run as one landed fact: the writ it acted under, which of the three
ways it ended, the node it stopped at where it stopped, the door's own taught row
where the door refused it, and every walked step — the node, the admitted
sentence's canonical encoding, and what the carrier landed — verbatim and in
walked order, with each stopping arm keeping the prefix that stood. Unbounded
integers travel as exact decimal text, because a JSON number holds 2^53 and an
identity that rounds is a different identity. It is the MEANING half of a run:
the flux half is the verdict stream, live and unaddressed, and a trace is what
survives it. There is one trace per run and never one per step, and no clock on
one.

**Seat**:
One party this estate brought up because an admitted spawn said to: a scope, a
writ, and one traced run under it. The scope is a child of the consumer's, so a
seat's resources are the seat's and every live seat dies with its consumer. The
writ is the policy the spawn REQUESTED, so a seat cannot speak under a policy
its spawn did not name. A seat is not an operating-system process and not a
completion — those are later slices — and the kernel's spawn still lands
nothing: the language records that a speaker was minted, and a seat is the
harness's own testimony about what it did with that sentence.

**Seat name**:
The digest of the coordinate a spawn was sighted at: the landed run-trace fact
that carried it, and the program node it stood at. A name computed from what
landed rather than minted, so a redelivered trace, a second consumer, and a
restart all compute one name — which is what makes bringing the same seat up
twice absorbable instead of a race.

**Spawn sighting**:
One admitted spawn as a landed trace shows it: the seat it names, the trace and
node it stood at, and the parent and requested policies' identity labels written
exactly. A refused spawn is never sighted, because every arm of a run keeps the
prefix that STOOD and the refused node is not a step.

**Seat charter**:
What a consumer knows how to bring up under one policy: the writ, the holder its
facts are attributed to, the one program a seat runs, and that program's
execution-time supplies. A declaration of capability and never a guard — it
licenses no spawn, and its absence refuses nobody. A spawn whose requested
policy no charter names reaches a consumer that cannot name what it would run,
which is an absence and is reported as one.
