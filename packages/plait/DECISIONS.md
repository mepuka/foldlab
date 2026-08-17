# packages/plait — decisions the spine spec did not fix

Task-local placeholders per the numbering rule in `proto/DECISIONS.md`;
repository D-numbers are assigned at merge.

### T0. DEV-711 register mapping and replay wall

Decided: `Register.ts` owns the public `Registers` service and
`src/internal/registers.ts` owns NATS KV. The token is the key's revision-CAS
order. Commit stores the lease token in its terminal payload even though the
storing PUT advances the backing stream revision; observe reports the landed
lease token. `flb-fab-reg` is file-backed R=1, history 64, TTL 0, max bytes -1.
Every generated row audits its history for at most one landing and no zombie.
Row isolation is one fresh server — a fresh backing-stream incarnation — per
row, the Go wall's shape; bucket destroy+recreate is never an isolation
primitive (it is the seam-rule-7 incarnation edge, and building on it made
the round-1 wall nondeterministic). The wall's numeric token equality with
the model counter is an artifact of that envelope (one key, fresh server);
an interleaved-writer wall must assert order-isomorphism instead. Failed CAS
appends are classified by operation context plus code and reconciled by
read-back comparison, never by expecting a duplicate PubAck; transport
causes are preserved and never wear fencing laws. The hard-kill wall reuses
`zombie-stale-commit`: TS grants, Go steals, the TS zombie refuses, and Go
lands the current-token outcome. The runtime mutant is the real commit path
with its token comparison deleted, run against the live bucket, killed by
the `zombie-stale-commit` vector with its executed trace committed
(`negative-controls/stale-token-mutant.trace.json`); the Lean gate kills
hand-edited corpus rows by byte comparison. **Load-bearing? yes** — this
is the concrete F5-to-KV mapping and its executable wall.

### T1. Build the pinned upstream NATS server command from the Go module lock

Decided: the round-trip harness builds `github.com/nats-io/nats-server/v2`
from `go/go.mod` into a temporary directory, then launches that binary with
JetStream enabled, one replica, and a file-backed temporary store.
Alternatives: download a release archive during every test; check a binary
into the repository; wrap the server library in a new local command. Why: the
repository already pins and verifies `v2.14.4` in its Go module, so building
the upstream command uses an existing checksum-locked source without adding a
binary artifact or a second launcher implementation. **Load-bearing? yes** —
the round trip is evidence only for the exact server version it launches.

### T2. The NATS payload is the canonical envelope bytes

Decided: publish the canonical UTF-8 envelope bytes directly and put the same
envelope digest in `Nats-Msg-Id`; consumers constrained-decode those bytes and
re-derive the digest. Alternatives: an outer JSON frame; compression before
publish. Why: the envelope is already a complete data boundary, and an outer
transport frame would create a second representation with no slice-0 consumer.
Compression remains transport-only and is exercised as a killed wall mutant.
**Load-bearing? no** — a later transport dress may change without moving
identity, provided its decoder yields the same canonical envelope bytes.

### T3. Reach the canonicalizer through the workspace package specifier

Decided: declare `@foldlab/core: workspace:*` and import
`@foldlab/core/jcs`. Alternatives: a relative reach into
`../../core/src/jcs.js`; copying the canonicalizer. Why: the package cannot run
without the estate-owned RFC 8785 seam, and the workspace dependency plus
exports map makes that fact visible to tooling without widening G7's external
dependency ceiling. **Load-bearing? yes** — bypassing or hiding this seam makes
the package's identity authority inaccurate.

### T4. Verified reads use an ephemeral ordered JetStream consumer

Decided: `FabricClient.subscribe` creates a subject-filtered ordered consumer
with `DeliverPolicy.All`, adapts its synchronous callback through
`Stream.callback`, and deletes it with the surrounding scope. Alternatives: a
core NATS interest subscription; a named durable consumer. Why: the round trip
must read the frames stored by the exact file-backed R=1 stream, including when
the publisher has exited, while slice 0 owns no durable cursor or resumption
policy. The callback adapter lets interruption close an idle message pump.
**Load-bearing? yes** — core interest delivery would leave storage and replica
shape outside the evidence path.

### T5. Pin the message-id duplicate window explicitly

Decided: the slice-0 stream declares a two-minute (`120_000_000_000` ns)
duplicate window and the shape check requires it. Alternatives: inherit the
server default; expose a caller option. Why: `PublishedEnvelope.duplicate` is a
public consequence of digest-as-message-id, so its time bound must not move
silently with a server default. **Load-bearing? yes** — the window defines the
bounded interval over which a repeated envelope is one stored frame.

### T6. The incarnation pin at register-open is deferred, recorded

Decided: the register does NOT yet record the backing stream's creation time
at open or refuse on its mismatch. Every register claim therefore carries the
bound "within a fixed backing-stream incarnation; administrative lifecycle
mutation is outside the credential guard" (module JSDoc, both CONTEXT files,
both READMEs, and the proposed ledger row). Alternatives: a per-operation
stream-info comparison (one extra round trip per action); external pin
storage (new machinery no consumer asked for); epoch-bearing tokens (ruled
OUT for v0 by the seam-rule-7 ruling). Why: a pin held only inside the
bucket dies with the bucket, so a real guard needs either per-operation
verification cost or cross-process state — both are un-grilled machinery;
the ruling explicitly admits a recorded deferral, and the DEV-716 ACL suite
(application credentials cannot delete or recreate streams and buckets) is
the other half of the guard. **Load-bearing? yes** — until the pin or the
ACL suite lands, the bound sentence is the only fence around lifecycle
mutation.

### T7. Make the emitted declaration walk the public-surface authority for this package's own declarations

Decided: the public-effect gate emits the package declarations, then one pinned
TypeScript compiler walk traverses public values, members authored in this
package's `src`, prototypes, `Context.Service` shapes, string/number indices,
and construct results. It asks the compiler for every call and construct
signature, checks each resolved carrier error against `Refusal`, and byte-diffs
a generated signature manifest that names the authority. The gate also refuses
an empty manifest, even if the committed manifest were emptied with it. The
declaration walk's authorship filter is the emitted declaration root — this
package's `src` alone — so members authored in a sibling workspace package and
surfaced through the barrel are OUTSIDE its reach; for exactly that class the
type-level walk is retained as LOAD-BEARING (its plant reddens where the
declaration walk is silent), and the intersection is recorded here rather than
left implicit (repaired 2026-08-17, DEV-710 round-3 review: the earlier
"one walk owns the whole consumer-reachable surface" absolute was unlicensed
for externally-authored members). Alternatives: widen the declaration emit to
the workspace (heavier emit, cross-package declaration coupling); continue
using `ReturnType`, which resolves only the final signature; a count-bounded
overload inference ladder. Why: TypeScript exposes no general type-level
reflection over an overload set, and the two-walk split with a RECORDED
division of authority keeps every surface class under a named mechanism.
**Load-bearing? yes** — `retryAbsence`, service instance methods, and
construct-only results are checked by the declaration walk; workspace-authored
members surfaced through the barrel are checked by the type-level walk; no
surface class rests on an unrecorded intersection.

### T8. Bound declaration traversal at eight measured edges

Decided: the load-bearing declaration walk inspects a carrier reached in at
most eight recursive transitions from an exported value. Member, prototype,
service-shape, and index traversal each spend one edge; a call or construct
return spends one edge. The committed ladder refuses
`atBound.n1.n2.n3.n4.n5.load#call[1]` at edge eight and admits the otherwise
identical branch with one extra `n6` member at edge nine. The supplemental
type-level walk retains its own eight-step cutoff, traverses plain classes, and
subtracts imported `Schema.Top` protocol members before package-authored Schema
extensions. Alternatives: leave either recursion unbounded; suppress every
`ast` carrier; suppress every constructor. The review's removal test at
`2853e48` was: both blanket arms removed → `TS2589`; `ast` only → clean;
constructor only → clean. Why: explicit measured counters cover the shipped
surface without expanding cyclic vendor protocols indefinitely.
**Load-bearing? yes** — the declaration bound sizes the claim; the type-level
cutoff prevents compiler divergence and bounds the externally-authored class
that walk covers (T7).

### T9. Name the remaining public-surface exclusions from controls

Decided: the Bounds text explicitly excludes `Effect<Effect<A, E>, Refusal>`,
a fallible `Layer` returned within an Effect success, fallible carriers inside
collection elements, paths requiring a ninth traversal edge, vendor-owned
members such as the `Schema.Top` protocol, and — for the declaration walk
alone — members authored outside this package's `src`, which the type-level
walk covers as its recorded load-bearing class (T7). A direct fallible
`Stream` returned
within an Effect success is covered and therefore is not an exclusion. The
committed bounds control carries all four nested shapes; only its direct Stream
branch appears in the refusal trace. Alternatives: infer exclusions from the
walker implementation; use the earlier blanket phrase “fallible carriers in an
Effect success.” Why: that blanket was false for Stream, while named measured
shapes keep the ledger claim and its controls in the same register.
**Load-bearing? yes** — these exclusions are the exact ceiling on the proposed
public-surface claim.

### T10. The closed kind enumeration spans every register structural law

Decided: rebasing onto the merged register slice, `StructuralRefusalKind`
gains all eight kinds the register mints — `invalid-register-key`,
`malformed-register-state`, `register-absent`, `register-substrate-shape`,
`duplicate-grant`, `outcome-already-landed`, `stale-register-token`,
`concurrent-register-update` — not only the two the dispatch named. The
register's refusal helper now takes the closed kind union and a required
taught `next`, so every mint site names its repair; the stale teaching is
worded per operation (a superseded lease for renew, a superseded round for
commit) while the kind stays one. Alternatives: admit only the dispatch's
two kinds and leave the helper stringly typed; re-map the other six onto
existing kinds. Why: the enumeration's own contract is "every structural
kind the package can mint", the narrowed helper makes each literal site a
compile-time member check, and renaming merged register laws is not a
hygiene branch's act. The trigger wall's set equality then demands one
demonstrated trigger per kind, which the refusal-repair test now carries.
**Load-bearing? yes** — the closure claim is only true at the full set.

### T11. The conflict kind is triggered by a held CAS append, not a timed race

Decided: `concurrent-register-update` is demonstrated with a frame-aligned
TCP tap between the register service and the live server: the tap parses
client protocol commands, withholds the expire-steal's `HPUB` into the
bucket's subject space (matched by command-line prefix only — the
direct-get API embeds the same subject in its request), a rival revision
lands over a second connection and is acknowledged, and only then is the
held append released to fail its CAS and reconcile by read-back.
Alternatives: race two stealers and hope; sleep between read and CAS;
fault-inject the KV client with a module mock. Why: every register
operation re-reads before it CASes, so no sequential out-of-band mutation
can reach a failed append — the conflict window exists only between one
operation's read and its write, and a barrier-ordered hold is the one
deterministic way through it against the real substrate.
**Load-bearing? no** — the trigger's mechanism; the minted refusal and its
law are asserted by the wall itself.
