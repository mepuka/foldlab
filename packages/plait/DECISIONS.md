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

### T12. Keep the TypeScript substrate parity wall at the consuming package seam

Decided: the `@nats-io/* 3.4.0` error/PubAck parity witness runs as a Plait
package test against the existing pinned-server harness. Alternatives:
spawn Bun from the Go substrate package; add a root-only script outside the
consuming package. Why: Plait owns the exact TypeScript dependency family and the
package test is already a required battery stage, while the shared harness independently
verifies the server binary is the `go.mod` pin. **Load-bearing? yes** — moving the
wall away from the package that resolves the clients could let dependency drift
escape the witness.

### T13. The parity wall pins wire-indistinguishability; classification stays a convention

Decided: assert that the three wrong-last-sequence refusals (journal CAS,
duplicate create, stale update) present one identical shape across every
distinguishing-capable `JetStreamApiError` field — subclass identity, name,
status, code, state-masked message and wire `ApiError`, cause — and bind each
captured refusal to its operation by the exact journal state its description
reports in the deterministic fixture. Classification by operation context is
asserted as a client-side convention layered on that wire, never derived from
it. Alternatives: derive the classification from the refusal (unreachable —
DEV-704 proved the substrate emits no distinguishing signal, which is itself
the fact to pin); keep a label-swap control over the mapping switch (it tests
the switch, not the wire). Why: the only drift this wall can catch is
`@nats-io/*` starting to distinguish the refusals, and the pinned shape reds
exactly then, while the state pin keeps one capture's refusal from standing
in for another's. The fixture seeds one extra journal frame so the three
reported states are pairwise distinct — without that, two captures share a
state and the pin binds only the odd one out — and the compared field set is
itself pinned by a guard whose committed field-drop mutant
(`negative-controls/SubstrateParity.field-drop.mutant.ts`) reds the battery
if the guard weakens. **Load-bearing? yes** — the ledger row's "context
classification" claim is scoped by this pin.

### T14. The cell carrier is the model's carrier, not a parametric lattice

Decided: `Cell.ts` ships exactly one carrier — the canonical, duplicate-free
set of holder-attributed observations `{holder, value}` merged by union — the
carrier F1 is stated over. `merge` takes a DELTA, never a rewrite function, so
a non-join update is unrepresentable rather than discouraged; the
declared-rights table's "no ordering, locking, or conflict-resolution parameter
anywhere on the monotone plane" becomes a type, not a convention.
Alternatives: a parametric join-semilattice `Cells<A>` taking a join function
(one abstraction for every future carrier); `Cells.update(key, f)` matching
part 1 §8.3's sketch literally. Why: grill item 2 ruled the F12 directory a
SEPARATE carrier with its own ACI package rather than a `Cell`
generalization, precisely to avoid reopening landed F1 statements — shipping
the generalization here would front-run that ruling from the runtime side; and
an arbitrary `f` admits last-writer-wins, the merge semantics §6.3 refuses by
name. **Load-bearing? yes** — the F1 replay is evidence for THIS carrier, and
a generalization would need its own model statement before it could claim
anything.

### T15. Canonical order is declared canonical-bytes order; the claim is set equality

Decided: observations sort by their RFC 8785 canonical bytes and deduplicate on
the same key, so every TypeScript replica that verified the same set holds
byte-identical state. The wall compares the TS cell's state digest against the
digest of the model verdict's observation set canonicalized by the SAME rule —
i.e. it asserts set equality, which is what F1 states and which no comparator
choice can move. Agreement between this order and the Lean carrier's
`compareLex (compareOn ·.1) (compareOn ·.2)` is NOT claimed and NOT tested (the
two disagree on `(2,·)` vs `(10,·)`, since one compares numbers and the other
their canonical text). Alternatives: restate the Lean comparator in TypeScript
and claim byte-level cross-language agreement (a second canonicalizer in all
but name, and a claim with no consumer); compare unordered arrays with a set
helper (loses the byte-identity property the fabric's coherence clause is
about). **Load-bearing? yes** — it is the exact scope of the wall's convergence
claim, and a cross-language cell byte wall would need this decision reopened.

### T16. A cell read-back that carries the delta is success, whether or not this append landed

Decided: the cell adapter reconciles a failed CAS by read-back (seam rule 1),
but its test is SUBSUMPTION — `join(readBack, delta) = readBack` — not the
register's byte-equality against one intended record. If the read-back does not
carry the delta, the loop re-reads and re-merges; after
`CELL_MERGE_ATTEMPTS` (8) it reports `cell-update-contended` as ABSENCE, the
only retryable sort, since a repeated delta is idempotent and adds nothing
twice. Alternatives: byte-compare the intended merged record (a rival's larger
state would be misread as a genuine conflict and re-merged pointlessly, or
worse, refused); retry forever (an unbounded loop is a liveness promise this
package never makes). Why: for a lattice, "my delta landed" and "someone
else's join subsumed my delta" are indistinguishable AND equally correct — that
indistinguishability is what F1 buys, so the reconciliation should read it
rather than fight it. **Load-bearing? yes** — this is the concrete meaning of
"a lost CAS race re-reads and re-merges — convergent by F1", and the
deterministic hold-proxy test is its evidence.

### T17. Cell row isolation is a distinct key on one server, not a fresh incarnation per row

Decided: the F1/F2 replay runs every row on one `nats-server` under distinct
cell keys. Alternatives: the register wall's shape — one fresh server per row.
Why: the register wall needs a fresh backing-stream incarnation per row because
it asserts token NUMERICS against the model's counter, an artifact of that
envelope (T0); this wall asserts only cell state bytes, which no revision order
can move, so a shared incarnation neither helps nor harms the claim and costs
seconds instead of minutes. Bucket destroy+recreate remains banned as an
isolation primitive either way (seam rule 7). **Load-bearing? no** — the
isolation mechanism; the claim is the state comparison.

### T18. Verify-on-read lives in `Resolved.resolve`, not inside the store services

Decided: `Catalog.get` returns what it holds, unverified; the single
re-derivation seam is `Resolved.resolve`, which every `ResolvedOf` decode runs
through. Alternatives: verify inside the live catalog implementation (defence
in depth). Why: a service that polices its own answers cannot be made to lie,
and the tampered-store control — the one that proves re-derivation is
unskippable — is exactly a layer that lies. Verification outside the service
keeps the control writable and keeps one place where identity is checked.
**Load-bearing? yes** — moving the check inside the service would silently
delete the control's meaning while leaving it green.

### T19. Neither store ships a durable layer, and both say so in their type's documentation

Decided: `Catalog.layer` is a process-local map and `Blobs.layer` answers every
lookup with absence; both carry the bound in module and member JSDoc, in
`CONTEXT.md`, and in the README. Alternatives: a KV-backed catalog over a new
bucket (`flb-fab-cat` is not in the ruled subject grammar — inventing one is
new physics, which is a finding, not an improvisation); an object-store-backed
`Blobs` (grill item 10 requires a probe suite at
`@nats-io/obj@3.4.0` + server 2.14.4 before any object-store surface ships, and
a chunked read path that trusted store-side digests would be a verify-on-read
hole). Why: the durable catalog authority is a venue's, reached through the
request plane that `Venues.ts` will own; until that module exists the honest
layer is the one whose bound is stated. **Load-bearing? yes** — every claim in
this slice is scoped by "process-local catalog, absent payload store".

### T20. The schema-issue bridge is internal; `decodeRefusing` is its only public door

Decided: `refusalIssue`, `refuse`, `refusalOfIssue`, and the classification
`refusalOf` live in `src/internal/refusals.ts`; `Refusal.ts` exports only
`decodeRefusing`, whose signature speaks `Refusal` on both sides. Measured
reason, not preference: exporting any `SchemaIssue.Issue`-typed signature from
the barrel makes the supplemental type-level walk (T8) diverge with `TS2589`
at `test/PublicEffects.typecheck.ts` — `SchemaIssue.Issue` is a deep recursive
union of classes whose members re-enter the walk faster than its eight-step
cutoff bounds it. Verified by removing the four `export` keywords: the two
`TS2589` errors disappear and nothing else moves. Alternatives: raise the
walk's cutoff (it exists to prevent exactly this divergence); add
`SchemaIssue` to the vendor-owned subtraction list (a blanket suppression of a
type the package genuinely uses at a seam). Why: the architecture record homes
`decodeRefusing` in `Refusal.ts` and calls it the single lifting seam — that is
satisfied exactly, and quarantining the issue plumbing is the same discipline
that quarantines NATS. **Load-bearing? yes** — the public-surface claim's
mechanism reds if the bridge is re-exported, and the reason must be recorded so
a later seat does not "fix" the walk instead.

### T21. The closed refusal-kind enumeration grows with this slice's mint sites

Decided: `StructuralRefusalKind` gains four literals —
`malformed-value` (the one parse-boundary classification),
`invalid-cell-key`, `malformed-cell-state`, and `cell-substrate-shape` — and
the refusal-repair wall gains one demonstrated trigger per kind, all through
public surfaces. Two absence kinds ride the open absence namespace and need no
enumeration change: `cataloged-value-absent` and `cell-update-contended`. The
resolve incoherence reuses the shipped `digest-mismatch` rather than minting a
synonym. This is the only edit to a shipped spine surface in the slice, and it
is reported as such. Alternatives: reuse register kinds for cell laws (a cell
is not a register, and the generated error catalogue would inherit the lie);
leave the enumeration short and let the set-equality wall red (the enumeration's
own contract is "every structural kind the package can mint"). Why: T10 already
ruled this the enumeration's growth path when the register slice landed eight
kinds at once, and the architecture record homes `decodeRefusing` — and hence
its classification kind — in this module. **Load-bearing? yes** — the closure
claim is only true at the full set, and the trigger wall enforces it.

### T22. `ContextProgram` ships shapes and an order, and no executor

Decided: the module exports the volatility classes with their declared rank,
the CLOSED selector union, the renderer reference, the segment, the program,
`declare` (constrained decode plus digest), and `orderedSegments` (volatility
rank, then declaration order as the stated within-class tie-break). It exports
no assembly, no context value, and no memo, and no refusal in it cites F7.
Alternatives: ship a provisional assembler behind a flag (an un-walled
derivation is exactly what the byte-identical reassembly wall exists to
forbid); leave the module out entirely until M2 (the shapes are what E9 and
E11 queue behind, and the split ruling dispatched them now). Why: the closed
selector union already buys the safety property worth having today — an
ambient or clock-reading selector is unrepresentable — while the
declaration-time refusal that CITES F7 belongs to the slice that can name the
theorem. **Load-bearing? yes** — the boundary between what this slice claims
and what the assembly slice will claim is drawn here.
