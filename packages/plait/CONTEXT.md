# packages/plait — module vocabulary

Local terms hidden behind the seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

**Truth**:
The vocabulary every sentence speaks.

**Kernel**:
The language: corpus, door, programs, and wire grammar.

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
cross the seam as a blob reference.

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
and asserted TypeScript casts do not earn it.

**Declared fold**:
A lane, algebra, and per-event contribution under one digest. Its step is
derived as `combine(state, contribution(event))`, so step/algebra compatibility
holds by construction. More than one partition requires the earned
commutative witness at both the type and runtime doors.

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
it committed. Once present, no later commit or steal is admitted within a
fixed backing-stream incarnation; administrative lifecycle mutation is
outside the credential guard.

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
