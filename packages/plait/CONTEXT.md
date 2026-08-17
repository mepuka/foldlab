# packages/plait — module vocabulary

Local terms hidden behind the seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

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
commutative algebra carries a runtime witness earned by at least 32 generated
identity, associativity, and commutativity cases; an asserted TypeScript cast
does not earn it.

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
