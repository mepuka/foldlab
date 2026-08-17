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
is liveness and is never claimed; convergence of the value is F1.

**Resolved reference**:
A digest whose decode fetches the value and re-derives its identity before
returning it. Decoding requires the catalog and payload services from the
environment; encoding requires nothing and publishes nothing.

**Publication**:
The explicit act of admitting a value to the catalog. No encode path performs
it; the write-through codec exists only for the emit path.

**Context program**:
The cataloged declaration of an ordered list of (selector, renderer) pairs,
each tagged with a volatility class. A declaration only — no assembly executor
exists, and nothing in this package assembles a context value.
