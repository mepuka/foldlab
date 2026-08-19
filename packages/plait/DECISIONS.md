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

SUPERSEDED BY: task DEV-736's T1 — the callback adapter this entry chose is
replaced by the client's own pulled iterator, which is the bounded form that
carries the one property T4 was decided on.

Decided: `FabricClient.subscribe` creates a subject-filtered ordered consumer
with `DeliverPolicy.All`, adapts its synchronous callback through
`Stream.callback`, and deletes it with the surrounding scope. Alternatives: a
core NATS interest subscription; a named durable consumer. Why: the round trip
must read the frames stored by the exact file-backed R=1 stream, including when
the publisher has exited, while slice 0 owns no durable cursor or resumption
policy. The callback adapter lets interruption close an idle message pump.
**Load-bearing? yes** — core interest delivery would leave storage and replica
shape outside the evidence path.

Amended 2026-08-18 (DEV-736). This entry chose the callback adapter on the
strength of one property — interruption closes an idle pump — and never stated
its cost. The cost is measured and load-bearing: the pinned client's callback
is synchronous by contract, so the adapter's only offer is `Queue.offerUnsafe`,
which cannot suspend, so the pump admits no client-side bound that does not
lose messages (task DEV-736, T0).

Superseded the same day, once the operator ruled route (b) and the bounded
form landed. The adapter is gone; the ordered ephemeral consumer, the
`DeliverPolicy.All` read and the scope-owned delete all stand. Only the
adaptation moved, and the one property this entry was decided on moved with
it (DEV-736 T1).

### T5. Pin the message-id duplicate window explicitly

SUPERSEDED BY: task DEV-736's T2 — the window is per STREAM, and this package
now runs two stream families, so one scope sentence no longer covers the
duplicate bit.

Decided: the slice-0 stream declares a two-minute (`120_000_000_000` ns)
duplicate window and the shape check requires it. Alternatives: inherit the
server default; expose a caller option. Why: `PublishedEnvelope.duplicate` is a
public consequence of digest-as-message-id, so its time bound must not move
silently with a server default. **Load-bearing? yes** — the window defines the
bounded interval over which a repeated envelope is one stored frame.

### T6. The incarnation pin at register-open is deferred, recorded

**DISCHARGED by Task DEV-779** (this file, "Task DEV-779 — the register
incarnation pin"). The pin is built: the register records the backing
stream's creation time at open and re-asserts it ahead of every action; the
alternative this entry priced — a per-operation stream-info comparison, one
extra round trip per action — is the one that landed, at a measured 0.109ms
p50 against the pinned local server. The bound sentences this entry planted
are replaced there: enforced at the register, argued exempt at the cell and
anchor stores. The entry below is the record as it stood, kept unedited.

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
identical branch with one extra `n6` member at edge nine. The load-bearing
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

## Task DEV-725 — orchestration mapping, walk guard, register teaching

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge.

### T14. DEV-725 orchestration mapping — home, scope of runnable claims, and the untouched list

Decided: the mapping document lands at `packages/plait/FOR-WORKING-AGENTS.md`,
beside `QUICKSTART.md` and `README.md`, and adopts the quickstart's honesty
labels verbatim (RUNS TODAY / LANDS WITH E-n / NEEDS A DECISION) so the two
pages read as one ladder. Alternatives: `docs/explanation/` (Diataxis-correct
for an understanding-oriented page, but this one is task-oriented and its
sibling quickstart already lives in the package); `docs/` root (that tree is
repository-wide operations, not Plait product docs); a design record under
`docs/design/` (wrong audience — design records are for the estate, this page
is for an adopting developer). Why: discoverability beside the page it extends,
and one home for Plait product prose.

Runnable claims are scoped to what the merged surface can execute: the
tool-call sections use `Registers` plus `Digest` with a hand-rolled declaration
value standing in for the unbuilt `Capability.declare`, and say so in the
sample's own comment. No E6/E9/E12 shape is presented as runnable. Every other
code block is a sketch quoted from a design record and labelled non-compiling.
The sample scripts were run from an untracked `packages/plait/quickstart/`
scratch directory and are deliberately NOT committed: DEV-715 owns the gated
quickstart-samples lane, and landing a second, ungated set of sample files
would collide with it and create exactly the drift this package walls against
everywhere else. Consequence, stated: the console output quoted in the document
is not currently regenerated by any gate. Folding these samples into DEV-715's
doctest harness is the offered follow-up.

Untouched deliberately: `VERIFICATION.md` (ruling G6 — rows land with slices);
`QUICKSTART.md` (finding F-5 reports its two stale sentences rather than
repairing them, per findings-before-fixes); the `unstable/codegen` pair, which
this run demotes to a proposal in the document's addendum. **Load-bearing? no**
— this decision fixes a document's home and evidence scope, and reverses at the
cost of one `git mv`.

### T15. Guard the type-level walk's quantifier and control its cross-package class

Decided: `PublicEffectErrorConformance` asserts over `BoundSurfaceViolations`,
which puts two quantifier laws ahead of the carrier walk — refuse an empty
surface by name, then require the walked surface to carry the whole barrel,
compared against a SECOND, independent resolution of `../src/index.js`. The
quantifier is named once at the assertion, so the DEV-722 mutation (narrowing it
to `Pick<PublicApi, never>`, which left the whole battery green over a live
cross-package violation) reddens the very assertion it weakened. Three committed
controls carry the pair: `PublicEffects.empty-quantifier` drops refuse-empty,
`PublicEffects.narrowed-quantifier` drops the bound witness alone (inhabited,
still not the barrel), and `PublicEffects.core-probe` plants a fallible member
authored in `packages/core/negative-controls/plait-public-surface-probe.ts` —
one workspace package over — surfaced through the whole real barrel, which is
T7's externally-authored class with an executable witness instead of a described
one. Alternatives: assert inhabitation only (a one-key `Pick` passes it);
compare the quantifier against `PublicApi` itself (a narrowed alias then
compares to itself, vacuous in the same way); keep the plant inside plait's own
`negative-controls/` (authored under this package's emit root, so it witnesses
the wrong class); plant it in `packages/core/src` (that package's exports map is
`./*` → `./src/*.ts`, so a deliberately unlawful member would enter a seam
package's public surface). The eight synthetic-barrel controls keep asserting
over the unbounded `PublicSurfaceViolations`: their planted APIs are not the
barrel, and routing them through the guard would refute them on the quantifier
law instead of the law each one drops. Why: a walk that quantifies over nothing
reports nothing, and the type-level walk is load-bearing for a class no other
mechanism reaches (T7) — so its quantifier needs the same refuse-empty-plus-bound-witness
shape the declaration gate already has. **Load-bearing? yes** — until the
guard and the cross-package control existed, the load-bearing half of T7's
split had no executable evidence that it was still bound to the real surface.
Residual, stated: the guard binds what the assertion quantifies over, not which
walk the assertion calls — rewriting that line to call `PublicSurfaceViolations`
directly is refused by review, not by the compiler.

### T16. Teach the register's transport refusal instead of scoping the claim

Decided: `transportRefusal` ships a taught `next` — reconnect to the pinned
server and observe the register's landed holder, token, and outcome before
retrying — so the integration commit's sentence, "no register refusal leaves
without naming its repair", is true of the shipped code rather than of its
structural half. Alternatives: scope the sentence to structural refusals (the
absence sort is then the one register refusal a caller must improvise against);
teach a bare retry (it would contradict seam rule 2 — a transport refusal leaves
the operation's outcome ambiguous, and this adapter reconciles ambiguity by
read-back, never by a retried write on faith). **Load-bearing? no** — the
teaching states the repair the adapter already implements; no law moves with it.

### T17. Make each declared lane partition its own dense successor domain

Decided: one exact file-backed R=1 stream is created for every declared
`(lane, partition)`, with no count, byte, or age eviction and a pinned two-minute
message-id window. The stream name carries the full lane-declaration digest;
the subject carries only the ruled short handle and partition. The former
commons stream is re-scoped to fact/node control traffic, and advisory
`FabricClient.subscribe` discovers whichever stream owns its exact subject.
Alternatives: retain one wildcard evidence stream and use its sparse global
sequence; invent an application ordinal; change the successor model. Why: the
ratified DEV712-POS-1 disposition makes the partition stream's dense sequence
identical to F2b's position, so no filtered consumer can wait forever on a
sequence belonging to another lane. **Load-bearing? yes** — this topology makes
the transport coordinate satisfy the successor premise.

### T18. Derive fold steps and derive ACI cases before branding

Decided: `Fold.declare` accepts only a per-event contribution and derives
`step(state,event) = algebra.combine(state, contribution.apply(event))`.
`Algebra.commutative` accepts a seeded arbitrary and equality, draws its seed
from the algebra digest, derives at least 32 distinct triples itself, and runs
left identity, right identity, associativity, and commutativity before attaching
its private runtime witness. A generator that cannot yield 32 distinct triples
is refused; callers cannot enumerate a degenerate passing suite. `fast-check`
remains a test-only dependency. `Fold.declare` requires the witness at the type
door and checks it again at runtime when partitions exceed one. Alternatives:
accept caller-enumerated cases; accept an independent step and property-test
compatibility; expose an assertion-style brand; rely on TypeScript alone. Why:
derivation makes both the sample and the step/algebra bridge the declaration
door's work, while the runtime witness refuses casts and failed law suites.
**Load-bearing? yes** — this is the F4 license and its compatibility bridge.

### T19. Store content-addressed state before plain anchor revision CAS

Decided: `flb-fab-anchor` is file-backed R=1, history 64, TTL 0, max bytes -1.
Each fold-partition key stores the closed `(floor,stateDigest,head)` fact;
canonical state bytes live at a content-addressed state key in the same bucket
and are written before the anchor update. A lost `update(expectedRevision)` is
`lost-anchor-cas`, a structural fatal detach; the pump never re-reads and
continues. Alternatives: inline state in the anchor; merge concurrent anchors;
reread a winning anchor and keep consuming. Why: anchor identity remains the
ruled triple, state resumes by digest, and a revision conflict is evidence that
the one-live-pump operational assumption has failed. **Load-bearing? yes** —
ack may follow only a landed covering CAS.

CAS adoption has three distinct disciplines: joins retry through the join loop
(F1 idempotence discharges ambiguity); registers reconcile by read-back (I2
once-only); anchors never retry — a lost anchor CAS is a fatal detach under the
single-live-pump discipline, and routing an anchor through either loop is
refused.

### T20. Bound flow control at 256 and redeliver unacked work after one second

Decided: each durable explicit-ack pull consumer has
`max_ack_pending = 256`; the in-memory position map refuses if it exceeds that
same bound. Pull batch size is capped by `checkpointEvery`, and the live pump
persists every non-empty contiguous drain before acknowledging its covered
messages. `ack_wait` is one second so a crashed local pump is promptly
redelivered in the mandatory wall. Alternatives: 30-second server-style wait;
an unbounded map; checkpoint-only tail state. Why: these are observable flow
control choices with no correctness stake, and the shorter wait keeps the real
hard-kill gate bounded without manufacturing a retry. **Load-bearing? no** —
the successor discipline and anchor-before-ack order carry correctness; these
numbers carry resource and test latency bounds.

The Effect-side queue stays unbounded because every bounded `Stream.callback`
strategy drops under a synchronous unsafe offer, and occupancy is bounded by
`max_ack_pending` through the ack-after-anchor discipline. The
`fold-buffer-overflow` refusal is retained as a loud invariant guard but is
untriggerable inside the pinned consumer shape: at most 256 unacknowledged
deliveries can enter the position map, applied and stale positions leave before
the next server delivery, and a 257-entry buffer would first require the server
to violate `max_ack_pending = 256`. **Load-bearing? no** — the consumer-shape
gate and server bound carry the resource invariant.

### T21. Use TerminateProcess/SIGKILL and consumer NAK for the two chaos arms

Decided: the kill wall runs the production pump in a child, waits for a partial
anchor marker, invokes signal 9 (Bun maps it to hard process termination on
Windows), restarts, and compares every partition state digest with an
uninterrupted arm. The duplication wall collects a pinned tranche on a
harness-owned durable consumer, NAKs each real message twice in a seeded
reordered sequence, and feeds only those received records to the successor
discipline; no republish occurs. `plait chaos` reuses those implementations,
re-admits the exported lane/algebra/fold through their declaration doors,
emits canonical measured facts and citations, and marks partition reorder
`n/a` because v0 defers it. Alternatives: graceful fiber interruption; publish
copies; trust a shallow module shape; a canned fold; claim the scoreboard proves
the runtime. Why: only hard termination tests crash-indifference, a republish
creates a new position, and the CLI is a measurement over the developer's
certified declaration rather than a proof.

The severable chaos-CLI rider is accepted and absorbed by this slice: the
mandatory gates already built every mechanism it re-dresses, so extraction
would add churn without narrowing the implementation. No separate rider ticket
remains.

**Load-bearing? yes** — these are the mandatory substrate-level F3/F2b walls.

### T22. Consume every row in the declared E4 families

Decided: the runtime wall consumes every row whose header family is one of F2,
F2b, F3, F3-F2b, or F4, and derives its checked count from the corpus header.
Every name inside those families must route through the runtime successor
machine; an unknown name there is fatal and zero skips are permitted. Four exact
exclusion names retain their ruled homes: F1/Cell, alphabet admission/slice 0,
and both F9/action-plane rows. Other families are reported as unfamiliar and do
not fail this slice merely because the model grew. Alternatives: pin whole-file
row totals; silently consume whatever rows exist; copy the model into
TypeScript. Why: family coverage makes a new in-scope row red without making an
unrelated model wave manufacture a failure, while missing exclusions remain
fatal sequencing drift. **Load-bearing? yes** — this is the R0/R1 wall between
the proved model and the unproved runtime.

### T17. DEV-725 round 2 — the quickstart repair's blast radius

Decided: the coordinator's dispatch named two stale surfaces (the frontier
table's minute 8-10 row and the closing section's F5 sentence); this repair reads
"surface" as claim rather than as line, so it also moves the four other places
the same two claims are asserted — the epic-marking paragraph under the frontier
table, the glossary's register row, the `## 8-10` section's own
"Not runnable yet" lead, and that section's "F5 is not proved yet — not even at
the model level" paragraph, which was the strongest instance of the error.
Alternatives: edit exactly the two named lines (leaves "not proved at all" and
"not runnable yet" standing three hundred lines apart from their own correction —
an internally contradictory page, which is worse than the stale one); rewrite the
whole example ladder (outside the dispatch, and E4's Example 2 is still honestly
unbuilt). Why: the two surfaces ARE the two claims, and a claim asserted in six
places is repaired in six or not at all.

Example 3's transcript is real output regenerated for this commit against a
fresh file-backed store, not carried over from the round-1 run: the page's whole
discipline is that a runnable label means someone ran it at that tree. The
design-record sketch is kept below the transcript and relabelled — it does NOT
compile against the merged API, whose `hold` takes `(work, holder, use)`
positionally rather than the sketch's record argument, and saying so is more
useful to a reader than deleting the sketch. The bucket-global token note is
added because a reader who sees `token=1` on a fresh store and `token=6` on a
used one will otherwise conclude the register is broken.

Two edits land outside `QUICKSTART.md` and are deliberate, not scope creep:
`FOR-WORKING-AGENTS.md`'s findings F-2 and F-5 are marked closed in place (with
the coordinator's rejection of F-2's counter-reading recorded), because that
document merges in the same PR and would otherwise ship two sentences asserting
that a ruled-and-landed sentence is missing and that a repaired page is stale.
Findings are marked, never deleted: the record of what was found stays beside
what was done. **Load-bearing? no** — prose scope; reverses by `git revert`.

Untouched deliberately: `VERIFICATION.md` (the G23 sentence landed there under
the coordinator's own hand at `fe7fb3ac6`; its wrap runs long at the splice, which
is cosmetic and is reported rather than silently reflowed); Example 2 and the
`plait chaos` section, both still honestly E4; the three sample scripts, which
stay uncommitted for DEV-715's doctest lane per T14.

### T23. Subscribe discovers the stream that owns its subject

Decided: `FabricClient.subscribe` resolves the owning stream through
`streams.find` at subscribe time. `FabricClientOptions.stream` names only the
fact/node commons stream whose shape the constructor ensures. An advisory
subscription on an unowned subject refuses as transport absence instead of
idling. Supersessions: T4's “the exact file-backed R=1 stream” now reads “the
exact stream owning the subject”; T5's deduplication window is per partition
stream for evidence and per commons stream for fact/node, never stream-wide
across lanes. Alternatives: keep the constructor's commons-stream name as the
subscription target; make callers name a stream; idle on an unowned subject.
Why: subjects route while stream ownership may be partition-local, and discovery
preserves the advisory surface without smuggling topology into it.
**Load-bearing? yes** — without discovery, a valid evidence subscription reads
the wrong stream or waits forever.


## Task DEV-724 — E6 contexts, runtime half

Task-local placeholders (rule 1), independent of the DEV-725 block above: this
task's T14-T23 are NOT that task's T14-T17. Numbers are kept as written because
outside references already cite them — the DEV-727 review verdict (F-2 to T16,
F-3 to T20), the round-2 charge (R2-4 to T23), the module comments, and the
byte-compared control trace whose payload carries "decision": "T16".

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
rather than fight it.

Walled 2026-08-17 (DEV-727 finding F-2, round-2 charge R2-1) by TWO rows, and
the ruling that produced them survived one wrong turn of mine that is recorded
here because the reasoning matters more than the conclusion.

**Retracted:** round 2 of this branch claimed that contention cannot
discriminate the two reconciliations and that no schedule exists in which
byte-equality exhausts `CELL_MERGE_ATTEMPTS` while subsumption lands. That is
false, and the durable audit
(`docs/research/2026-08-17-dev724-cell-subsump-reconciliation-audit.md`,
`agent/research/DEV-724` at `8118d99`) refuted it. The argument I gave —
the pre-CAS guard `subsumes(current, delta)` re-reads and rescues byte-equality
on the next pass — holds for attempts 1 through 7 and fails at the boundary,
because the guard runs at the TOP of an attempt and attempt 8 has no successor.
Generalizing from the interior of the loop to its last iteration was the error.

**Row 1 — the ruled discriminator, at the retry boundary.** Attempts 1..7 each
lose their CAS to a lawful rival join whose read-back still lacks this delta, so
both disciplines retry identically. Attempt 8 loses to a rival join carrying
this delta plus one fresh observation, so the read-back is a STRICT superstate
of the stale intended record. Subsumption sees the merge postcondition already
established and returns success inside attempt 8; byte-equality rejects the
superstate, finds no ninth guard, and reports `cell-update-contended` over a
cell that already carries the delta. Executed on the live bucket:
8/8 CAS attempts under both disciplines, success versus exhaustion, identical
final cell digest (`negative-controls/cell-retry-boundary.trace.json`).

**Row 2 — the ambiguity case, at attempt 1.** A transport-class write failure
whose read-back carries the delta because a rival's join subsumed it:
subsumption converges, byte-equality falls past the CAS branch to
`transportRefusal`. A distinct result class — an absence refusal on the first
attempt, not exhaustion — and it does not stand in for row 1
(`negative-controls/cell-byte-equality-mutant.trace.json`).

Both rows share one control, `negative-controls/cell-byte-equality-mutant.ts`,
the shipped service with only `reconciled` replaced; un-mutating it reds both
and only those.

**Load-bearing? yes, narrowly.** The audit's scoping is adopted verbatim as the
claim's ceiling: this licenses bounded RESULT CLASSIFICATION under an
adversarial but finite monotone schedule. It does **not** make subsumption
safer than byte-equality, and it is not convergence safety, fairness, progress,
or any liveness statement — convergence safety is carried by the exact-digest
comparison against the model verdict, not by this entry. Two further bounds the
audit names and this entry inherits: the shipped predicate tests only
`delta ≤ readBack`, not `current ⊔ delta ≤ readBack`, so preservation of the
read state comes from the monotone-writer premise rather than from the check;
and the whole rule is sound only given faithful semilattice bytes, an authentic
committed read, one fixed backing-stream incarnation, and writers that are all
inflationary. It proves neither CAS authorship nor integrity.

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

Amended 2026-08-18 (DEV-738, the A-9/G-5 split): this decision is preserved
verbatim for the seam it was made about — the catalog and the catalog-internal
payload seam, now named `Payloads`, both still unverified with
`Resolved.resolve` as their one verify door. It does not extend to the public
blob store minted in `Blob.ts`, where verification is inside the service: there
the control does not need the service's cooperation, because it flips bytes on
the substrate behind the API. The argument was always about who can be made to
lie, not about where a hash is computed.

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

Amended 2026-08-18 (DEV-738): the always-absent service this entry calls
`Blobs` is now `Payloads`, and the bound is unchanged — the catalog layer is
still process-local and the internal payload seam still answers absence. The
name `Blobs` moved to the public store in `Blob.ts`, which DOES ship a working
backend over the pin's `FileSystem`; the object-store sentence above still
binds that backend and only that one.

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

Amended 2026-08-17 (DEV-727 finding F-3, ruled at round-2 charge R2-2): the
seam's codec parameter is `Schema.Codec<T, E, RD, RE>`, not
`Schema.Codec<T, E, RD, never>`. Pinning encoding services to `never` was an
accident of the first draft, not a constraint of the pin — the pinned
`SchemaParser.decodeUnknownEffect<S extends Schema.Constraint>` reads only
`S["Type"]` and `S["DecodingServices"]` — and it closed the seam against the
package's own emit path, since `PublishingOf` carries `Catalog` on encode. The
practical effect was that a caller decoding an emitted frame had to reach past
the seam to `Schema.decodeUnknownEffect` and take `SchemaIssue.Issue` on the
error channel, which is precisely what the single-seam claim forbids; the
package's own test did exactly that, which is why nothing redded. Two rows now
fence it: the emit-path round trip decodes through `decodeRefusing`, and an
absent emitted reference refuses as a `Refusal` rather than an issue. The
coordinator amends the architecture record's sentence to match.

Re-verified 2026-08-17 after merging `main` at `450ffa1`, which carries this
package's other in-flight task (DEV-725 T15, the type-level walk's quantifier
guard) over the same file this entry's finding is about. The quarantine still
binds: re-exporting the bridge onto the barrel produces exactly the same two
`TS2589` errors, now at `test/PublicEffects.typecheck.ts:140` and `:141` rather
than `:107` and `:108`. The guard narrowed the walk's quantifier; it did not
make `SchemaIssue.Issue` traversable.

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

### T23. Cell negative controls derive from the shipped service through one named seam

Decided: `internal/cells.ts` exposes a package-internal `MergeDiscipline` — the
merge loop's two swappable steps, `next` (lawfully the join) and `reconciled`
(lawfully subsumption) — plus `makeCellServiceWith`. `makeCellService` is
`makeCellServiceWith(options, lawfulMergeDiscipline)`, and each negative control
is the same builder with exactly ONE member replaced:
`lastWriterWinsMerge` deletes the join, `byteEqualityReconciliation` swaps the
reconciliation. Alternatives: keep both controls as standalone
re-implementations of the read-then-CAS sequence (the shape the first round
shipped, and the shape `stale-token-mutant.ts` still has). Why: a
re-implementation shares the bucket name and the canonicalizer but not the
attempt loop, the shape check, the key law, or the reconciliation, so
"the shipped path minus one step" is a claim the code does not support — DEV-727
finding F-6 — and it made the control test-order dependent, because it opened a
bucket some earlier test had to have created. Deriving through the seam makes
the sharing a fact of the call graph rather than a promise in a comment, and
each control ensures its own bucket through the shipped setup, so both run
standalone. The seam is not a production hook: it lives in `internal/`, the
public `Cells.layer` takes connection options and nothing else, and the
public-effect gate walks the barrel, so no discipline is selectable by any
consumer. **Load-bearing? yes** — the refutations are only attributable to the
deleted step if everything else is provably the same code, and un-mutating
either member reds its own row (verified both ways).

## Task DEV-734 — the transport spine + mechanical audit dispositions

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. Spec authority:
`docs/design/2026-08-17-plait-effect-affordances.md` (B-1, B-2, B-3, B-5, B-6,
B-8, B-9, B-11; cards FH-1, FH-5).

### T0. `acquireConnection` carries the caller's refusal, not the spine's

Decided: the spine's connect helper is
`acquireConnection(options, defaultName, operation, refuse)` — four arguments,
not the two the ticket sketched. The adapter passes the operation string that
names the acquire in the refusal path and the `TransportRefusal` bound to its
own absence kind. Alternatives: a two-argument helper minting one spine-owned
connection refusal. Why: the ticket's own rule is that the absence-kind strings
stay per-adapter data; a spine-owned refusal would silently retag five of the
six connect paths (`register-transport-unavailable` and its four siblings all
become one kind), which is a change to the persisted refusal taxonomy, not a
behaviour-preserving extraction. Threading the refusal keeps every byte of
every minted refusal identical to what the eight copies produced.
**Load-bearing? yes** — it is the reason this extraction is provably
behaviour-preserving.

Amended 2026-08-18 (DEV-748 round-2, major charge). The entry originally
claimed that byte-identical minting "lets the existing walls stand as the
regression gate." That sentence was false and is withdrawn. Of the seven
distinct transport absence kinds, only `cell-transport-unavailable` was named
anywhere under `packages/plait/test` or `go/` (`CellWall.test.ts:391`); no
taught-repair note string was asserted anywhere in the repo, and RefusalNext's
exhaustiveness sweep enumerates `StructuralRefusalKind.literals` only, so
absence kinds sit outside it by construction. The fidelity was true and was
proved — twice, out of band: once by this seat's reading, once by the review's
byte-for-byte dump of all eight bindings at `14298c2` and `963259d`. But it
rested on nothing the repo executed, and a later homogenization would have
landed green. The gate is now landed rather than owed:
`test/TransportSpine.test.ts` is FH-1's stated deliverable — one row per
adapter, `kind`/`law`/`expected`/`next` transcribed from the pre-extraction
definitions at `14298c2`, exercised on each adapter's own operation and on a
foreign one, with an in-file negative control that plants the homogenized spine
and requires every adapter whose terms it erases to refute. Each adapter
exports its own `transportRefusal` for that wall, the same
derive-through-a-named-seam discipline the cell controls use (T23 of the
DEV-724 task). DEV-735 narrows classification on this exact spine and now
inherits a gated seam.

### T1. `TransportTerms.next` is a function of the operation

Decided: the per-adapter taught repair is `(operation: string) =>
ReadonlyArray<Next>`, uniformly, and the spine exports `teachRetryOperation`
for the two adapters (`nats`, `cells`) whose repair names the refused operation
as its own subject. The six adapters with a fixed repair write `next: () =>
teach…`. Alternatives: a union member `ReadonlyArray<Next> | ((operation) =>
…)`, so fixed repairs stay bare arrays. Why: one shape reads and type-checks
better than two, and the two dynamic adapters shared a verbatim note that now
lives once. **Load-bearing? no** — presentation of the same data.

### T2. `digestOfCanonicalBytes` lands in `internal/`, and `Digest.digestOf` is untouched

Decided: B-5's helper is `src/internal/digests.ts`, consumed by
`Wire.decodeEnvelope`; `Digest.ts` keeps its own canonicalize-then-hash body.
Alternatives: export it from `Digest.ts` (the module that owns identity); have
`digestOf` delegate to the internal helper. Why: `Digest.ts` is an export path,
so an addition there is a public-surface addition — out of this ticket's scope
and a manifest change. Delegating the other way would make `Digest.ts` import
its own internal consumer and add a second module cycle to a package that
documents the one it already has (`Cell.ts` ↔ `internal/cells.ts`). The cost is
two duplicated lines of hashing; the precondition "these bytes are canonical"
is not checkable, which is the other reason the door stays internal.
**Load-bearing? maybe** — revisit when the sorts sweep (DEV-740) brands digest
construction.

Amended 2026-08-18 (DEV-748 round-2, minor charge): the new door is a pure
function, so it emits no span, and every envelope decode — and every publish
path that re-enters the decode — loses the `Digest.digestOf` child span it used
to emit. That is an observable trace change, and it sits against the same
architecture rule B-2 satisfies elsewhere in this ticket ("`Effect.fn` names
every exported effectful function, spans for free"). It is accepted, not
overlooked: the rule governs exported effectful functions, this door is neither
exported nor effectful, and lifting it into an Effect purely to keep a span
would re-import the failure B-5 exists to remove — the span would name a
computation whose only remaining work is one hash. The decode's own
`Wire.decodeEnvelope` span still covers it.

### T3. The heartbeat keeps its leading sleep, and its branch keeps success type `never`

Decided: B-3's loop is
`Effect.sleep(h) → Effect.repeat(renewOnce, Schedule.spaced(h)) → Effect.never`,
with `renewOnce` a single `SynchronizedRef.updateEffect`. Alternatives: the
bare `Effect.repeat(renewOnce, Schedule.spaced(h))` the finding names. Why: at
the pin, `Effect.repeat` evaluates its source once BEFORE stepping the schedule
(`Effect.d.ts`, the repeat gotcha), so the bare form fires a renewal at grant
time — an extra CAS write and an immediately-changed token, which is a
behaviour change the ticket does not claim. The leading sleep reproduces the
hand-rolled loop's instants exactly. `Schedule.spaced` never exhausts, so the
`Effect.never` tail is unreachable; it exists because `repeat` types its
success as the schedule's output and `raceFirst` would otherwise widen `hold`'s
result to `A | number`. **Load-bearing? yes** — the first renewal's timing is
observable to any holder that reads its token.

### T4. The chaos connection name stays pinned by passing servers alone

Decided: `internal/chaos.ts` calls the spine with `{ servers: options.servers }`
rather than forwarding its whole options record, so `acquireConnection`'s
`options.connectionName ?? defaultName` can only ever resolve to
`"foldlab-plait-chaos"`. Alternatives: forward `options` like the other five
adapters and rely on `RedeliveryChaosOptions` having no `connectionName` field
(true today, and the extraction changed no behaviour because of it); note the
exposure in prose and leave the call site alone. Why: the chaos harness's
connection name is part of a pinned measurement trace, and the forwarding form
makes it overridable the day that interface grows the field — silently, with no
edit at this call site and nothing red. Pinning it by construction costs one
object literal and removes the trapdoor. Raised as a DEV-748 round-2 minor
charge. **Load-bearing? no** — no behaviour differs today; this keeps a pin a
pin.

## Task DEV-738 — the blob split: internal payload seam vs public `BlobsService`

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. Spec authority:
`docs/design/2026-08-17-plait-effect-affordances.md` A-9 whole (refereed G-5
ADOPT-AMENDED, G-6 ADOPT), friction card FH-3, Part C ticket 5.

### T0. The internal seam is `Payloads`, and the name `Blobs` moves to the public store

Decided: `Catalog.ts`'s `BlobService`/`Blobs` become `PayloadService`/`Payloads`
under the tag `@foldlab/plait/Payloads`, and `Blob.ts` mints the public
`BlobsService`/`Blobs` under the tag the old one vacated,
`@foldlab/plait/Blobs`. Alternatives: keep `Blobs` on the internal seam and name
the public store something else (`BlobStore`, `Payloads`); move the internal
seam into `internal/` entirely. Why: the ticket delegates the internal name and
the record proposes the payload-store vocabulary, which `CONTEXT.md` and
`Resolved.ts` already spoke ("the catalog and payload services", "a payload
store lookup follows") — so the rename adopts language the package had rather
than inventing more. The public store keeps `Blobs` because that is the name the
architecture map reserves for `Blob.ts` and the name application code reaches
for. `internal/` was refused because the seam appears in the public type of
`ResolvedOf` (`Catalog | Payloads | RD`): a service a public codec type-requires
cannot hide behind a module consumers may not import.
**Load-bearing? yes** — the tag string is the service identity, and reusing the
vacated one means a stale `@foldlab/plait/Blobs` provider now satisfies a
different interface. Nothing outside this package provides either tag today,
which is why the reuse is free; the day one does, this is the line to read.

### T1. Public absence is a refusal; the internal seam keeps `Option`

Decided: `BlobsService.get` refuses `blob-absent` (an `AbsenceRefusal`) and
`PayloadService.get` keeps `Option`. Alternatives: `Option` on both (uniform);
refusal on both (uniform the other way). Why: the two seams owe different
things. A public store owes callers head-relative vocabulary and a refusal
`retryAbsence` can see — `Option.none` is invisible to it and says nothing about
whether waiting could help. The internal seam owes `Resolved.resolve` a
three-way answer (catalogued / payload / neither) with no refusal minted at a
leg that is not the end of the search, and `Option` is exactly that. Uniformity
here would be a shape imposed on two different obligations.
**Load-bearing? yes** — the retry classification of every public blob read
depends on it.

### T2. Two names over one hashing implementation in `internal/digests.ts`

Decided: `digestOfStoredBytes` joins `digestOfCanonicalBytes`, both bound to one
private `sha256Hex`. Alternatives: call `digestOfCanonicalBytes` from `Blob.ts`;
write a third `createHash` body in `Blob.ts` (the precedent this package set at
DEV-734 T2 by accepting two duplicated lines); export a byte door from
`Digest.ts`. Why: the name is the precondition, and the preconditions differ —
`digestOfCanonicalBytes` claims its input is one canonical wire value's bytes,
while a blob store claims only that the digest addresses exactly the bytes it
was handed. Reusing the first name inside `Blob.ts` would put one name over two
contracts, which is the FH-3 sin this ticket exists to repair. Sharing the
implementation keeps the duplication DEV-734 T2 accepted from growing a third
copy. `Digest.ts` stays untouched because it is an export path and a byte door
there is a public-surface addition nobody asked for. **Load-bearing? no.**

### T3. Paths join with `/`; the pin's `Path` service is not required

Decided: `Blob.ts` joins `<root>/<first two hex>/<digest>` with a private
`joinPath` over `/`. Alternatives: require `Path` (the pin ships it,
`Path.ts:255`, with a requirement-free posix layer at `:867`); import
`node:path`. Why: `layerFileSystem`'s substrate is the file system and nothing
else, and a second service in its requirement set would be paid by every
application that provides the layer, for string concatenation. The pin's default
`Path` layer is posix anyway, so requiring it buys no Windows behaviour that `/`
does not already have — node and bun resolve `/` inside an absolute root on both
platforms, which the wall exercises on the host it runs on. `node:path` was
refused because it would make a portable-`FileSystem` module reach past the
abstraction it was given. **Load-bearing? no** — a backend that needed real path
algebra would take `Path` and say so.

### T4. Only not-found is a refusal at the platform seam; every other `PlatformError` dies

Decided: `readFile`'s not-found becomes the `blob-absent` absence, a re-derived
digest disagreement becomes structural `digest-mismatch`, and every other
`PlatformError` — permission, busy, out of space — is `Effect.orDie`'d.
Alternatives: mint a retryable substrate absence for the transport-shaped ones
(busy, timed out) as the NATS adapters do; mint a structural `substrate-shape`
for the rest. Why: the operator's B-7 disposition is that defects are defects
and are not part of the estate domain language, and the ticket maps this seam in
exactly two directions. A store root the deployment cannot write is a
misconfiguration, not a coordination fact, and dressing it as a refusal would
put it on a retry schedule that can never repeal it. The cost is stated rather
than hidden: an application that wants those failures as values wraps the layer
and classifies them itself. **Load-bearing? yes** — it decides what a caller can
catch, and the transport-shaped arm is the one a later probe might argue back.

### T5. The wall's `FileSystem` is a node-backed `makeNoop` adapter, not a platform package

Decided: `test/TestFileSystem.ts` builds the layer from the pin's own
`FileSystem.layerNoop` over `node:fs/promises`, implementing only the six
operations the store reaches for. Alternatives: add `@effect/platform-bun` as a
devDependency and use `BunFileSystem`; run the suite against an in-memory file
system. Why: the ticket's bound is zero new plait dependencies, and A-9 names
`makeNoop`/`layerNoop` as the pin's own test seams for exactly this. The bound
that buys is stated in the module and the README rather than left implicit: the
wall exercises the store against the OS file system, and the behaviour of
`BunFileSystem` or `NodeFileSystem` specifically is the application's to verify.
An in-memory file system was refused because it would delete the only part of
this backend that is not this package's own code — rename semantics, ENOENT, and
the fan-out directory. **Load-bearing? yes** — it is the scope line on every
claim the suite makes.

### T6. The conformance suite throws plain errors and ships one planted control per law

Decided: `test/BlobsConformance.ts` states six laws whose checks throw `Error`s
rather than calling a test framework's assertions; `blobsConformance` registers
them against a backend, and `refutedLaws` runs them and returns the laws that
refused. `Blob.test.ts` plants one backend per law, each dropping exactly that law,
plus an unplanted base that must pass every law. Alternatives: write the checks
with `expect` directly (shorter); assert only that a planted backend fails
somewhere. Why: a prover that cannot fail proves nothing, and "fails somewhere"
is the version of that gate which passes when the mutation broke a different law
than the one claimed — so each control is refuted on exactly its own law and on
no other, and the unplanted base pins that the refutations come from the
mutation and not from being memory-backed. Plain errors are what let
`refutedLaws` catch a violation as a value, and they keep the suite runnable by
a backend that lives outside this package. The identity law's oracle is FIPS
180-4's published SHA-256 vector for `"abc"`, which is outside both the store
and this package: a store self-consistent under some other address function
agrees with itself forever and disagrees with that line immediately.
**Load-bearing? yes** — it is the whole wall.

### T7. The resolve seam's refusal data is untouched, including its `blob` path

Decided: `Resolved.ts` changes names only. `malformedPayload` keeps its
`["blob", digest]` path and the `cataloged-value-absent` / `digest-mismatch`
kinds are unchanged, so the Resolved and Catalog suites observe exactly what
they observed before. Alternatives: rename the path segment to `payload` for
consistency with the renamed seam. Why: refusal data is observed by walls, and a
rename that reads better in a diff is a wall change wearing a cosmetic hat. The
segment is honest either way — both sides of it name payload bytes. Deliberately
untouched, not overlooked. **Load-bearing? no.**

### T8. `put` writes and renames unconditionally rather than skipping a digest it already holds

Decided: every `put` stages a temp file, writes, and renames into place, even
when the digest is already stored. Alternatives: check `has` first and return
early. Why: content addressing makes the rewrite harmless — the bytes are the
same bytes — and the early return would add a check-then-act window for a saving
nobody has measured. The rename also makes `put` quietly self-repairing over a
store corrupted behind its back, which is a property worth having and not one
worth claiming: nothing in the suite tests it, so nothing here promises it.
**Load-bearing? no.**

### T9. The T18 control is written at the verify door, not argued at the seam

Decided: `Resolved.test.ts` gains "a lying payload layer is refused at the one
verify door" — a `Payloads` layer answering `termsDigest` with the canonical
bytes of a different wire value, and `resolve` refusing `structural/digest-
mismatch` with `got` the other value's digest. The row that asserted the seam
hands back what it holds stays, relabelled as characterization, because it
records why a lie is writable there and pointing at the control that spends it.
Alternatives: leave the argument in prose; move the whole thing into the
Catalog suite. Why: `Layer.succeed` handing back the function it was given is a
tautology over the fixture — it cannot fail, so it proves nothing, and the
payload leg had no row that could. The Catalog leg already had a tampered-store
row; this is its twin. Raised as a DEV-751 round-1 major charge.
**Load-bearing? yes** — FH-3's locality clause and T18's amendment both rest on
the control staying writable at the payload seam, and now something proves it.

### T10. The conformance suite puts two payloads into one store

Decided: a sixth law, `distinctness` — two payloads in, each `get` returns its
own bytes, each `has` is true — with a planted control that keys on the
two-character fan-out prefix instead of the whole digest. The second payload is
chosen so its digest agrees with the FIPS vector's on the first byte, which is
what makes the law discriminating; both digests are still learned at run time
from the store's own `put`. Alternatives: leave the five laws; add a
whole-digest-addressing law stated over a backend's mechanics. Why: every other
law exercises one payload in a fresh store plus a never-stored digest, so a
store that is not content-addressed at lookup ships green through all five —
the prefix-keyed backend was built and passed them. What it actually does is
lose whichever prefix-sharing payload arrived first, while `has` still answers
true for bytes it no longer holds. A law stated over backend mechanics would
not survive the object-store and remote backends, which is the whole point of a
backend-agnostic suite. Raised as a DEV-751 round-1 major charge.
**Load-bearing? yes** — this suite is the only wall the later backends meet.

### T11. `FileSystemBlobOptions.root` stays a bare string, recorded rather than omitted

Decided: the store root is deployment configuration and keeps its `string`
type; it is recorded here so the DEV-740 identifier sweep has a disposition to
apply rather than a gap to discover. Alternatives: brand it now; leave it
unrecorded. Why: the affordances record's own band puts a store root beside
connection names — it addresses a machine, carries no meaning inside the
estate, and is never compared against an estate identifier. Branding it would
buy nothing and would put a foldlab type on a path a deployment supplies.
Raised as a DEV-751 round-1 minor charge. **Load-bearing? no** — nothing
behaves differently; this is the row DEV-740 will read.

## Task DEV-735 — defect classification on the transport spine

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. Spec authority:
`docs/design/2026-08-17-plait-effect-affordances.md` (B-7), landing the
operator's disposition of 2026-08-18.

### T0. The error channel's discipline is two-sided: defects never wear the absence sort

Decided: the house rule was recorded one-sided — "transport causes are preserved
and never wear fencing laws" (T0 of the DEV-711 task) — and its symmetric half
is now law: *defects never wear the absence sort*. Operator's ruling, verbatim:
"defects are defects and are not part of the estate domain language." Refusals
are that language in full; a `TypeError` inside the pinned client, a mis-shaped
call, a rejection that is not an error at all — none of them is a statement this
fabric makes, so none of them is minted as one. Alternatives: leave the channel
one-sided and document the hazard; classify defects into a third refusal sort.
Why: `Refusal.retryAbsence` retries the absence sort and only the absence sort
(Refusal.ts:129-150), so the pre-disposition classification did not merely
mislabel a bug, it guaranteed a retry loop over one — the gate measures exactly
that, four attempts before and one after. (Gate, not wall: this suite compares
one implementation against a stated rule; the glossary reserves "wall" for
equal-input/equal-digest comparisons between implementations.) A third sort was refused on the
ruling's own terms: a defect is not in the vocabulary, so it gets no word in it.
Classification remains a client-side convention layered on an undistinguishing
wire, unchanged from T13 of the DEV-711 task; nothing here is derived from the
substrate. **Load-bearing? yes** — it is the error channel's shape.

### T1. The transport vocabulary is read from the client's registries, and includes the transport's unwrapped system error

**Superseded by T3 and T4** (DEV-752 round-2). The second admission ground below
was removed and the caller-validation carve-out this entry declined was ruled
in. The entry is kept whole because the reasoning it records — including the
probe evidence — is what T3 disposes of.

Decided: `isTransportCause` (internal/transport.ts) admits a cause on two
grounds. First, `instanceof` against the pinned client's own registries —
`Object.values(errors)` from `@nats-io/nats-core@3.4.0` (its thirteen classes,
enumerated by the client, not transcribed by us) plus the two
`@nats-io/jetstream@3.4.0` roots `JetStreamApiError` and `JetStreamError`, which
every jetstream class this package can observe descends from. Second, the Node
system-error shape: an `Error` carrying string `code` AND string `syscall`.
Alternatives: the class list alone, as the disposition's implementation reading
sketched it; additionally carve the client's four caller-validation classes
(`InvalidArgumentError`, `InvalidSubjectError`, `InvalidOperationError`,
`InvalidNameError`) out as defects. Why the second ground: measured, not
assumed. `@nats-io/transport-node@3.4.0` wraps exactly one dial failure —
`ECONNREFUSED` becomes `ConnectionError` — and rethrows every other socket error
unwrapped, so a probe against the pin returns `ConnectionError` for a closed
port and a bare `Error { code: "ENOTFOUND", syscall: "getaddrinfo" }` for an
unresolvable host. The class list alone would therefore file "the host does not
resolve" — the most ordinary retryable absence this package has — as a defect,
which inverts the ruling instead of landing it. Requiring both fields keeps the
admission a shape rather than a loophole: Node's `ERR_*` programming errors
carry `code` alone and stay defects. Why not the carve-out: those four classes
are the client's lawful report of a caller error and reclassifying them is a
second behavioural change the disposition did not rule; the ticket's named
control is a `TypeError`, and this seat does not widen a ruling it was handed.
Recorded as observed, not fixed. Known and deliberate consequences: the pinned
clients also raise bare `Error` for a handful of substrate conditions
(`@nats-io/kv` "kv is only supported on servers … or better",
`@nats-io/jetstream` "… requires server …", the transport's "unexpected response
from server"), and those now die as defects — each is a permanent deployment or
protocol mismatch that no retry repairs, so the absence sort was never honest
about them. `InvalidNameError` and `JetStreamNotEnabled` are declared in
`@nats-io/jetstream`'s `jserrors` but absent from its entrypoint, so no
`instanceof` names them without reaching past the published surface; both fall
to the defect side by that omission. **Load-bearing? yes** — the enumeration is
what the classification means, and it is pinned to `@nats-io/*@3.4.0`.

### T2. The narrowing lives at the mint and a defect leaves by throwing

Decided: `transportRefusalFor` rethrows a non-transport cause unchanged, so the
classification is one edit inside the spine and not one at each of the
thirty-one sites that observe a transport cause. No signature moves (audit
B-12): every call site keeps the shape it had, and `TransportRefusal` still
reads `(operation, cause) => Refusal`. Alternatives: a spine-level
`tryTransport` wrapper each adapter calls instead of `Effect.tryPromise`;
returning a discriminated result the call sites branch on. Why: the pin states
the semantics this rests on — inside `Effect.tryPromise`'s `catch`, "if `catch`
throws while mapping the error, that thrown value is treated as a defect"
(Effect.ts, the `tryPromise` gotcha) — and it was measured to hold identically
at the other two seams the adapters classify at, an `Effect.catch` handler and
an `Effect.gen` body, all three dying rather than failing. The alternatives
rewrite thirty-one call sites to change a classification that is not theirs to
make; B-8 extracted this spine so that this narrowing would be one edit, and
spending the leverage on a wider diff would waste it. The cost is a function
that can throw where its type says it returns, which is why the throw is
documented at the mint and gated at all three seams by
`test/TransportDefects.test.ts`. **Load-bearing? yes** — it is how a defect
crosses the classification boundary at all.

### T3. The structural admission is removed; the ENOTFOUND expansion is refused pending disposition

Decided: `isTransportCause` admits by class membership and nothing else. The
shape rule — an `Error` carrying string `code` and string `syscall` — is gone,
and with it the unwrapped `ENOTFOUND` absence T1 bought with it. That expansion
is REFUSED pending an operator disposition, not preserved. Alternatives: keep
the shape rule; keep it and add an allowlist of Node `code` values; keep it and
require the cause to arrive from a connect path. Why: the rule was a
counterexample to the ruling it was implementing. Any foreign `Error` wearing
those two fields became a retryable absence, and the reviewer planted the proof
— a `TypeError` with invented `code` and `syscall` classified as transport
evidence. A fence that a two-line forgery walks through is not a fence, and the
whole point of the narrowing is that a defect cannot buy its way into the one
retryable sort. The allowlist variants only move the forgery one step: the
fields are still read off an object whose provenance nothing established.

What this costs, stated plainly: `@nats-io/transport-node@3.4.0` really does
rethrow an unresolvable-host error unwrapped, so "the host does not resolve" now
dies as a defect. That is a genuine transport condition on the wrong side of the
line, and it is the operator's to dispose of — either by ruling the client's
rethrow a transport class this package may recognize by some evidence a
counterfeit cannot manufacture, or by ruling an unresolvable host a deployment
defect. The counterfeit and the real `ENOTFOUND` are both in the negative
controls, side by side, so the cost is visible rather than argued. Raised as the
DEV-752 round-2 blocker. **Load-bearing? yes** — it is what the classification
now means.

### T4. Caller-validation classes die as defects

Decided: `InvalidArgumentError`, `InvalidOperationError`, and
`InvalidSubjectError` are filtered out of the admitted registry and die as
defects, with a negative-control row each. Alternatives: keep the
whole-registry rule; keep them as absences and document the hazard. Why: T1
declined this carve-out on the ground that this seat does not widen a ruling it
was handed — but the ruling was already handed. The three classes mean the
caller called the client wrong: an argument the API cannot use, a subject that
is not one, an operation the object does not support (the pin's own example is
iterating an object configured with a callback). That is the same thing a
`TypeError` means, and T0's own text names "a mis-shaped call" on the defect
side. Admitting them made the change's rule contradict the change's own
decision, and made a bug retryable four times over. The three are the whole
caller-validation family reachable here: the fourth, `@nats-io/jetstream`'s
`InvalidNameError`, is absent from that package's entrypoint, so nothing admits
it in the first place. Every other class in the registry — connection,
authorization, protocol, timeout, permission, request — reports a condition of
the substrate or the deployment, not of the call, and keeps its absence. Raised
as the DEV-752 round-2 blocker. **Load-bearing? yes** — it is the boundary the
whole-registry rule did not draw.

### T5. Spine membership is derived from the source tree; the terms stay transcribed

Decided: `TransportSpine.test.ts` reads which adapters mint a transport refusal
off `src/internal/*.ts` and asserts that set equals its own rows. The row terms
stay transcribed from the pre-extraction definitions. Alternatives: derive the
terms too, by reading them from the adapters; leave membership hand-listed.
Why: the two halves want opposite things. The terms are the oracle — reading
them from the implementation would make the gate a mirror, green by
construction, which is the failure the transcription exists to avoid. Membership
is not an oracle, it is coverage, and hand-listed coverage silently omits: a
ninth adapter could join the spine with no row and nothing would go red. Raised
as a DEV-752 round-2 major charge. **Load-bearing? yes** — coverage that cannot
notice an omission is not coverage.

## Task DEV-736 — the commons pump's bound, and the T4/T5 supersessions

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. Spec authority:
`docs/design/2026-08-17-plait-effect-affordances.md` (B-4; card FH-6; Part C
ticket 3), read at `c585c24c8`, and the operator's ruling of 2026-08-18 on the
dispatching thread, which lifted ticket 3's withholding of route (b) and gave
the repair to this ticket. The record's code line numbers are pre-DEV-734; the
pump now sits at `src/internal/nats.ts:140-223`.

T0 and T1 were written as a refusal and a recorded follow-up when the ruling
was still owed. They are amended in place, on the operator's instruction, to
the dispositions that landed: the refusal of route (a) stands as the record of
why, and route (b) is built.

### T0. Route (a) is REFUSED — with a producer that cannot suspend, a buffer strategy picks which messages are lost, not whether

Decided: the commons subscribe pump does NOT gain
`{ bufferSize, strategy: "suspend" }`. The record's route (a) is refused on
executed evidence. B-4 is repaired by T1's pull form instead, so the refusal
below is the record of why the smallest diff was not the one taken.

The measurement, minimized and committed as `test/CommonsPumpBackpressure.test.ts`.
`Stream.callback`'s buffer options (`Stream.ts:694-699` at the pin) configure
the queue the producer offers into. The producer here is
`consumer.consume({ callback })`, and that callback is synchronous by the
pinned client's own contract — `ConsumerCallbackFn = (r: JsMsg) => void |
Promise<never>`, documented "the callback cannot be async"
(`@nats-io/jetstream@3.4.0` `lib/types.d.ts:540-547`). A synchronous producer's
only offer is `Queue.offerUnsafe`, and at the pin (`Queue.ts:708-726`) that
function does not suspend on a full queue: under `"suspend"` and `"dropping"`
it returns `false` and discards the message, and under `"sliding"` it evicts
the oldest and returns `true`. Forty envelopes through a bound of eight
deliver eight under every strategy and none under no strategy.

The load shape is in the tree too, and both routes are measured at it: 200
real envelopes arriving over ten event-loop turns the consumer cannot slow, a
downstream paying the pump's own digest verification per message, a bound of
sixteen. Route (a) delivered 160 of 200 under `"suspend"` and `"dropping"`,
identical across twenty runs — the consumer drains the bound between turns, so
each turn of twenty loses exactly the four the bound could not hold — with the
first hole at index 16 and the read carrying on past it. `"sliding"` lost as
many and reported every offer accepted. The committed row asserts the shape of
that loss rather than the count, because the count is a fact about this host's
scheduler and the shape is a fact about the adapter.

The first hole's index is the reason this is a refusal and not a trade. The
loss is not truncation; it is a hole punched in the middle of an ordered read,
with no error raised, no refusal minted, and — under `"sliding"` — no false
return for the call site to notice. `FabricClient.subscribe` is the package's
verified-read path: every envelope it yields has had its digest re-derived and
checked. A pump that silently omits envelopes makes that verification answer a
question nobody asked, because the guarantee readers rely on is over the
sequence, not over each survivor. The unbounded buffer spends memory. Route (a)
spends evidence, which this package does not have to spend.

Alternatives, all named for the ruling and all refused: keep `"suspend"` and
fail the stream when `offerUnsafe` returns `false` (honest and loud, but it
mints a new absence kind and a new failure mode on a public seam — a ruling,
not an implementation detail); bound the pump server-side the way the fold pump
does (`consume({ max_messages })`, `internal/pump.ts:157-173`) — that bounds
the pull window, not the queue downstream of the callback, and the fold's real
bound is `max_ack_pending` under explicit acks, which an ordered ephemeral
consumer at `AckPolicy.None` has no equivalent for; accept the unbounded buffer
and close B-4 as a recorded bound rather than an enforced one. The operator
ruled route (b) on 2026-08-18 and it landed as T1.

**Load-bearing? yes** — it is the reason the record's preference order
inverted, and the reason no buffer strategy appears at this seam.

### T1. Route (b) is LANDED — the commons pump is the client's own iterator, pulled

Decided: `commonsPump` (`src/internal/nats.ts:208-223`) is
`Stream.fromAsyncIterable` (`Stream.ts:1277`) over the client's own
`ConsumerMessages` — a `QueuedIterator<JsMsg>` at the pin
(`lib/types.d.ts:708`) — under the existing `acquireRelease`/`Stream.unwrap`
(`Stream.ts:1633`), with the client's close in the release. The hand-rolled
queue pump is gone, and with it the question of what to size it to.

The measurement, at the load shape T0 records and in the same committed file:
200 of 200 delivered, in order, where the bounded callback adapter delivered
160 with the first hole at index 16. An iterator is pulled, so this pump owns
no queue to size and discards nothing.

What landing forced, and what a reader should not lose: the pump withholds its
iterator's `return`. `ConsumerMessages` is an async generator, and a generator
parked on an `await` cannot be preempted by `return()` — the return queues
behind the pending pull and never runs. An idle subscription is parked exactly
there, and `Stream.fromAsyncIterable` registers `iter.return()` as a scope
finalizer when the iterator offers one (`Channel.ts:1867-1883`), so the naive
form hangs its scope on interruption forever. That is committed as its own
counterexample row beside the positive one, and the live wall that first caught
it — `RoundTrip.test.ts`'s idle-subscription interruption — is green. `close()`
is the end that does reach a parked pump: it unsubscribes the inbox, cancels
the timers and stops the status iterator synchronously, then queues the
iterator's stop behind the pending pull, which that pull delivers
(`lib/consumer.js:581-607`). Waiting on the close is sound while a pull is
outstanding and only there, so the release waits exactly then. T4's one stated
property therefore survives the move, and is asserted rather than assumed.

The honest limit, since the finding was written about memory: the pull form
ends loss, not buffering. The client refills its `consume()` pull window when
messages ARRIVE, not when they are consumed (`lib/consumer.js:253`), so a slow
reader still accumulates in the client's own `QueuedIterator`. What moved is
that there is now one buffer instead of two, it belongs to the client, and its
knob is the client's `max_messages` rather than a number this package invents.
A memory ceiling would need a reader that acks, which an ordered ephemeral
consumer at `AckPolicy.None` has no equivalent for — the same asymmetry T0
records against the fold pump's server-side bound. FH-6's two answers are still
two; neither is a queue this package sizes.

Alternatives: route (a) (T0, refused on measurement); the fail-loud form (T0,
refused — it mints an absence kind); accept the unbounded buffer (refused by
the ruling). No new absence kind was minted and no public signature moved: the
emitted manifest is unchanged at 60 signatures, and `FabricClientOptions` gains
no field, because the bound this ticket was to make visible turned out to be
the client's and is stated in `commonsPump`'s JSDoc rather than in an option.

**Load-bearing? yes** — it is where this package's backpressure answer lives,
and the withheld `return` is the difference between an interruptible
subscription and a hung scope.

### T2. The duplicate window is scoped per STREAM, and this package now runs two stream families

Decided: T5's scope sentence is superseded by this one, which both duplicate
bits cite.

A `PublishedEnvelope.duplicate` means suppressed by `Nats-Msg-Id` within the
pinned two-minute window of the **commons stream**
(`src/internal/nats.ts:35,95`). An `EmittedEvent.duplicate` means suppressed
within the two-minute window of that **(lane, partition) stream**
(`src/internal/lanes.ts:24,106`) — one stream per partition under the
DEV712-POS-1 ruling, so two events in different partitions never share a
window, and the same event re-emitted to its own partition does.

Alternatives: leave T5's single sentence and let readers infer the second scope
from the stream layout; state the scope twice, once per matcher JSDoc. Why:
the two bits are the same word over different substrates, and a reader holding
T5's sentence would carry the commons window's guarantee onto a per-partition
stream that never had it. Stating it once, here, is what keeps the two matcher
JSDocs from drifting apart — enumerations that are listed, drift.

**Load-bearing? yes** — `duplicate` is a public bit on two public types, and
its bound is the window of the stream that stored the frame.

### T3. The staged matcher JSDoc for DEV-741 cites T2 and does not restate it

Decided: `FabricClient.matchPublished` and `Lane.matchEmitted` are not written
here — DEV-741 owns them (record A-6) — and their JSDoc is staged as two
sentences that point at T2 rather than copying it:

- `matchPublished`: "A `duplicate` arm means the commons stream suppressed this
  envelope by `Nats-Msg-Id` inside its pinned two-minute window; the window is
  the stream's, not the package's (DECISIONS DEV-736 T2)."
- `matchEmitted`: "A `duplicate` arm means that `(lane, partition)` stream
  suppressed this event by `Nats-Msg-Id` inside its pinned two-minute window;
  partitions do not share a window (DECISIONS DEV-736 T2)."

Alternatives: write both matchers here and let DEV-741 inherit them (it owns
the settled union and the coherence wall; two seats minting the same public
surface is the R-2 union lesson); inline the full scope sentence in each JSDoc.
Why: A-6 amendment 3 keeps the two matchers deliberately unshared because the
acknowledgement types answer different subscriptions, which is exactly the
shape that lets two hand-copied sentences drift into disagreement about one
word. One sentence, two citations.

**Load-bearing? no** — wording, staged for the seat that owns the surface.

## Task DEV-731 — ninth substrate probe suite

Task-local placeholders restart for this task. Spec authority:
`docs/design/2026-08-17-plait-next-phase-plan.md` item 9 and
`docs/design/2026-08-17-plait-effect-affordances.md` A-8b.

### T0. Probe the TypeScript KV client at the consuming seam

Decided: the ninth suite is `test/KVWatchSemantics.test.ts`, beside the existing
TypeScript substrate parity wall, and builds the server from `go/go.mod` through
`NatsHarness`. Alternatives: probe `nats.go`'s KV watcher under `go/substrate`;
add a production `Cell.watch` while probing it. Why: the gated consumer uses
`@nats-io/kv@3.4.0`, whose replay flags and resume options are client behavior;
the Go watcher would test the wrong seam, and the ticket mints evidence only.
**Load-bearing? yes** — substituting a different client would not discharge the
gate named by the plan.

### T1. Pin the observed replay flag instead of repairing or abstracting it

Decided: the suite asserts the pin's exact `isUpdate` sequence and records the
mixed initial/live flag as FINDING-DEV731-WATCH-INITIAL-001. No helper repairs
the flag and no consumer surface lands. Alternatives: ignore `isUpdate`; wrap
the iterator and synthesize an initial/live boundary. Why: ignoring a public
field lets client drift pass unseen, while synthesizing a boundary would invent
production semantics the ticket neither licenses nor can derive reliably from
the pin. **Load-bearing? yes** — the finding is the most consequential result
for the future consumer.

### T2. Bound reconnect evidence to one forced same-server reconnect

Decided: the reconnect arm forces the watch connection away for 750 ms while a
second connection publishes, then pins delivery of the in-gap entry followed
by the post-reconnect entry. Alternatives: kill and restart the server; claim
reconnect losslessness from the one arm. Why: this isolates client reconnect
behavior from the already-separate SIGKILL recovery suite; server restart would
mix consumer recovery and storage recovery, and one schedule cannot license a
losslessness theorem. **Load-bearing? yes** — the bound prevents a ran trace
from becoming a general availability claim.

### T3. The watch fence states a standing bound, not a spent gate

Decided: the scoped law in `AGENTS.md` no longer reads "until the watch probe
suite lands." It now requires a ruled ticket before any watch surface ships and
states outright that probe evidence licenses advisory use only. Alternatives:
leave the law as written, now discharged; delete the law because the suite
landed. Why: a law whose condition this very ticket satisfies flips open the
moment the evidence lands, and evidence is exactly what must never grant a
license to ship. `AGENTS.md` is the file an executor reads before editing
inside the package, so it was also the one place the `isUpdate` constraint was
missing. Raised as the DEV-750 round-2 major charge. **Load-bearing? yes** —
without it the package's enforceable contract permits the unsound consumer
FINDING-DEV731-WATCH-INITIAL-001 exists to prevent.

### T4. Strengthen three arms rather than soften the words that oversold them

Decided: the burst arm now issues all 32 puts in flight together and derives
its revision-to-value expectation from the revisions the server assigned; the
replay arm carries a third key so the delivered order rules out alphabetical
and first-write order both; the reconnect arm writes three times inside the
gap. Alternatives: reword the ledger to "32 sequential writes," leave the
two-entry ordering vector, leave the one in-gap write. Why: each arm was
claiming a property its schedule could not exhibit — an awaited write loop
cannot show coalescing, a two-entry replay is the thinnest vector that
discriminates at all, and one in-gap write cannot separate replay-every-missed
-revision from coalesce-to-latest. Strengthening costs one schedule change per
arm and answers the question the prose was already asking. Raised as three
DEV-750 round-2 minor charges. **Load-bearing? yes** — the reconnect arm now
carries a result the previous arm could not state.

### T5. "Advisory" is module vocabulary and belongs in the module glossary

Decided: `CONTEXT.md` defines **Advisory** — an arriving entry is a hint,
silence and ordering and `isUpdate` carry no information, and nothing advisory
answers an existence question. Alternatives: leave the word defined only inside
the next-phase plan; define it in the root `CONTEXT.md`. Why: the word now
carries the bound across five documents and two JSDoc blocks, and the root
contract puts module vocabulary in the module glossary; the root file is the
public language and watch is behind the seam. Raised as a DEV-750 round-2 minor
charge. **Load-bearing? no** — the fence is enforced by `AGENTS.md` and the
tests; this makes the fence word readable to someone who has not read the plan.
## Task DEV-730 — tenth substrate probe suite

Task-local placeholders restart for this task. Spec authority:
`docs/design/2026-08-17-plait-next-phase-plan.md` item 10 and
`docs/design/2026-08-17-plait-effect-affordances.md` A-9 backend (b).

### T0. Probe the TypeScript object-store client at the consuming seam

Decided: the tenth suite is `test/ObjectStoreSemantics.test.ts`, beside the
ninth, and builds the server from `go/go.mod` through `NatsHarness`.
Alternatives: probe `nats.go`'s object store under `go/substrate`; land a
`Blob.ts` slot while probing it. Why: the gated consumer is
`@nats-io/obj@3.4.0`, whose chunking, digest, and metadata behaviour is client
code — the Go client would test the wrong seam, and the ticket mints evidence
only. **Load-bearing? yes** — a different client would not discharge the gate
named by the plan.

### T1. Record the missing ranged read as an enumerated absence

Decided: the ranged-read arm enumerates the client's reachable surface, pins
`get`/`getBlob` at one argument and `ObjectResult` at `{info, error, data}`,
and asserts that no member names a range, offset, seek, partial, or slice.
Alternatives: skip the arm with a note that the API looks absent; build a
ranged read out of raw chunk-subject reads and probe that. Why: an enumerated
surface is evidence that fails when the pin moves, where a skipped test is
silence; and hand-rolling a read the client does not offer would probe our own
invention, not the substrate. **Load-bearing? yes** — G-6's deferred
chunk-manifest law rests on this absence being a fact about the pin.

### T2. Pair the digest claim with a tamper control

Decided: the round-trip arm injects one extra chunk message behind the client's
back and pins three consequences — metadata unchanged, whole-object `getBlob`
refused, and every byte delivered to the reader before the refusal arrives.
Alternatives: assert only that the reported digest equals an independent
SHA-256; corrupt bytes in the file store directly. Why: a digest that agrees
with itself proves only self-consistency, so the control is what makes the
verify-on-read claim mean anything, and it is the same control that exposes the
unverified prefix; corrupting the file store beneath JetStream would probe
storage, not the client's read path. **Load-bearing? yes** — the delivery order
is the finding a future blob reader must design around.

### T3. Capture refusal messages instead of asserting through `.rejects`

Decided: refusals are captured with a small helper that returns the first line
of the error and compared as values. Alternatives: `expect(promise).rejects.toThrow(...)`.
Why: at the harness pin that matcher reported `timeout` for refusals the same
operations produce immediately under a plain `try`/`catch`, which would have
recorded a false observation and cost five seconds per arm. **Load-bearing?
no** — the observed refusals are identical either way; this keeps the recorded
value the one the client actually produced.

### T4. The record carries transcripts and pinned citations, not narration

Decided: the findings record gains a replay command, the suite's verbatim trace
lines, and a per-mechanism section pairing the observation with the pinned
`@nats-io/obj@3.4.0` line that implements it — client-side digest derivation,
the last-chunk check, the metadata write/check boundary, and revision-as-meta
-stream-sequence. Alternatives: leave the prose narration; cite upstream GitHub
rather than the shipped pin. Why: the ticket asked for ran-it transcripts plus
pinned-source citations in the DEV-704 idiom, and the tamper arm alone proves
only that injected bytes leave metadata unchanged — it does not establish the
four mechanisms the record attributes. A reader could not check any of them.
Citing the checkout's own `node_modules/@nats-io/obj/lib/` keeps every line
number verifiable at the pin this suite actually runs against; an upstream link
resolves to a different tree. Raised as a DEV-753 round-1 major charge.
**Load-bearing? yes** — a record that cannot be checked is narration.

### T5. The `mtime` claim is weakened to what the client actually does

Decided: every record now says `mtime` is recomputed on every put and observed
nondecreasing, and says outright that it is not a freshness oracle. The suite
asserts nondecrease across the exercised puts and that the value round-trips
as an ISO string. Alternatives: assert strict freshness across puts. Why: it
would flake, and the pin says why — `info.mtime = new Date().toISOString()`
(`objectstore.js:405`) is a client clock at millisecond resolution, so two puts
inside one millisecond carry the same string. "Every put mints a fresh `mtime`"
was a claim no gate enforced and no gate could. Raised as a DEV-753 round-1
major charge. **Load-bearing? yes** — a consumer ordering puts by `mtime` would
have been building on a tie it was told could not happen.

### T6. One scoped probe helper owns the lifecycle; each arm owns its observation

Decided: `probe(bucket, observe)` opens the connection, creates a fresh
file-backed R=1 bucket, and closes however the arm ends. Alternatives: leave
five copies of the connect/create/`try`/`finally` block. Why: the repetition
was the only thing standing between a reader and each arm's actual claim, and
one copy of a `finally` is one place for a leaked connection to be fixed rather
than five. Raised as a DEV-753 round-1 minor charge. **Load-bearing? no** — the
observations are unchanged.

### T7. The LCG produces probe inputs, not fixtures

Decided: the generator's comment no longer calls its output a fixture. The root
glossary reserves that word for frozen digest pins minted by the side that owns
a model, and nothing here pins a model's answer — these are ordinary runtime
inputs to a characterization probe. Raised as a DEV-753 round-1 minor charge.
**Load-bearing? no** — vocabulary.


## Task DEV-737 — the `casJoinLoop` extraction: the lawful class-(a) write path

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. Spec authority:
`docs/design/2026-08-17-plait-effect-affordances.md` A-7 whole (the refereed G-2
extraction contract, ADOPT-AMENDED) and A-8b, friction card FH-2, Part C ticket
4. G36 class: this ticket ships **class (a) machinery** — the lattice-join write
path and the local mirror of one, nothing else; the register's decision path and
the anchor's single-shot CAS stay where they are, and T7 below is the standing
refusal to merge them.

Behaviour is preserved, and the evidence is that the wall did not move: the
588-line `CellWall.test.ts`, its three byte-compared traces, and T16's two
discriminating rows (`test/CellWall.test.ts:379`, `:496`) run unchanged and green
against the live bucket.

### T0. The join is effectful, and a pure `Reducer` enters through `joinOf`

Decided: `CasJoinOptions.join` is a `CasJoin<A>` — `combine` returning
`Effect<A, Refusal>`, plus `initialValue` and `identical` — rather than the
contract's literal `Reducer.Reducer<A>`, and `joinOf(reducer, identical)` lifts a
declared algebra's reducer into that position. Alternatives: keep
`Reducer.Reducer<A>` and run the cell join unsafely at the call site (a throw
where the package's whole error discipline is a refusal value); keep it and give
the loop no join at all, deriving everything from the discipline (deletes the
pre-CAS guard's independence, T1). Why: the shipped carrier's join is not pure at
the type level — `Cell.join` runs `canonicalize` and refuses values outside the
RFC 8785 wire grammar — so a pure `combine` would have to throw or lie. This is
the same amendment A-8b already made for `absorb`, applied to the seam the
contract sketched before the shipped types were in front of it. The `Reducer`
clause survives where it was load-bearing: the brand stays earned rather than
asserted, because `joinOf` takes the exact value `Algebra.declare`
content-addresses and `Algebra.commutative` brands. **Load-bearing? yes** — it is
the signature every future class-(a) carrier is written against, and reopening it
later moves every consumer.

### T1. Carrier identity is a parameter, and the pre-CAS guard is derived from it

Decided: `CasJoin` carries `identical`, and `carries(join, state, contribution)`
— the lattice order, `c ≤ x` iff `x ⊔ c = x` — is computed in the combinator and
used for the pre-CAS guard. The guard does NOT route through
`discipline.reconciled`. Alternatives: pass the guard in as its own option (an
option no carrier would ever supply differently, and one a control could then
swap); let the discipline own it (fatal — see why). Why: the shipped loop's guard
is subsumption under BOTH committed disciplines, and that is exactly why nothing
before the retry boundary discriminates and why the boundary does. A discipline
that owned the guard would make the byte-equality control differ in two places
instead of one, and T16's boundary row — which needs the last attempt to have no
successor guard — would stop measuring what it measures. **Load-bearing? yes** —
it is the shares-everything-else property both committed cell mutants prove.

### T2. The exhausted-bound refusal is the carrier's, passed in

Decided: `CasJoinOptions.contended(attempts)` mints the absence, so the cell
adapter keeps minting `cell-update-contended` with its own law, path
(`["cell", <cell>]`), taught repair, and `got` equal to the bound it passed.
Alternatives: let the combinator mint a generic `cas-join-contended`. Why: the
kind string is what `retryAbsence` policies and the wall read —
`CellWall.test.ts:512` asserts it by name and the committed boundary trace
carries it in byte-compared JSON — so a generic kind would have been a behaviour
change dressed as a refactor. It is also the honest split: the loop knows how
many attempts it made, and the carrier knows what its absence means.
**Load-bearing? yes** — the refusal kind is a consumer-visible contract.

### T3. A refused write is carried past the read-back unclassified

Decided: `create`/`update` fail with `CasWriteFailure(conflict, refuse)` —
`conflict` the adapter's CAS classification (operation context plus code 10071),
`refuse` a thunk that mints the adapter's transport absence — and the loop reads
back FIRST, consults `conflict` second, and calls `refuse()` only on the branch
that reaches it. Alternatives: have the adapter mint its refusal eagerly and hand
the loop a `Refusal` (inverts reconcile-before-classify, seam rule 1); hand the
loop the raw cause plus a classifier function (puts a NATS-shaped `unknown` into
a carrier-generic module and makes the combinator classify, which A-7 forbids).
Why: the mint is where a cause the pinned client never raised is rethrown as the
defect it is (DEV-735), so calling it eagerly would kill a merge whose read-back
already carries the delta — a defect where the shipped loop returns success. The
thunk keeps both orders: reconcile before classify, and defect-at-the-mint.
**Load-bearing? yes** — it is two rulings' ordering held in one shape, and
`TransportDefects.test.ts`'s `genBody` seam is transcribed from it.

### T4. `MergeDiscipline` becomes the combinator's, and the cell keeps an alias

Decided: the seam is `internal/cas.ts`'s `MergeDiscipline<A>`;
`internal/cells.ts` exports `MergeDiscipline` as its instantiation at the
observation set and keeps `lawfulMergeDiscipline`, `byteEqualityReconciliation`,
`lastWriterWinsMerge`, and `makeCellServiceWith` exactly where they were.
Alternatives: leave the interface in `cells.ts` and have the loop take a
structurally-typed record (the seam then has no home and the second carrier
copies the interface); move the disciplines into `cas.ts` too (they are the cell
carrier's specific behaviours, and the negative-control files import them from
the adapter). Why: the two committed controls and the wall are the regression
evidence for this extraction, so their import paths and their build shape had to
survive it untouched — they did, with no edit to either control.
**Load-bearing? yes** — an extraction that moved those imports would have
rewritten its own witness.

### T5. Internal-first, and no revision reaches the public seam

Decided: `casJoinLoop` ships under `src/internal/`, is exported from no barrel,
and `CellState` is unchanged — revisions stay inside the adapter, where
`readState` pairs a decoded value with `KvEntry.revision` and nothing else sees
one. Alternatives: promote the combinator to a public lawful surface now; surface
`Versioned<A>` as the contract's original sketch proposed. Why: G-2 ships this
internal-first and says publication is a separate later decision, and the
`Versioned` sketch was superseded by the shipped `CellState` before this ticket
existed. A public combinator would also need its law tests and its own JSDoc
contract under ADR-0010, which is exactly the decision G-2 deferred.
**Load-bearing? yes** — it bounds what this ticket added to the public surface to
`Cell.replica` and `Cell.CellReplica`, and nothing else.

### T6. The extraction's license is the kernel ratification, not a second consumer

Decided: the module says in its own header that the second join consumers —
directory bind, admission facts, memory cells — are chartered by the ratified
G36/kernel rulings and are NOT shipped, so what licenses extracting this seam is
the kernel ratification (`docs/design/2026-08-18-plait-kernel-algebra.md` §4.2
names `casJoinLoop` as `join`'s runtime carrier), not a second adapter in this
tree. The bit-union carrier in `test/Cas.test.ts` is a fixture and says so; it
does not discharge this sentence. Alternatives: ship the extraction silently on
"we will need it" (the hypothetical-seam failure FH-2 names); build a second
consumer inside this ticket to earn it (unratified machinery, and outside the
ticket's scope). Why: one adapter today would otherwise make this a hypothetical
seam, and the honest form of that is to name the license instead of implying a
consumer that does not exist. **Load-bearing? yes** — it is the sentence a
reviewer checks the extraction's justification against.

### T7. The three CAS disciplines are never unified

Decided: pre-registered refusal, recorded here and in API log 0026. **Joins**
retry through `casJoinLoop` because idempotence discharges the ambiguity of a
lost race (F1) — a repeated delta adds nothing twice. **Registers** reconcile by
read-back comparison against the one intended record, because outcomes land at
most once (I2, seam rules 1-2; the shipped `reconcileUpdate`,
`internal/registers.ts:256-288`). **Anchors** never retry: a lost anchor CAS is a
fatal detach under the single-live-pump discipline (`lostCas` /
`lost-anchor-cas`, `internal/anchors.ts:75-86`; dispatch 31 decision 6).
Line citations are read at head after the DEV-734 spine extraction, which moved
the numbers the affordances record recorded. Alternatives: route
registers through the loop with a byte-equality discipline (their reconciliation
is not a lattice order and their retry is not idempotent); route anchors through
either loop with `attempts: 1` (an attempt bound that reads as flow control would
then be carrying an exclusivity assumption). Why: three laws, three behaviours; a
combinator licensed by F1 cannot be the carrier for a discipline F5 or the detach
rule licenses, and the resemblance of the three CAS shapes is exactly the trap.
**Load-bearing? yes** — it is the standing answer to a refactor that will be
proposed again.

### T8. The replica ships beside the loop, polling-only, with `absorb` effectful

Decided: `Cell.ts` gains `CellReplica` and `replica(initial?)` —
`current`/`changes`/`absorb` over `SubscriptionRef` — with the lower-bound,
no-absence, no-durability sentences mandatory in its JSDoc, fed by polling
`Cells.read`. `absorb` rides `SubscriptionRef.updateEffect`, not `update`.
Alternatives: put the replica in its own module (the concept module owns its
concept, API log 0018); make `absorb` pure by asserting the join cannot refuse
(true on decode-verified observations, and a lie in the type). Why: the replica
is the extracted loop's read-side sibling and its carrier is this module's;
`updateEffect` is what the shipped join's structural channel forces, and the
suite (`test/CellReplica.test.ts`) checks the two theorems A-8b cites by name
rather than restating them. A watch feed is not licensed by the landed probe
suite and is not built. **Load-bearing? yes** — the not-claimed list is what stops
a caller reading "the replica does not contain X" as a fact about the fabric.

## Task DEV-765 — the consumer seam over the pump

### T0. The seam is a plane module with a service, and a read is one step, not a stream

Decided: `src/planes/Session.ts` cuts the public consumer seam — `writ`,
`subscribe`, `read`, and the `Sessions` service with a live layer and a fixture
layer — and `read` returns one `Step` (a view plus the session it becomes)
rather than a `Stream` of views. Alternatives: a `Stream` surface, which needs
either a KV watch on the anchor bucket (this package ships no watch surface on a
KV-backed module without its own ruled ticket) or polling (which would inherit
the replica's advisory standing while presenting as a feed); a pure value module
with no layer at all (a sketch with nothing behind it, and the gap the ticket
names is precisely that subscription behaviour has no interface). Why: the
pump's output is the anchor plane, so the consumer's read is an anchored read of
that plane, and one step is exactly what the coalgebra sentence says a consumer
is — state to observation and next state. A stream is sugar over repeated steps
and can be added the day a watch is ruled; a step surface built on a stream
cannot be un-built. **Load-bearing? yes** — it is the shape everything else in
this task hangs on.

### T1. A view carries the image, not the image's name, and the reader never writes

Decided: `View.state` is the folded state itself, loaded from the anchor's
content-addressed state key and re-derived against `anchor.stateDigest` by the
adapter's existing verify-on-load; `AnchorStore` gains a read-only `load` for
it. Alternatives: return the anchor alone and let the caller resolve
`stateDigest` (a value that names an image is not the image, and the sentence
this seam is shaped by is about images); reuse `initialize` (it CREATES the
floor-zero anchor when none is present, which is a write, and a reader that
writes the frontier it is reading is a second pump). Why: the honest reading of
"the image of an anchored read" puts the image in the view and the coordinate
beside it, so a caller can check the naming itself. The anchor revision `load`
observes stays inside the adapter — a revision is write-side evidence and no
read-plane value carries one. **Load-bearing? yes** — `load` versus `initialize`
is the difference between a consumer and a second writer.

### T2. Two structural kinds: one declaration door, one scope refusal

Decided: `StructuralRefusalKind` gains `invalid-session-declaration` (holder,
views, policy, and partition — the whole shape of a subscribe request) and
`undeclared-view` (a fold the writ does not name, or a fold this session did not
subscribe to). Each gains a demonstrated trigger through a public surface in the
refusal-repair wall. Alternatives: reuse `invalid-partition-key` for the
partition arm (that kind already carries two different law sentences; a third
would make the catalogue's law column unreadable); mint a separate
`invalid-writ-declaration` (the writ exists only to scope a session on this
seam, so one declaration door is one kind); reuse `malformed-value` (that kind
is the one parse-boundary classification, and minting it by hand outside
`decodeRefusing` would make the single-seam claim false). Why: the enumeration's
own contract is "every structural kind the package can mint", and its closure is
only true at the full set. **Load-bearing? yes** — the set-equality wall is what
keeps the closure claim honest.

### T3. The writ is judged at the seam, and the fixture is what proves it

Decided: `subscribe` and `read` judge the writ, the policy, and the partition in
`Session.ts` itself, before the `Sessions` service is reached, and the shipped
control is a fixture layer that images whatever it is handed. Alternatives: put
the check in `internal/sessions.ts` (then the check is the adapter's, and any
fixture layer drops it — the estate has already paid for scope enforcement that
a substituted layer could skip); check once at subscribe and trust the session
afterwards (a session is a plain value a caller can rebuild, so a cached
admission is an admission that can be forged). Why: this is the local shape of
the one-door discipline — judgment above every host, so refusal parity does not
depend on which layer answered. The control is not decoration: the open-door
fixture would have served the undeclared view, and the refusal still lands.
**Load-bearing? yes** — it is the whole reason the writ means anything.

### T4. The ninth transport-spine row is a pin, not an independent oracle

Decided: `internal/sessions.ts` mints its own `session-transport-unavailable`
absence and takes a row in `TransportSpine.test.ts`, whose membership check
reads the source tree and would otherwise red. The row is labelled in place:
the eight rows above it are transcribed from the pre-extraction commit that is
their oracle, and this one has no such commit — it is the declaration of these
terms and a pin against later homogenization, nothing more. Alternatives: reuse
the fold or anchor adapter's absence (both teach `Folds.deploy` as the repair,
which is the wrong repair for a reader and would be a lie in the taught next
step); export no `transportRefusal` and stay out of the gate (the gate's
membership rule exists exactly so a new classification site cannot hide).
Why: saying which rows have an outside oracle and which do not is cheaper than
letting a reader assume all nine do. The homogenized-spine mutant refutes the
new row, so it is a row that can fail. **Load-bearing? yes** — an unlabelled row
would quietly widen what the wall is understood to prove.

### T5. The anchor policy is a closed two-value grammar that never enters identity

Decided: `AnchorPolicy` is `"resume" | "replay"` — resume opens at the durable
anchor the pump checkpointed, replay opens at floor zero — validated against the
declared list and refused by name when it is neither. The session records the
resulting position, so the policy itself is in no digest. Alternatives: an
opening position as a raw number (an arbitrary coordinate is not a policy, and
nothing licenses reading from a floor the anchor never held); a schema-encoded
policy value (identity-bearing ceremony for something identity never sees).
Why: two policies are the two questions a consumer actually asks — where the
frontier is, or the whole interval — and a closed grammar refuses the third
rather than defaulting silently. **Load-bearing? maybe** — a third policy would
extend the list without moving anything else.

### T6. The bounds this seam ships, stated

Decided, and recorded because each is a claim NOT made: the seam materializes
the shape of the egress-law candidate and enforces nothing beyond its own
surface — `FabricClient.subscribe`, `Blob.get`, `Catalog.get`, and
`FoldHandle.anchor` are untouched read paths, so no package-wide statement about
outbound bytes follows from this ticket. The seam does not re-prove the anchor's
monotonicity: it reports the floor it reads and no session refuses a floor that
moved backwards, because the anchor's own law is the pump's. Its live layer
ensures the ruled anchor bucket through the shared anchor adapter, which is the
one substrate call it makes that is not a read, and it is the same shape gate a
pump passes. The writ is a declaration and not a security boundary; a
type-level scope is DX, and the action plane's policy work is where an
enforceable one would come from. **Load-bearing? yes** — the not-claimed list is
what stops the next reader promoting a shape into a proof.

### T7. The new namespace rides the public-surface walk deliberately

Decided: `Session` joins `src/index.ts` and the package's subpath exports as the
seventeenth namespace, and the generated signature manifest grows by seven rows,
each carrying only `Refusal` on its error channel. This is a surface decision
taken on purpose, not a side effect of a move. Alternatives: keep the module
unexported and reach it by deep import (a seam nobody can name is not a seam);
defer the export to a later ticket (the ticket that cuts a public consumer seam
is the ticket that decides it is public). Why: the walk is the wall — a
namespace that could not be added without moving a signature would be evidence
the surface is not lawful, and the regenerated manifest is the evidence that it
is. **Load-bearing? yes** — the barrel is the package's interface, and what
enters it is a decision with a record.

## Task DEV-775 — least-privilege carrier credentials

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. Spec authority:
DEV-775, with the pinned server/client sources and the ran-it wall as substrate
authority. The archived assumptions gate at `archive/pre-estate-focus` is
mechanics reference only and is not claimed live.

### T0. Permissions are fixed carrier roles instantiated at deployment coordinates

Decided: `internal/permissions.ts` declares eight fixed roles — evidence, fact,
and node publishers; one role for each of the cell, anchor, and register KV
buckets; requester; responder — and `declareCarrierPermissionMap` instantiates
their exact lane, stream, venue, node, bucket, and credential-owned inbox
subjects. Alternatives: one application credential carrying their union; map
the not-yet-shipped semantic policy lattice directly. Why: a union recreates
the cross-lane and foreign-bucket authority this ticket exists to refuse, while
the semantic `Policy` module is not yet a shipped source of roles. The carrier
roles are the smallest current projection and can be unioned later only by the
issuer for a process whose writ actually needs several. **Load-bearing? yes** —
the cross-lane and foreign-bucket probes are red if their two roles collapse.

### T1. Application roles inspect pre-provisioned resources but receive no lifecycle API

Decided: JetStream roles receive exact `$JS.API.STREAM.INFO.<stream>` and KV
roles receive exact stream-info, direct-get, and `$KV.<bucket>.>` subjects;
they receive no stream create, update, purge, or delete subject. The shared
read-only `$JS.API.INFO` grant is stated separately on every JetStream role.
Alternatives: grant `$JS.API.>`; remove `$JS.API.INFO` by rewriting each pinned
client adapter to suppress its manager preflight; allow exact create subjects
so current adapters can provision on first use. Why: the ran-it wall observed
that `@nats-io/jetstream@3.4.0`'s `jetstreamManager()` first publishes
`$JS.API.INFO`, while the current deployment boundary already assigns resource
provisioning to the operator/daemon. Exact info keeps the existing acquisition
path operable without granting lifecycle mutation. Subject permissions cannot
distinguish a KV put from a delete marker on the same `$KV` subject; this ticket
therefore claims bucket isolation and no administrative lifecycle API, not
per-key verb separation. **Load-bearing? yes** — `$JS.API.>` would reopen every
foreign and destructive management API; omitting `$JS.API.INFO` makes the
pinned client refuse before the exact stream check.

### T2. Reply authority is credential-owned subscription plus tracked response

Decided: every request-bearing client selects a custom inbox prefix that is
pairwise token-prefix-disjoint from every other credential's prefix and
subscribes only to `<prefix>.>`; the whole-record Schema rejects equality or
ancestry in either direction. Responder roles publish no inbox subject at all
and instead carry `allow_responses: { max: 1, expires: "2s" }`. The neutral
credential/bootstrap shape lives in the internal transport spine below both
planes and carriage. Connection passwords enter as `Redacted<string>` and are
revealed only to the pinned authenticator. Alternatives: exact uniqueness only
(two distinct prefixes can still be ancestor and descendant); `_INBOX.>`
subscription; `_INBOX.>` publish for responders; define the shared bootstrap in
carriage (reverses the binding plane direction); embed passwords in the
permission declaration. Why: GitHub finding #56's live probe showed the global
subscribe grant reads other clients' replies and JetStream control bodies, and
the Round 2 review exhibited the same leak for `_INBOX.plait` versus
`_INBOX.plait.fact`; the pinned server's tracked-response permission allows
only the reply subject a request actually delivered. Secrets are environmental
and credential issuance remains DEV-745's daemon work. **Load-bearing? yes** —
the wall proves a normal reply lands, an untracked reply publish refuses, and
both `_INBOX.>` and a foreign credential's nested inbox subscription refuse as
named permission violations; the Schema control rejects token-prefix ancestry.
## Task DEV-774 — `max_payload` measured at the pin; the inline/blob threshold pinned against it

Task-local placeholders (rule 1): T-numbers restart per task. Spec authority:
`docs/research/2026-08-13-nats-vendor-corpus-scorecard.md` item 4 — the one
pre-registered item the vendor corpus left UNANSWERED ("term appears once,
bare"). Before this ticket `INLINE_BODY_MAX_BYTES` was `256 * 1024` with nothing
under it: a round number chosen against a budget nobody in this estate had
measured. The measurement is `test/MaxPayloadSemantics.test.ts`; the numbers
below are its output, not a document's.

**The measured record at the pin** (nats-server `v2.14.4`, single node, default
configuration, JetStream on a file store):

- Advertised `max_payload`: **1,048,576** bytes, read off the server's own INFO
  block.
- The server's own enforcement, past the client, over a raw socket: a `PUB`
  declaring 1,048,576 bytes is answered `+OK`; one declaring 1,048,577 is
  answered `-ERR 'Maximum Payload Violation'` and the connection is closed. The
  effective limit is the advertised limit — the boundary is exact and inclusive.
- The pinned client enforces the same boundary locally, refusing at
  advertised + 1 without sending, and the class it raises is
  `InvalidArgumentError`.
- The emit path's header block costs **91** bytes of that same budget: the
  largest body the server accepts on a JetStream publish carrying a 64-character
  `Nats-Msg-Id` is 1,048,485, found by bracketed bisection.

### T0. The header cost is measured AND derived, and the two are compared

Decided: `EMIT_HEADER_BYTES` is bisected against the live server, and the same
suite independently counts the header block the wire grammar requires —
`NATS/1.0\r\nNats-Msg-Id: <64 hex>\r\n\r\n` — and asserts the two agree at 91.
Alternatives: bisect only (a number with no explanation, and a silent re-measure
if a later slice adds a header); derive only (an arithmetic claim about a server
nobody asked). Why: walls need an oracle outside both sides, and here the two
routes are genuinely independent — one is the substrate's behaviour, the other is
the protocol's grammar, and neither is computed from the other. A future slice
that adds a second header moves the measurement and the derivation together, or
the disagreement is a finding. **Load-bearing? yes** — every margin below is
stated against `MAX_PAYLOAD_BYTES - EMIT_HEADER_BYTES`, so an unexplained 91
would make the margin unexplained too.

### T1. The margin is a quarter, and the quarter is the doubling margin

Decided: `INLINE_BODY_MAX_BYTES = MAX_PAYLOAD_BYTES / INLINE_BODY_MARGIN` with
`INLINE_BODY_MARGIN = 4`, which keeps the shipped value at 262,144 — no refusal,
document, or fixture moves. The margin's justification is a worst case, not a
round number: a lane declared with an empty partition-key path keys by the whole
event, so `key` and `body` are the same value and ONE emit at the threshold
publishes the body TWICE. Measured on the wire, that frame is 524,430 bytes
against a 1,048,485-byte emit budget. Alternatives: a half-budget threshold
(524,288 — the doubled worst case then sits 200 bytes inside the budget, with the
envelope's framing already spending 142 of them, so a slightly longer holder
string breaks it); an eighth (headroom nobody asked for, and a smaller inline
class pushes ordinary bodies into the blob store for no measured reason); leave
256 KiB unexplained. Why: the doubling is an admitted shape of this package's own
lane grammar, not a hypothetical, so the margin has to absorb it with room left
rather than exactly. **Load-bearing? yes** — the quarter is what makes the
threshold a consequence of the measurement instead of a coincidence that agrees
with it.

**Stated residual, and it is real.** The threshold bounds the BODY, not the
FRAME. `holder`, `pins`, and `cert` are caller-supplied and unbounded, so a
caller attaching tens of thousands of pins can still exceed the budget with a
lawful body. That case is not refused by the threshold; it reaches the substrate
and dies there (T2's second paragraph). Bounding the frame is a different law and
needs its own ruled ticket — it is named here and deliberately not minted, the
same fence KM-22 holds around the chunk-manifest laws.

### T2. The threshold's substrate half is a FLOOR, checked at the emit seam

Decided: `Wire.hasPayloadBudget` asks whether a live server's advertised
`max_payload` is at least `MAX_PAYLOAD_BYTES`, and `internal/lanes.ts` runs it
once at service construction, refusing `payload-substrate-shape` — a new
structural kind — when it is not. A floor, not a pin: a server advertising MORE
carries every emit this threshold admits and is not a violation. The arithmetic
half of the check (that the pinned budget really does carry a doubled body at the
threshold plus the header block) is asserted over the constants alone and needs
no server.

The hazard it closes is specific and was measured, not imagined. `max_payload` is
operator-set server configuration with no command-line flag, so a lowered value
is an ordinary deployment, not a corruption. Against such a server the threshold
is folklore again and an emit at it fails past this package's entire error
channel: the pinned client raises the over-budget publish as
`InvalidArgumentError`, which `internal/transport.ts` names a caller-defect class
and RETHROWS rather than minting a retryable absence (the B-7 disposition). The
refusal vocabulary would simply not be reached.

Alternatives: reuse `lane-substrate-shape` (its law sentence is about the
partition stream's config; two laws under one kind is exactly the taxonomy blur
`kind` exists to prevent, and a caller branching on kind would get the wrong
repair); check at every emit rather than at acquisition (the same open-time
assertion the stream and bucket gates make — scorecard hazard 3 records that
these gates never re-check, and standing re-assertion is one ruled ticket for all
of them, not a thing this ticket invents for one gate); check nothing and
document the threshold (the definition of folklore).

**Deliberately untouched, and stated rather than quietly fixed.**
`FabricClient.publish` (`internal/nats.ts`) encodes envelopes through the same
`Wire` door and publishes them on the commons control subjects; it does not carry
this budget check. That seam is the commons publish path, not the emit seam this
ticket names, and widening the gate to it is a scope call for whoever rules it.
The residual is exactly T2's hazard on that one path. **Load-bearing? yes** — the
check is the difference between a pinned constant and a comment.

### T3. The negative control is a real under-budget server, not a mocked INFO block

Decided: `test/NatsHarness.ts` gains an optional `config` string, written to a
file the server loads before its flags, and the control starts the SAME pinned
binary with `max_payload` lowered. `max_payload` has no command-line flag, and
nats-server applies `-c` first and lets the flags override, so JetStream, the
store, and the ephemeral port are untouched. Alternatives: stub `connection.info`
behind the client (the check would then be tested against this test's idea of a
server, which is the both-sides-agree failure the estate refuses); assert the
predicate in isolation and ship the seam untested (a shape check that has never
refused a substrate is not evidence that it can). Why: a prover that cannot fail
proves nothing, and the only honest way to make this one fail is a substrate that
really does advertise less. The control also asserts what did NOT happen — no
lane stream is ensured on the refused substrate — because refusing at acquisition
is the behaviour, not merely refusing. **Load-bearing? yes** — this row is the
whole reason the shape check counts as a wall.
## Task DEV-797 — the negative trace's diagnostic class

### T0. A committed negative trace commits to error-class diagnostics only

Decided: `check:type-control` compares the error diagnostics in a control's
compiler output — the header line and the indented message chain under it — and
drops `suggestion`, `message`, and `warning` alike, on the fresh compile and on
the committed file both. The rule lives in `scripts/negative-trace.ts` with the
reason it is drawn there, and `test/NegativeTrace.test.ts` is its wall.
Alternatives: re-record the twenty traces with the Effect language service's
advisories in them (cheap, and it makes every control a second lint gate that
reds on `src/` edits it does not watch — the advisories move whenever a rule
ships or a module is touched, so the gate would need re-recording forever);
repair the six advisories on `src/` (real quality work, and useless as the
unblocking step, since the seventh advisory reds the gate again). Why: a
negative control asks one question — does the mutant compile, and does it fail
for its committed reason — and only an error answers it. An advisory is a
property of the package's own source, never of the mutant, so a trace that
committed one would be answering a question nobody asked it. The arm does not
weaken: a mutant that compiles still exits zero, and a filtered trace that comes
back empty is now its own refusal, so a compile that failed for anything other
than a diagnostic can no longer read as a control that failed for its committed
reason. **Load-bearing? yes** — twenty controls compare on this rule, and the
six advisories it declines to gate on stay open findings for their modules'
owners.

## Task DEV-766 — T-address: explicit roots and iterated-resolve path sugar

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. Spec authority:
`scratch/dispatch/2026-08-18-plait-plane-reorg-spec.md` §5/§6 (stage 3, the
`at(root, ...names)` row); conceptual basis KM-15 and KM-16 in
`docs/research/2026-08-18-kernel-model-notes.md`.

The ticket's own bound, kept: **no new machinery.** `Address.ts` ships no
service, no layer, no store, and no cache. Every hop is `Resolved.resolve`, so
verify-on-read is inherited rather than restated, and the one row that spends
that inheritance is the lying-catalog walk in `test/Address.test.ts`.

### T0. The seam ships as public surface, and four manifest rows are the decision

Decided: `Address` is exported from the barrel and from `package.json`, so the
seam rides the T7 public-surface walk deliberately. The four rows it added to
`test/PublicEffects.signatures.txt` are the whole surface change and are the
auditable form of the ticket's "any new public surface is its own explicit
decision, never a side effect". Alternatives: internal-first behind `internal/`
(the Cell T5 shape) with a later export ticket; export the schemas as types only.
Why: the spec's leverage line for this seam is that agents navigate by resolve,
which is a claim about a surface callers can reach — an unexported walk would
have been a sketch of that claim rather than the claim. **Load-bearing? yes** —
it bounds what this ticket added to the public surface to `Address` and nothing
else.

### T1. `at` answers an address, not a value

Decided: `at(root, ...names)` returns the `Digest` the path names; the value is
one `Resolved.resolve` away and the caller performs it. Alternatives: return the
resolved wire value (the spec sketch reads that way); ship both `at` and a
`read` that composes it with `resolve`. Why: a binding names a digest, and
whether that digest resolves — and against which store — is the reader's
question, not the walk's. Returning the address also keeps `at` composable with
`ResolvedOf` codecs, `Blob`, and the resolve memo without this module knowing any
of them. A `read` helper would have been `Effect.flatMap(at(...), resolve)` with
a name, which ADR-0010 prices as a public function with no law of its own.
**Load-bearing? yes** — it is why the module has no second decode path.

### T2. Unbound and ambiguous are structural, because a root pins a snapshot

Decided: `unbound-petname` and `ambiguous-binding` are `StructuralRefusal`s.
Alternatives: mint `unbound-petname` as an `AbsenceRefusal`, by analogy with
`cataloged-value-absent` and `blob-absent`. Why: those two are head-relative
because a store can acquire bytes it lacks; an unbound name under a *fixed root
digest* cannot change, because the root names one immutable directory and a
retry re-reads the same bytes. Classifying it as absence would put it inside
`Refusal.retryAbsence`'s policy and spin a caller against a permanent answer.
The head-relative fact on this path is whether a store holds the directory at
all, and that arrives as `resolve`'s own absence, passed through untouched.
**Load-bearing? yes** — it is the sentence that makes the sort assignment
checkable rather than a habit.

### T3. The carrier is a binding SET, so ambiguity is refused rather than decided

Decided: `Directory.bindings` is a set of `(petname, digest)` pairs, not a map,
so one name bound to two digests is representable; a walk that meets it refuses
`ambiguous-binding` listing both candidates in identity order. The model's
fourth verdict — the binding sealed at the greatest observed fencing token — is
NOT read here, and the refusal's repair says arbitration is a fenced register
decision. Alternatives: a map carrier, which makes the ambiguity unrepresentable
by silently letting one binder overwrite another; read seals from `Registers` in
this module. Why: the map carrier hides a concurrent-bind conflict as a
last-writer-wins outcome, which is the shape this package refuses everywhere
else; and reading seals here would stand a second arbitration path beside
`Register.ts`, which owns the fencing token. **Load-bearing? yes** — it is why
this module has an ambiguity refusal at all.

### T4. The directory header is closed, so a wrong hop refuses instead of reading empty

Decided: `Directory` carries `{ v: 0, kind: "directory", bindings }`, and a hop
whose value does not decode against it refuses `not-a-directory` naming the
segment that produced the digest. Alternatives: accept any `{ bindings }`-shaped
value; let the parse boundary's generic `malformed-value` fly unwrapped. Why:
without the discriminator every cataloged object without a `bindings` key would
read as a directory that binds nothing, which turns a navigational error into an
`unbound-petname` — a wrong repair, taught confidently. The wrapper adds only
the position the walk was at, which the schema cannot know; the schema is still
the judge. **Load-bearing? yes** — it is why a walk cannot silently reinterpret
a value. NARROWED round 2 by T11: the header is what this kind answers for. A
value whose header holds and whose bindings do not is a directory, and refusing
it here taught a repair for a digest that already holds one.

### T5. The explicit-root fence is a compile control, not a runtime check

Decided: `at`'s first parameter is the root `Digest`, so a rootless walk has
nowhere to be written, and `negative-controls/Address.rootless.mutant.ts` under
`bun run check:address-control` is the evidence — a lawful twin beside the
planted spelling, and the committed diagnostic compared byte-for-byte.
Alternatives: accept a path object and refuse a missing root at runtime; document
the fence only. Why: this is the ambient-input precedent the kernel builder's
clock control already states — the surface refuses the shape by having no field
to put it in, and a runtime check would leave the shape spellable. Escape
attempts (`.`, `..`, separators, control characters) stay runtime refusals
because they are string data and cannot be typed away. **Load-bearing? yes** —
it is the ticket's ambient-input requirement in its strongest available form.

### T6. Seven names, and the joins the module does not ship

Decided: the surface is `Petname`, `Binding`, `Directory`, `directory`,
`petname`, `at`, `list` — no `Path` value type, no `join`, no `read`, no watch.
The join of two directories is `directory([...left.bindings, ...right.bindings])`
and the JSDoc says so; a live view is the consumer seam's (DEV-765).
Alternatives: ship `Path` as a cataloged struct so an address travels as data;
ship `join` beside `directory` the way `Cell` ships `join` beside `canonicalize`.
Why: a path travels as a root plus names today and no consumer names a `Path`
value, so the struct would be a hypothetical seam; and `Cell.join` exists because
a cell's join is the write path's operation, while a directory's join is one
`directory` call over a concatenation. **Load-bearing? yes** — it is the standing
answer to each of these being proposed as an obvious addition.

### T7. Four refusal kinds, because four different repairs are taught

Decided: `invalid-petname`, `not-a-directory`, `unbound-petname`, and
`ambiguous-binding` enter `StructuralRefusalKind`, and each is triggered through
the public surface in `test/RefusalNext.test.ts` — the gate that refuses a kind
no shipped path can mint. Alternatives: reuse `malformed-value` for the first
two and a single `unresolvable-path` for the last two. Why: the four name four
distinct repairs — fix the name, publish a directory there, bind the name, bind
it to exactly one digest — and a refusal that cannot say which one is a diagnosis
the caller has to redo. **Load-bearing? no** — the classification could be merged
without changing what any path admits. AMENDED round 2: the four are not four of
a kind. `ambiguous-binding` is the model's own spelling and is walled against the
corpus (T10); the other three are hand-written entries in a refusal vocabulary
the generated taught-refusal table does not own, and they wear T9's Law 1 waiver
citing DEV-796. The count is unchanged; what changed is that three of them are
now recorded as debt rather than as design.

### T8. The control records errors only, so the fence is not coupled to lint advice

Decided: `check-address-negative.ts` compares the `error` diagnostics and drops
every advisory severity, and an empty error set fails the control. Recorded on
the rebase onto the `@effect/tsgo` / TypeScript 7 pin, which made the compiler
emit `suggestion` diagnostics for every file the control's project pulls in —
including `truth/Refusal.ts` lines this ticket does not own and may not edit.
Alternatives: record the suggestions too (the trace then moves whenever anybody
cleans up an unrelated module, and this fence starts reporting other people's
work); silence the plugin for the control's project (a compiler flag this
control would then depend on, in a file the ticket does not own). Why: the
control's claim is that the rootless spelling does not compile, and for which
reason — advisory lint output is not that claim, and a trace that encodes it
fails for reasons the fence is not about. The prover can still fail: making the
planted spelling lawful reports `typechecked` rather than a moved trace.
**Load-bearing? yes** — it is why this control stayed green across a toolchain
swap that moved the package's other committed traces. AMENDED round 2: DEV-797
landed the same rule as `scripts/negative-trace.ts` for every control in the
package, so this script no longer states it — it imports `errorDiagnostics` and
applies it to both sides, fresh compile and committed file, which is the shape
`check-public-effects-negative.ts` uses. A control carrying a private copy of
the contract it claims to apply is a control that can drift from it.

### T9. Petname derives from the generated projection; Binding and Directory wear a waiver

Decided: `Petname`'s carrier is the generated `KernelPetname` — `{ text }`, from
`kernel/KernelSchemas.generated.ts` — with this module's name law added as one
admission check; `Binding` and `Directory` stay hand-written and carry an
explicit **Law 1 waiver citing DEV-796** in the module header and on each type.
Alternatives: keep the branded-string `Petname` beside the generated one (what
round 1 shipped, and the defect the review named: two carriers and two laws for
one concept); waive `Petname` too, since a waiver is cheaper than a wire-shape
change; hand-write an F12 projection for `Binding`/`Directory` in this ticket
and call it generated. Why: Law 1 admits exactly two answers — derive, or wear a
waiver that cites the unification ticket — and which answer is available is a
fact about the corpus, not a preference. `Petname` HAS a generated projection,
so waiving it would be declining a derivation that exists; the F12 directory
family does NOT, so a waiver is the only honest answer and inventing a
"generated" projection by hand would be the served-equals-derived violation Law
3 refuses. The cost is the wire shape: a binding's name is now `{ text: "…" }`
rather than `"…"`, which is the model's shape and no consumer's yet. Paying it
before the seam merges costs nothing; paying it after would be a migration.
**Load-bearing? yes** — the waiver is the row these types occupy in DEV-796's
debt ledger, and the derivation is why `Petname` is not in it.

### T10. `ambiguous-binding` is read from the corpus, and the wall is what makes that true

Decided: the reason string is the model's, taken from the F12
`ambiguous-across-bind-orders` row of `fixtures/fabric-conformance.ndjson`, and
`test/Address.test.ts` runs a real ambiguous walk and compares the refusal it
mints against that row. The name stays a private constant: the wall reads the
refusal, not an exported string. Alternatives: hand-type the literal and note
the coincidence in prose (which is what round 1 did, and prose does not red);
export the constant so the wall has something to compare (an eighth public name
bought to test a private one); generate the whole `StructuralRefusalKind` union
from the corpus (the right end state, and it is DEV-796's, not this ticket's —
the other 36 kinds are not this ticket's to move). Why: the corpus already names
this verdict, so a second spelling of it in the estate is drift with a green
gate, and the difference between "we happened to pick the same word" and "the
word is the model's" is a comparison that runs. The wall bites: renaming the
minted kind fails it. **Load-bearing? yes** — it is the only mechanical link
between this module's vocabulary and the model's, and the three kinds without
one are exactly the three that wear the T9 waiver.

### T11. A directory whose bindings do not decode is not `not-a-directory`

Decided: a hop decodes the closed header first and the bindings second. Header
failure is wrapped as `not-a-directory` naming the hop; a value whose header
holds but whose bindings do not fails with the SCHEMA's own refusal, unwrapped,
naming the field and the law. Alternatives: keep the single decode, which round
1 shipped (a well-formed directory carrying one unlawful petname refused as
`not-a-directory` and taught "publish a directory under this digest" for a
digest that already holds one); add a fifth kind for the malformed-binding case.
Why: T4's argument is that a wrong hop must not be reinterpreted, and T7's is
that a refusal which cannot say which repair applies is a diagnosis the caller
redoes — both point the same way here, because the value IS a directory and the
navigational repair is wrong for it. The fifth kind was refused for T9's reason:
a new hand-written refusal name needs a waiver it cannot earn when an existing
refusal already says the right thing. **Load-bearing? yes** — it is why the two
questions a hop asks have two answers.

### T12. Canonical order is compared as bytes, because that is the sentence written down

Decided: `directory` sorts bindings by their RFC 8785 canonical bytes compared
as BYTES, not by those bytes decoded to a JavaScript string. Alternatives: keep
the round-1 string comparison and reword the JSDoc and `CONTEXT.md` to say
"UTF-16 order over canonical bytes". Why: both orders are deterministic
functions of the set, so the fold's own property — the digest names the set —
held either way, and this is not a repair of a broken invariant. It is a repair
of a false sentence: UTF-16 code-unit order and UTF-8 byte order disagree
outside the BMP, where a surrogate pair sorts below U+E000–U+FFFF as code units
and above them as bytes, and `CONTEXT.md` tells a Go-side implementer that the
order is RFC 8785 byte order. Rewording would have been equally honest and
strictly worse: byte order is the one an implementation on another runtime
reaches for. `test/Address.test.ts` pins it with an astral name and fails under
the string comparison. **Load-bearing? yes** — it is a cross-runtime interop
claim, and the test is what makes it one.
## Task DEV-796 — the public type-universe inventory wall

### T0. Generated-core derivation belongs only to declarations owned by the generated core

Decided: the emitted `src/index.d.ts` barrel is the public-type quantifier, and
an exported type classifies as `derives-from-the-generated-core` only when its
resolved declaration is owned by `KernelCorpusSchemas`,
`KernelSchemas.generated`, or `KernelTables.generated`. Every hand-written
declaration is `debt-with-a-ticket`, including a wrapper, union, or structural
twin that mentions a generated type. The truth vocabulary is debt under
`DEV-795` stage 2+, not an admitted floor. Alternatives: accept `src/truth/` as
a terminal floor (contradicts standing law 1); accept existential ancestry to
a generated declaration (a hand-written union can add a member while retaining
that ancestry); mark every type in a module as derived when any import names a
kernel file (an unused import would erase unrelated debt); inspect source text
for type names (aliases and transitive declarations would escape). Why:
declaration ownership distinguishes generated authority from hand-written
composition without trying to prove structural equivalence.
**Load-bearing? yes** — adding any second admitted root can turn unification
debt green without changing the public type.

### T1. Report and enforce consume one classification; only the exit contract changes

Decided: report mode byte-compares the generated debt ledger and exits green
with the two measured counts, while `--enforce` runs the same inspection and
refuses every `debt-with-a-ticket` row. Each debt row names its owning source
module, existing ticket, and unification target: `DEV-795` stage 2+ for truth
and hand-written kernel declarations, `DEV-795` stage 3 for plane declarations,
and `DEV-763` stage 4 for carriage and surface judgment. An owner outside those
ruled targets has no default waiver and makes generation fail. Alternatives:
maintain separate report and enforce walks (the future flip could change the
quantifier); assign every unknown owner to the epic automatically (that would
create unratified waivers); make nonempty debt red now (contradicts this
ticket's inventory-only stage). Why: the ratifiable object, the control, and the
later wall execute the same classification and enforcement path.
**Load-bearing? yes** — a second enforcement path or a catch-all target could go
green over a different universe from the ticketed inventory the operator
ratified.

### T2. Enforce mode answers enforcement alone, so the control can name the law it drops

Decided: `--enforce` classifies, refuses every debt row, and stops; the ledger
byte-comparison belongs to report mode only. The planted control owns a second
committed ledger of its own next to the mutant, and runs two arms through the
production check: the refusal arm requires `--enforce` to refuse its six
planted twins against the committed trace, and the admission arm requires report
mode to reproduce the planted ledger byte-for-byte, one derived and six debt.
Both committed artifacts are written by executing the control under `--write`.
Alternatives: compare the inspection's violations in a second control path (the
production enforcement branch could disappear while the control stayed green —
the shape this ticket's review refused); let the control share the package
ledger (measured: dropping the enforcement branch then failed the control on an
incidental ledger diff, so the control reported a moved ledger for a missing
refusal and could not name its own law); keep the ledger comparison inside
enforce mode (same entanglement, one mutation away); plant only the union
widening (an interface extension, intersection, alias, and mapped type are the
other shapes a hand-written twin takes, and each had to be measured, not
assumed). Why: a negative control asks one question, and an arm that can go red
two ways answers neither.
Enforce mode is therefore deliberately not a superset of report mode: it never
byte-compares the ledger. The consequence binds the stage-3 flip (DEV-805) —
report mode keeps running alongside enforce, because a `test:fast` that swapped
one for the other would leave the committed inventory gated by nothing exactly
when its debt table goes empty and the count line becomes the whole artifact.
**Load-bearing? yes** — four mutation arms were run against this pair, and the
two that drop enforcement now both report the accepted mutant rather than a
ledger diff.

### T3. A symbol is generated only if nothing hand-written declares into it

Decided: derivation quantifies universally over the resolved symbol's whole
declaration list, and a symbol carrying no declaration is debt. The five twins
T2 plants all resolve to a declaration the mutant file owns, so an existential
test refuses them and reads as sufficient. Measured, it is not: a module
augmentation declares INTO the generated symbol rather than beside it, so after
`declare module ".../KernelTables.generated.js" { interface KernelRefusalRow {
readonly handwrittenRider?: string } }` the public type carries a hand-written
member while its declaration list still holds the generated one. Executed on the
existential rule, the control ledger recorded two derived types — the direct
re-export and the augmented row — and the augmented row raised no violation at
all. That is the false-positive direction law 1 forbids, reached without a
wrapper, an alias, or a twin, and it is the only one of the six shapes that
survives an ownership test written existentially. Alternatives: forbid
augmentation by review (an unwalled rule the emitted barrel cannot see); ban
`declare module` by lint (it would miss interface merging that arrives another
way); compare emitted members against the corpus (structural equivalence is the
proof this wall deliberately does not attempt). The universal test costs nothing
on a clean surface — a generated declaration nothing augments satisfies it
unchanged, and the package ledger's 93 rows and 0 derived count are identical
either way. The empty-list guard carries its own weight: `every` is vacuously
true, so an undeclared symbol would otherwise pass as generated core.
**Load-bearing? yes** — restoring the existential rule re-admits the
augmentation, and the control's committed trace goes red naming the shape that
went missing.

### T4. An anchor is a machine-generated file or it is not an anchor

Decided: `generatedCoreAnchors` lists exactly the machine-generated declaration
files, and the list's element type is the template literal
`` `src/kernel/${string}.generated.d.ts` `` — a hand-written path is
unrepresentable, so the walk cannot be granted authority over a file nothing
byte-gates. DEV-800 round 2 measured the cost of the alternative:
`KernelCorpusSchemas.d.ts` sat in the list, is hand-written by the package's
own admission (`scripts/kernel-schemas.ts` — the grammar of that file cannot be
generated from the file it reads), and a type appended to it classified
`derives-from-the-generated-core` with no ledger row and, under `--enforce`, no
output at all. That is laundering in the false-positive direction law 1
forbids, wearing the label the wall exists to police. Its types are
`src/kernel/` staged debt now, like every other hand-written declaration, at no
cost on the clean surface: no public type resolves to that file today, so the
package ledger's 93 rows and 0-derived count are unchanged. Alternatives: keep
the anchor and byte-gate the file (there is nothing independent to gate it
against — that is what hand-written means); an operator waiver row (a waiver
names debt, never authority). **Load-bearing? yes** — restoring the entry is a
type error in the walk itself, and the round-2 plant (a type appended to
`KernelCorpusSchemas.ts`, re-exported through `Wire`) classifies as ticketed
debt under the current rule.

## Task DEV-764 — the rung ladder as brands

### T0. The rung brand carries law atoms, never a rung name

Decided: `Algebra.ts` brands a declared algebra with a set of phantom law atoms
(`Total`, `Associative`, `Identity`, `Commutative`, `Idempotent`, `Bounded`,
`Inverse`) and names rungs as intersections of those atoms. "At least this rung"
is then plain structural assignability, and the ladder's poset shape — the two
tops are incomparable, because an idempotent group is trivial — falls out of
intersection subtyping rather than a table. Alternatives: brand with the rung
name and compare names (needs a lookup table the moment a right asks for "at
least commutative", and cannot express the intersection a product algebra
inherits); a conditional-type comparison over a rank (invents a total order the
mathematics does not have). Why: the encoding that needs no machinery is the one
that matches the mathematics. **Load-bearing? yes** — every routing decision
below rests on it, and a rung-name brand would have to be rewritten to admit the
product combinator.

### T1. `CommutativeAlgebra` becomes an alias and the runtime witness becomes a law set

Decided: `CommutativeAlgebra<State>` is now `Algebra<State, CommutativeMonoid>`,
and the single non-enumerable `commutative` witness becomes one non-enumerable
`earnedLaws` array read by `earnedLawsOf`, `hasRung`, and — derived, not
duplicated — `hasCommutativeWitness`. No call site moved, no refusal changed, no
digest changed: the brand is phantom and the witness is non-enumerable, so
neither reaches canonical bytes. Alternatives: keep the one boolean witness and
add a second per rung (the witness set stops being readable as one fact, and the
door has to consult n symbols); brand at declaration time from a rung argument
(a brand that is asserted rather than earned, which is the thing the door
exists to prevent). Why: one witness, one reader, and the shipped commutative
door keeps minting exactly the refusal its committed trace records.
**Load-bearing? yes** — it is what makes "every existing test passes unchanged"
true rather than hoped.

### T2. No refusal kind ships with the ladder, and that is a reported blocker

Decided: the compile-time half of the ladder ships; the runtime branding door
for rungs above commutative-monoid does NOT, because it would need a refusal
kind (`unearned-rung`) and two decisions nobody has made — whether a
seventeenth model refusal reason is add-only, and how the shipped
`unearned-commutative-algebra` kind is deprecated rather than doubled. Adding a
kind also costs the totality wall: `test/RefusalNext.test.ts` requires every
`StructuralRefusalKind` literal to be produced by a live refusal, so a kind with
no minting path either fails the wall or weakens it with an exemption.
Alternatives: mint the new kind and add an exemption row (a wall that exempts
the row it was just given proves less than it did yesterday); reuse
`unearned-commutative-algebra` for every rung (two meanings, one name — the
incoherence the naming rule exists to prevent). Why: an executor never decides
the spec it builds against. **Load-bearing? yes** — it is the boundary between
what this slice claims and what it defers.

### T3. The rung⇒carrier rule bites at the fold door for one row, and the record says which

Decided: `Fold.DeclareOptions` states its algebra bound as
`LawsFor<LaneQuotient<Partitions>>`, so the shipped partition constraint stops
being a special case and becomes the rung⇒carrier rule instantiated at the one
carrier a fold declares — one partition reads the positioned plane, more than
one reads the multiset presentation. The set-plane row of the rule is exported
as vocabulary (`Quotient`, `DeepestQuotient`, `Reads`) and controlled at a read
site the control file declares, because no shipped function takes a quotient
yet. Alternatives: put a `carrier` field on `FoldDeclaration` (it is inside the
fold digest, so every existing fold would be renamed — not additive, and the
ticket's own fence forbids it); ship a `readFrom`/`publish` seam to give the
rule a consumer (a function with no law and no caller, which ADR-0010 refuses).
Why: the brand rides the handle type and erases at encoding, so the rule can
grow a consumer later without touching one identity. **Load-bearing? yes** — it
is why the set-plane control is honest about proving the rule and not the
enforcement.

### T4. The door walks the atom list it attaches, so `total` is earned

Decided: `Algebra.commutative` walks `rungLaws["commutative-monoid"]` atom by
atom over its derived cases through `lawSuite`, and brands from the **same
array** it walked. Before this the door checked identity, associativity, and
commutativity and attached a four-atom set including `total`, so the one atom
the fold door discriminates on was granted rather than earned — against the
rule this package's own glossary states. The refusal now names the atom that
failed and its case index. Alternatives: drop `total` from the
commutative-monoid row (the rung is wrong then, and `Magma` would name nothing
a suite can check); check the atoms from a second hand-listed bundle beside the
table (which is the drift the one-array construction exists to prevent). Why:
"a brand is the earned atom set" has to be a property of the code, not a rule a
reader enforces — a row that grows an atom grows the obligation by
construction. The isolating control is an absorbing monoid whose identity,
associativity, and commutativity all hold and whose `combine` leaves the wire
grammar. **Load-bearing? yes** — it is the difference between a brand and an
assertion.

### T5. The ladder is stated once, in the data, and the bundles are names for its rows

Decided: `rungLaws` is the single statement — `as const satisfies` over
`LawName`, so an atom the brand map does not carry fails to compile in the
table. `RungName` is `keyof typeof rungLaws`, `RungLaws<Rung>` computes the
intersection from the row, and the six rung types are **interfaces extending
`RungLaws<"...">`** with empty bodies. Alternatives: keep the three statements
and add a test comparing them (a wall over a duplication is still a
duplication, and it was the reviewer's minor); keep type aliases instead of
interfaces (correct, and a refusal then prints the expanded intersection rather
than the rung's name — the controls' committed traces read `CommutativeMonoid`
because of this choice). Why: `RungLaws` as a hand-written name-to-bundle
lookup was precisely the table the laws-not-names encoding exists to avoid, and
it was sitting in the file that argues against it. **Load-bearing? yes** — the
generator this ladder owes now has one row to replace instead of three.

### T6. The ladder is Law 1 debt with an explicit waiver, not a twin

Decided: the ladder stays hand-written for this slice and carries its waiver in
the source — `rungLaws`' docstring names the missing `Law` and `Rung`
inductives, the two absent corpus groups, and DEV-796 as the unification
ticket. Verified rather than assumed: `KernelCorpusSchemas` enumerates nine
record groups and none is `law` or `rung`, and `verify/kernel` declares no such
inductive, so there is nothing generated for this to twin. Alternatives: block
the slice until the generator lands (the seam the reorg spec ratified would
wait on a model increment nobody has scheduled, and the ladder's TypeScript
half is what stage 3 was cut for); ship without the citation (which is the one
thing the hardened law's waiver sentence names). Why: the law's defect is a
hand-written definition of a corpus concept, and the honest response to a
concept whose generator does not exist yet is a single statement wearing a
citation, not a quiet one. Whether a waiver may cover NEW surface or only the
existing inventory is the operator's reading to give; this records the
citation either way. **Load-bearing? yes** — it is the row DEV-796's sweep
takes.

### T7. The mutation arm relaxes the door's bound instead of restating the door

Decided: the arm derives its weakened options from the shipped type —
`Omit<DeclareOptions<...>, "algebra"> & { algebra: DeclaredAlgebra<State> }` —
so the only difference from the real door is the rung, and a field added to
`DeclareOptions` arrives in the arm too. Alternatives: hand-copy the three
fields (what shipped in round 1; faithful the day it was written, and silently
stops mirroring the door the first time the door grows); drop the arm for that
row and rely on the lawful twin (the twin proves the shape is well-formed, not
that the rung is what refused). Why: an arm whose job is isolating one
difference must not be able to acquire a second one. **Load-bearing? yes** —
without it the arm's claim decays without any test going red.

### T8. Every conditional on the rung⇒carrier rule is undistributed

Decided: `LaneQuotient`, `DeepestQuotient`, `Reads`, and `LawsFor` all check
through a tuple. A distributive conditional over a naked parameter maps a union
of partition counts to a union of bounds, and a union of bounds is satisfied by
its weakest arm — a lane typed `DeclaredLane<E, 1 | 4>` took an algebra that
earned nothing while a `DeclaredLane<E, 4>` was refused. Its committed control
is `Fold.union-partitions.mutant.ts`. Alternatives: constrain lanes to literal
partition counts (a real narrowing of a shipped surface, for a hole the rule
can close itself); leave it, since the runtime door still refuses on
`partitions > 1` (true, and the slice exists to make the type half carry the
rule). Why: "the deepest quotient its algebra respects" has one reading for a
union — the strictest arm any member reaches. **Load-bearing? yes** — it is the
difference between a bound and a suggestion.

## Task DEV-808 — one generated refusal vocabulary

### T0. The runtime roster is a reviewed projection input, never a second public union

Decided: the 36 existing structural-refusal spellings move unchanged into
`scripts/kernel-runtime-refusals.ts`. The kernel-table generator resolves each
one against the model-emitted refusal rows and emits both its ancestry and the
closed runtime tuple; `truth/Refusal.ts` consumes the schema generated from
that tuple. Alternatives: teach the generator the spellings inline (hides the
reviewed datum inside mechanics); keep the schema's hand-written literal list
(preserves the twin this task removes); rename minting sites to the model's 16
taught reasons (changes persisted vocabulary and taught meaning). Why: one
small input makes current runtime truth explicit while every public and
internal consumer gets the generated value. **Load-bearing? yes** — the runtime
schema has no independent literal left.

### T0a. The vocabulary is emitted into `truth/`, not imported up from `kernel/`

Decided: the generator writes a second artifact,
`src/truth/RefusalKinds.generated.ts`, and `truth/Refusal.ts` imports its
sibling. Root Law 4 makes `truth/` the deepest plane and permits it to import
only itself, so the first shape of this task — `truth/Refusal.ts` importing the
schema from `kernel/KernelSchemas.generated.ts` — bought corpus ancestry by
crossing the architecture boundary it was required to preserve, which is a
blocker in its own right. Alternatives: leave the union hand-written in
`truth/` (the twin Law 1 refuses); move `Refusal.ts` up into `kernel/` (moves a
public export path and every plane's import of it); relax Law 4 for generated
files (a law that admits its own exception stops being a wall). Why: a
generated artifact carries no import-direction debt — its ancestry is the
generator, and the emitted file is a corpus projection landing in the plane
that speaks it. Two emissions of one projection are not two vocabularies:
`check:kernel-tables` byte-compares both against one render, so they cannot
part company. **Load-bearing? yes** — this is what makes the vocabulary
corpus-derived and plane-lawful at the same time.

### T0b. No identifier annotation rides the emitted schema

Decided: the generated `StructuralRefusalKind` is a bare `Schema.Literals`. An
earlier revision annotated it with `identifier` and `title`, which changed a
failed decode's reported expectation from the admitted literal list to the
schema's name, and changed the exported JSON Schema from an inline enum to a
titled `$ref`. Both are wire-visible at every site that decodes a refusal kind.
Alternatives: keep the annotation and pin the new texts (a persisted-vocabulary
change this task has no licence to make); annotate and exempt the affected
sites (an exemption list is the drift). Why: this task unifies where the
vocabulary comes from and nothing else; `decodeRefusing` reports the same bytes
at the head as at the base. **Load-bearing? yes** — the taught-payload wall
below would otherwise be pinning texts this task itself had moved.

### T1. A corpus miss is generated Law 1 debt owned by DEV-804

Decided: a runtime spelling present in the kernel refusal table is marked
`kernel-corpus`; every miss is emitted as `staged-debt` with waiver `DEV-804`.
The generated vocabulary is the stable union of corpus order followed by new
runtime rows. Alternatives: call all runtime rows corpus-derived (false for all
36 at this revision); omit missing rows until DEV-804 (leaves the runtime union
outside generated truth); copy the runtime's law and next text into the corpus
table (hand-authors model output). Why: the waiver records the exact conversion
debt without inventing model ancestry or changing a refusal payload.
**Load-bearing? yes** — provenance is what distinguishes staged unification
from a renamed hand-maintained twin.

### T2. Containment compares three artifacts, and the staged debt is pinned

Decided: `check:refusal-vocabulary` reads the runtime union out of the
truth-plane module's *source bytes* through the TypeScript AST, reads the
refusal reasons out of the interchange fixture's *bytes*, and reads the
staged-debt roster out of a reviewed pin at
`test/fixtures/refusal-staged-debt.pin.txt` that no generator consumes. Every
runtime kind must be a corpus reason or a pinned waiver; every pin must cite
`DEV-804`, be genuinely absent from the corpus, and name a kind the union
actually mints.

The first shape of this gate compared the generated schema's `.literals` to the
tuple that schema was generated from, against a vocabulary the generator had
already defined as `corpus ∪ runtimeRows` — so the production check was
`A ⊆ corpus ∪ A`, and adding a spelling to the manifest and regenerating stayed
green. Its control planted an outsider into a helper's argument after
generation, which proved a set helper could reject and proved nothing about
production ancestry. That is verified-codegen's self-comparison failure, and
both halves are replaced here. Alternatives: compare against the projection
manifest (the generator's own input — vacuous again); drop the pin and let any
corpus miss pass as debt (restores the hole the pin closes); require every
runtime kind to be corpus-backed today (all 36 are honest misses, so the gate
would be red on arrival with no repair inside this task). Why: three artifacts,
no two of them views of one value, and the one that is hand-maintained is the
one a reviewer reads. **Load-bearing? yes** — `check:refusal-control` plants
`hand-minted-refusal` into the union source, runs the production readers and
the production law over the planted bytes, and must fail for its committed
reason.

### T3. Taught payloads are pinned byte for byte

Decided: `check:refusal-payloads` walks every object literal under `src/` that
carries a `law` field together with one of the refusal constructor's other
fields, renders its `kind`, `law`, `expected`, and `next` texts, and
byte-compares the result against `test/RefusalPayloads.taught.txt`. A refusal's
payload is persisted evidence — read by operators, matched by tooling, quoted
in tickets — so an edit to one is a behaviour change even when no type moves
and every test still passes. The vocabulary gate above watches which kinds
exist; nothing watched what they teach. Alternatives: assert the payloads in a
test per kind (57 assertions nobody updates together, and a deleted assertion
is invisible); observe once in review that the diff did not touch the minting
files (a one-time observation, not a committed wall); pin the runtime-minted
refusals instead of the source literals (needs a live NATS server for most
kinds, and pins what a run produced rather than what the source teaches). Why:
one manifest, one diff, and the diff is the edit. **Load-bearing? yes** — a
field whose value is not written down as a literal renders `<expression>`, so
the wall pins what the source teaches and claims nothing about computed values.

### T4. The admission corpus grows past its closure roster, and the reader's "one admitted, last" rule becomes a prefix rule

Decided: the emitted admission group carries nineteen rows — the sixteen
closure refusals, the stage-rank edge, then two admitted sentences — and
`scripts/kernel-corpus.ts` now requires the refused rows to form a PREFIX and
the admitted rows the suffix, instead of requiring exactly one admitted row in
final position. A refusal roster states which spellings the door rejects and
never which it accepts, so a door that refused everything satisfied every
closure row; the admitted rows are what closes that gap, and one of them carries
a claim the closure list cannot state (the fully catalogued trigger).
Alternatives: keep one admitted row and
assert the new facts in hand-written runtime tests (refused — a hand-written
expectation standing in for a model verdict is the artifact the 2026-08-15
ruling bans, and these verdicts are the model's); place the admitted rows first
(refused — the refused prefix is what aligns position for position with the
taught refusal table, and an admitted row in the middle shifts every later
refusal off its reason); emit the new rows into a tenth record group (refused —
a new group is a format decision needing a ruling, and these rows are admission
verdicts by every property except their count). The alignment rule is kept but
bounded: it is checked only as far as the refusal table reaches, because one
reason can be earned by more than one candidate shape and the stage-rank edge
earns `absence-trigger` a second time. **Load-bearing? yes** — the reader's own
control arm plants an admitted row before a refused one, a corpus with no
admitted verdict, and a corpus with no refused verdict, and each must be refused
for its own reason.

### T4a. The off-writ admitted vector is DROPPED: the behaviour it would have pinned is ruled a defect

Decided: no vector is emitted for a catalogue-resident, non-pinned referent
carried by a non-declaration, and none should be. The brief asked for one as a
pin-as-chosen; grill round 2 (record on DEV-772) ruled the behaviour A DEFECT
rather than a chosen asymmetry. DEV-754 repairs the model — catalogue checks on
predicate leaves — and the REFUSAL vectors that replace it emit only after the
model moves, which is DEV-754's work and not this seat's. Emitting the admitted
vector first would have pinned a defect into the corpus as a replayed fact and
then required a retraction plus a regeneration of every downstream artifact.
Distinguish the two lines the sitting separated: (a) pinned-universe inspection
being declare-only, DOCUMENTED as chosen in `requiredPinned`'s docstring;
(b) the trigger arm's catalogue support naming only the declaration, because
predicate leaves are bare naturals rather than raw arguments — UNDOCUMENTED,
verified admitting an uncatalogued lane first-hand, and now the defect DEV-754
repairs. **Load-bearing? no** — it records a deliberate absence so a later
reader does not read the gap as an oversight.

### T4b. One record group carries model-internal rows, and the host reader skips it by not knowing it

Decided: a tenth group, `model-admission`, carries admitted sentences that
document the MODEL and claim nothing about a host; each row is emitted with
`scope: "model-internal"`, and the marking originates in emission rather than
being annotated afterwards, so a row cannot reach a consumer without it. The
host reader excludes them by leaving `model-admission` out of
`KERNEL_RECORD_GROUPS`: the add-only rule then reports the group in `skipped`
and collects it nowhere, so it never enters the conformance roster the door is
replayed against. Cited: operator grill ruling A8, sitting record DEV-772,
2026-08-19, which authorised the smallest loader change that respects the
marking. Alternatives: a `scope` field on every admission row (refused — it
changes the shape of nineteen rows that have no scope question, and every
consumer's schema with them); a filter in the replay harness (refused — the
roster would still contain the rows, so a second consumer would replay what the
first was told to skip); relying on the group being unknown without saying so
(refused — an incidental skip is one edit away from an accidental promotion).
**Load-bearing? yes** — the skip is asserted by test rather than left to habit:
adding the name to `KERNEL_RECORD_GROUPS` would promote the rows into the
roster and turn a model convenience into a host conformance claim.

### T5. The aliasing pair documents a RULED quotient, and the canonicalizer is not touched

Decided: two rows, `aliasRefDeclare` and `aliasLiteralDeclare`, are emitted into
the model-internal group carrying byte-identical `encoded` sentences.
`canonicalBytes` folds a payload into one identity, weighing a digest reference
`1 + kind.rank * 4096 + id` against a literal's `2 + value * 16`, so
`[ref lane 1]` and `[literal 1024]` both weigh 16386 and the two DISTINCT lawful
declarations become one sentence. Operator grill ruling A8 (sitting record
DEV-772, 2026-08-19) rules that collision an INTENDED QUOTIENT and
model-internal: a payload denotes its canonical value, so inside the model two
spellings of one value are one sentence. Real injectivity remains the byte-level
canonicalizer's obligation and is walled separately under DEV-807 — which is
precisely why the pair is excluded from the host roster (T4b): a host
reproducing this collision would be reproducing a model convenience, not the
estate's byte identity. The canonicalizer is untouched. Alternatives considered
before the ruling and now moot: changing the fold so the two separate; refusing
duplicate encodings in the reader. What the host test asserts is the EXCLUSION —
that neither name reaches `corpus.admissions` or the replay table — not the
collision. The emitter, which is model-side, does pin the collision, so a fold
that silently stopped quotienting is caught where the ruling applies.
**Load-bearing? yes** — the emitter refuses to print a model-internal group
whose two rows are not both admitted to one encoded sentence, so the group
cannot become a stale illustration. Grill note: KM-24 in
`docs/research/2026-08-18-kernel-model-notes.md`.

### T6. One lawful trigger is emitted so the trigger arm's referent check is reached by an admission

Decided: `catalogedTrigger` — `trigger (evidenceAppears lane 1 pattern 17)
declaring 3` — is planted and admitted, its declaration `(program, 3)` and its
predicate's lane leaf `(lane, 1)` both in the catalogue. The roster's two other
triggers refuse on their PREDICATE production, so no passing admission had ever
reached the trigger arm's referent check; the arm was live code with no green
vector through it. Its encoded sentence `[6,0,1,17,0,3]` is the one the
`trigger-evidence-appears` encoding vector already states, so the admission
group and the encoding group now meet on a trigger as well as on a declaration.
Alternatives: a `cellReaches` or `outcomeLanded` production instead (equivalent;
`evidenceAppears` was taken because its sentence already exists in the encoding
group, which buys the cross-group tie for free); no such vector (refused — the
gap is real and cheap to close). Scope is stated in the definition, the fixture,
and the test: every leaf here is catalogued deliberately, and the row claims
NOTHING about an uncatalogued predicate leaf, which is the held question in T4a.
**Load-bearing? yes** — it is the only admitted trigger in the corpus, so the
refuse-everything mutant is now killed on a trigger as well as on a declaration.
## Task DEV-804 (slice C) — one canonicalizer: the plait twins retire

### T0. The private twins retire onto the jcs seam, and the seam's number line wins

Decided: `src/truth/CanonicalJson.ts` and `src/truth/SchemaCanonical.ts` are
deleted, and every importer moves onto `@foldlab/core/jcs`. Where the twins and
the seam disagreed — the number line — the seam wins, per the operator ruling
of 2026-08-18 (DEV-807, PR #138). The twins had one honest justification and it
was in their own module header: RFC 8785 serializes numbers through IEEE-754
doubles, this interchange carries identity labels past 2^53, so the twins wrote
unbounded integers as minimal decimal and refused a fraction, an exponent, and
a minus sign at the parser. DEV-807 moved that exact rule into
`packages/core/src/jcs.ts` — bigint carriers, exact integer digits, the decoder
returning `bigint` for any pure-integer literal at or past 2^53 — and into Go.
With the divergence gone the twins were a second identity with no remaining
reason, which is Law 1 debt and a standing invitation to drift. Alternatives:
keep the twins and add a differential wall between them and the seam (two
canonicalizers plus a wall is strictly worse than one canonicalizer, and
both-sides-agree is not verification); re-export the seam under the twins'
names (leaves the retired vocabulary alive and the wall with nothing to refuse);
retire only `CanonicalJson.ts` and leave the schema walk (the walk is built on
the twin's value domain and cannot outlive it). Why: identity is bytes, and two
things that write bytes are two identities. **Load-bearing? yes** — program
content addresses are SHA-256 over these bytes, and the daemon and carriage
paths compare them.

Measured, before committing anything: over all 121 lines of
`fixtures/kernel-conformance.ndjson`, the twin's encoder and the seam's encoder
produce identical bytes for every parsed value (0 moved); all four committed
program vectors' declarations encode to the bytes the vectors pin under both
encoders (0 moved); every line survives seam-decode-then-seam-encode byte for
byte (0 moved); and every line survives schema-decode-then-seam-encode byte for
byte (0 moved). No committed digest, canon vector, program byte string, or
generated artifact moved: `check:corpus`, `check:kernel-tables`, and
`check:kernel-schemas` all report byte-identical regeneration, and
`test/PublicTypeUniverse.inventory.md` is unchanged at 132 classified types.
The canon vector the ruling turns on round-trips through the surviving seam
unchanged: `{"bytes":"9007199254740993","name":"big-integer","record":"canon","value":9007199254740993}`
reads back with `value === 9007199254740993n` and re-emits to those same bytes,
while `JSON.parse("9007199254740993")` is still `9007199254740992`.

### T1. The corpus's Nat rule is a stated narrowing of the estate's domain, not a second parser

Decided: `scripts/kernel-corpus.ts` decodes through the seam's `decodeJson` and
then lifts every integral literal onto `bigint` (`asNat`), because the seam
returns `number` below 2^53 and `bigint` at or past it while every record schema
declares `KernelNat`. A non-integral literal is left as the seam decoded it, so
the schema refuses it by name rather than the lift swallowing it into an
integer. Alternatives: widen the record schemas to accept `number | bigint`
(two carriers for one wire shape, and the widening reaches the generated
schemas and every consumer); make the seam's decoder corpus-shaped (a
package-wide domain change to serve one file, and it would move `packages/core`
under a ticket that does not own it); parse the corpus with a second reader
(the twin, under a new name). Why: the corpus's grammar genuinely is narrower
than the estate's, and the honest place to say so is the reader of that file,
in one walk that adds no serialization. **Load-bearing? no** — the lift is a
carrier choice on the decode path; the bytes are the seam's either way, and the
canonical-form check compares bytes, not carriers.

### T2. Two type-level refusals are traded for three value-level controls, and the trade is named

Decided: retiring `SchemaCanonical.ts` gives up two refusals it made at
derivation time, before any data existed — a schema node of JavaScript
`number`, and a schema carrying an encode/decode transformation — and the
replacement catches both at the first record that exercises them, through
`roundTripsCanonically` in `scripts/kernel-corpus.ts`. The `number` refusal is
not relocated, it is **repealed**: the estate's number domain now carries
JavaScript numbers, so there is no longer a type to refuse. The codec refusal
survives as a value-level one, because a codec decodes to a value whose
canonical form is not the text it came from. A third property the AST walk gave
for free — an object member the schema does not declare — is now caught because
`Schema.Struct` drops it and a dropped member is a shorter re-emission.
`test/KernelSchemas.test.ts` carries a control for each of the three, and
`test/KernelCorpus.test.ts` restates the number rule as what it now is: a
fraction and an exponent are non-canonical *spellings* (refused by the
canonical-form check, which is where a spelling was always refutable), a
leading zero is still refused at the reader, and `-1` is canonical text that
`KernelNat` refuses at the schema. Alternatives: keep the AST walk on top of
the seam (the walk's whole value domain was the twin's, so keeping it keeps a
twin); assert the loss in prose and move on (a claim without a gate).
**Load-bearing? yes** — a control that only fires on values needs a value that
fires it, and all three are committed.

### T3. The wall is a source scan with a planted twin, because the failure it prevents compiles

Decided: `check:one-canonicalizer` (wired into `test:fast`) reads every module
under `src/` and refuses three things: a retired twin's file path existing
again, a retired twin's name (`CanonicalJson`, `SchemaCanonical`) spelled
anywhere but `src/truth/Canonical.ts`, and the canonicalizer signature —
`JSON.stringify` beside `.sort(` beside `Object.keys(` — in any module but that
one. `check:one-canonicalizer-control` (wired into `test:types`) copies the
committed mutant at `negative-controls/OneCanonicalizer.private-twin.mutant.ts`
to the retired path, requires the scan to fail naming both arms, and restores
the tree in a `finally`. Alternatives: a lint rule on imports of
`@foldlab/core/jcs` (the seam is meant to be imported; the offence is
re-implementing it); a type-level check (a second canonicalizer typechecks
perfectly — that is the whole problem); a test that greps in `bun test` (a wall
that lives beside the code it guards is a wall the same edit can delete, and
the package's other structural laws are check scripts). Why: the arms are
properties of source bytes, and the third arm catches the twin coming back
under a name nobody has thought of yet. **Load-bearing? yes** — the wall is
what makes "there is one RFC 8785 canonicalizer" in `AGENTS.md` a law rather
than an exhortation, and its control is what makes the wall refutable.
## Task DEV-804 — the generator emits named types

### T0. The alias sits beside its schema, and only the suspended entry's moves

Decided: every mini-AST type in `KernelSchemas.generated.ts` is emitted with a
named value type. A non-suspended entry's is
`export type KernelXValue = typeof KernelX.Type`, written immediately after the
const it names; the one suspended entry keeps the structural alias it already
had, emitted ahead of the schemas because the annotated const is what refers to
it. What varies between entries is where the alias sits, never whether it
exists. Alternatives: emit all twenty-two structurally in the pre-schema block
(twenty-one restatements of shapes the schemas already carry, each a second
place one shape can be wrong); emit the suspended entry's alias a second time as
`typeof KernelCandidatePredicate.Type` (its const is annotated
`Schema.Codec<KernelCandidatePredicateValue>`, so the alias would be defined
through itself and the module would not compile). Why: DEV-796's wall,
`isDeclaredByGeneratedCore`, credits the file a symbol's declarations resolve
to, so a consumer-side `typeof Generated.X.Type` is the consumer's own
declaration and traces back to nothing — `KernelDoor.ts` spells seven types
exactly that way and scores 0 derived. A named type is the only thing a
consumer can re-export. **Load-bearing? yes** — restoring the suspended-only
gate regenerates main's file exactly (1 `export type`, not 23) and
`check:kernel-schemas` reds on the committed bytes.

### T0a. `KernelRef` gets an alias although it has no type record

Decided: the expanded `Ref` abbreviation is emitted with
`export type KernelRefValue = typeof KernelRef.Type` like every declared type.
The model spells `Ref` as an abbreviation rather than a declaration, so it
carries no type record and is not a mini-AST entry; it is nonetheless one of the
seven types `KernelDoor.ts` restates, so leaving it unnamed would leave that
family one alias short of derivable for a reason no reader could see.
Alternatives: emit no alias and let the consumer keep restating it (leaves the
hole in exactly the family this ticket converts); promote `Ref` to a corpus type
record (hand-authors model structure). Why: the alias is a projection of a
schema this generator already emits, so it claims nothing the corpus does not
already license. **Load-bearing? no** — nothing but that seventh consumer type
depends on it.

### T1. The anchor element type widens by union, not by dropping the template

Decided: `generatedCoreAnchors` takes the element type
`` `src/kernel/${string}.generated.d.ts` | `src/truth/${string}.generated.d.ts` ``,
and `src/truth/RefusalKinds.generated.d.ts` joins the list. DEV-796's T4 fixed
the template deliberately: an anchor must spell `.generated.d.ts`, so the walk
cannot be granted authority over a file nothing byte-gates, and
`KernelCorpusSchemas.d.ts` was struck from the list on exactly that ground. The
widening preserves that law in full — both arms of the union still end
`.generated.d.ts`, so a hand-written path stays unrepresentable in either plane.
What moves is the directory, and the directory moved for a reason the record
already carries: DEV-808's T0a emits the refusal vocabulary into `truth/` rather
than importing it up from `kernel/`, because root Law 4 makes `truth/` the
deepest plane. One generator, two emissions, both byte-gated by
`check:kernel-tables`; refusing the second emission an anchor would make Law 4's
compliance cost Law 1's credit. Alternatives: relax the element type to
`` `${string}.generated.d.ts` `` (admits a generated file in any plane, gated or
not); move `RefusalKinds.generated.ts` into `kernel/` (undoes DEV-808 T0a and
re-crosses Law 4); leave the list alone and let the truth-plane vocabulary stay
debt permanently (the union it names is generated, so the ledger would record a
falsehood about it). Why: the law T4 states is about what byte-gates a file, not
about which directory the file sits in. **Load-bearing? yes** — measured:
appending `"src/truth/Refusal.d.ts"` and `"src/kernel/KernelCorpusSchemas.d.ts"`
to the list reds `tsgo -p packages/plait/tsconfig.json --noEmit` with two TS2322
diagnostics naming both spellings, so the unrepresentability T4 bought survives
the widening intact.

### T2. The ledger's authority prose is left to the lane that owns the ledger

Decided: `renderInventory`'s authority line still reads
`` (`src/kernel/*.generated.d.ts`) `` and is deliberately not updated in this
branch. That line is generated into `test/PublicTypeUniverse.inventory.md`,
which the concurrent DEV-805 lane is rewriting; editing it here would move the
committed ledger's bytes under another lane for prose alone. Reported as
untouched rather than quietly fixed, and owed to whichever lane lands second.
**Load-bearing? no** — this branch does not move the census (132 total, 0
derived, 132 debt before and after), so the ledger is byte-identical either way
and only the sentence describing the rule is stale.
## Task DEV-804 (slices A+B) — the first public types credit as corpus-derived

### T0. A re-export of a NAMED generated type is the one crediting shape

Decided: the conversion is `export type { KernelXValue as KernelX } from
"./KernelSchemas.generated.js"`, and nothing else counts. Seven of
`KernelDoor.ts`'s types and `truth/Refusal.ts`'s `StructuralRefusalKind`
convert; the census moves 0 → 8 derived, and the kernel and truth pins fall
27 → 20 and 37 → 36. What does NOT convert stays hand-written and waivered:
`KernelVerdict` (a host projection that flattens a generated refusal row into a
tagged union the corpus does not carry), the `KernelDoor` context interface, and
`KernelAdmit` — no generated counterpart exists for any of them, and inventing
one would put a shape in the generator that the model never declared.
Alternatives: `typeof Generated.X.Type` at the consumer, which is what the seven
door types said before this branch and which reads as derivation while being a
fresh local declaration — DEV-800 round 2 measured it at 0 derived across the
whole barrel, and T0 of the generator slice records the same finding from the
emitter's side; a structural restatement of the shape (a second place one shape
can be wrong); crediting by import-graph proximity rather than by declaration
owner (the false-positive direction `isDeclaredByGeneratedCore` exists to
refuse). Why: the walk credits the file a symbol's declarations resolve to, and
a re-export is the only spelling that leaves a public name with no declaration
of its own. **Load-bearing? yes** — measured on this branch: reverting
`KernelRawArg` alone to `export type KernelRawArg = typeof
Generated.KernelRawArg.Type` reds enforce at exit 1 with `PUBLIC TYPE UNIVERSE
UNWAIVERED: KernelDoor.KernelRawArg owner=src/kernel/KernelDoor.ts
classification=debt-with-a-ticket ticket=DEV-795`, because the conversion
removed that row's waiver from the ledger; and `--write` cannot launder it back,
reding at `PUBLIC TYPE UNIVERSE RATCHET: owning prefix=kernel walked=21
pinned=20 — raising a pin is the operator's act`. Restored, both green.

### T0a. The door binds the generated names locally by importing them under its own spelling

Decided: `KernelDoor.ts` carries the seven names twice — once as
`import type { KernelRawArgValue as KernelRawArg } from ...` for its own body,
once as the `export type { ... } from` re-export that is the public surface. A
re-export creates no local binding, so the door's twenty-odd internal uses need
something to refer to, and the import alias is that something without declaring
anything: it is the generated declaration under the door's name. Alternatives:
spell every internal use `Generated.KernelRawArgValue` through the namespace
import the door already has (correct, and it churns every signature in the file
for no change in what anything means); declare local non-exported aliases
(`type KernelRawArg = Generated.KernelRawArgValue`), which reintroduces the
local declaration this task is removing and would credit only by the accident
that the census walks exports. Why: the diff should be the conversion and
nothing else, so a reviewer can see the seven names move in one block.
**Load-bearing? no** — the census reads the export, not the import.

### T1. The refusal kind converts as ONE value-and-type re-export, because it must

Decided: `truth/Refusal.ts`'s `export const StructuralRefusalKind: typeof
GeneratedStructuralRefusalKind = GeneratedStructuralRefusalKind` beside
`export type StructuralRefusalKind = typeof GeneratedStructuralRefusalKind.Type`
becomes the single `export { StructuralRefusalKind } from
"./RefusalKinds.generated.js"`, and the `StructuralRefusal` class takes its
`kind` field from the import alias instead of from the retired const. This was
forced, not chosen: `StructuralRefusalKind` is one name in both declaration
spaces, and TypeScript admits ONE export declaration per exported name across
both — keeping the const and adding `export type { StructuralRefusalKind } from`
reds with TS2323 and TS2484, and renaming the type in the generated module does
not help because the collision is on the EXPORTED name, not on the source name
(probed both ways). Alternatives: keep the const and leave the type as a local
`typeof` alias (leaves the one truth-plane type the generator actually emits
uncredited, which is the row this slice exists to move); drop the type export
and keep only the const (`Refusal.StructuralRefusalKind` in type position is
public surface two call sites already use, so this deletes surface); emit the
generated type under a second name and re-export that (same collision). Why: the
re-export carries the schema and the type it admits, and both resolve to
`RefusalKinds.generated.d.ts`. **Load-bearing? yes** — it is the whole of slice
B: without it truth stays pinned at 37 and the derived count stops at 7.

### T2. Two wall readers learn the export-declaration form, in the direction that keeps them strict

Decided: `scripts/kernel-door-containment.ts`'s `readDoorForm` collects `Kernel*`
names from export declarations as well as from type-alias and interface
declarations, and `scripts/refusal-vocabulary.ts`'s `checkRuntimeUnionWiring`
now asks for a value re-export from the generated module rather than for an
exported const whose initializer traces back to an import alias. Both changes
are caused by the conversion and both are checked, not assumed. The door reader
matters because the form vocabulary is what the twin and unbound-use clauses
quantify over: an export declaration is not a type-alias declaration, so reading
only declarations would have silently dropped the seven converted names and
turned two arms of `check:kernel-door-control` — `form-twin` and
`unbound-form-name`, both planted as `KernelCandidateAct`, one of the seven —
green on an accepted mutant. The vocabulary reader gets STRICTER for the move: an
`export ... from` cannot be a second roster wearing the name, so the clause no
longer has to chase an initializer and hope no later statement rebound it, and a
module that declares a roster of its own is now refused by name rather than by a
mismatched-identifier message. Alternatives: leave `readDoorForm` alone and let
the vocabulary shrink (a wall weakened as a side effect of a conversion, which
is the failure this record exists to make impossible); admit both the const and
the re-export shape in the vocabulary clause (two admissible spellings for one
law, and the older one is the one that cannot credit); move
`StructuralRefusalKind` out of the wall's reach (it IS the union the minting
sites speak). Why: a wall whose subject changed shape has to be re-read against
the new shape or it is measuring nothing. **Load-bearing? yes** — the door
control still refuses all eleven planted spellings on its committed trace
(`ONE DOOR CONTROL: PASS (11 planted second-door spellings refused, each for its
committed reason)`), which is only true because the vocabulary still carries the
converted names.
## Task DEV-805 — the enforce flip: a waiver ledger with a per-prefix ratchet

### T0. The committed inventory IS the waiver ledger, and enforce asks coverage

Decided: every `debt-with-a-ticket` row in
`test/PublicTypeUniverse.inventory.md` is a Law 1 waiver, and `--enforce`
admits a walked debt row exactly when its `(public type, owning module,
unification ticket)` triple appears there. A walked row with no such triple is
UNWAIVERED and named. That replaces DEV-796's all-or-nothing branch, which
refused the whole run whenever any debt existed and therefore could not be
turned on until stage 2 had emptied the table — the flip would have arrived
last, when every conversion had already been reviewed by hand. It arrives
first instead, at 132 waivers, and the conversions ratchet it down. Alternatives:
a second committed waiver file beside the inventory (two artifacts that must
agree about the same 132 rows, and nothing but review keeping them in step);
waivers as a reviewed constant in the walk (the rows are generated data, so
the constant would be a hand-retyped copy of the table it authorises); keep
all-or-nothing and wait for stage 2 (the flip lands after the work it was
supposed to gate). Why: one artifact, generated from the walk, read back by
the same module that writes it, and the enforcement question is coverage of
one side by the other rather than emptiness of one side.
**Load-bearing? yes** — deleting the coverage stage leaves the control's
unwaivered arm green, and it fails naming the accepted mutant: `PUBLIC TYPE
UNIVERSE CONTROL: FAIL — enforce mode accepted a public type the ledger grants
no waiver for`.

### T1. A waiver cites a ticket off a reviewed liveness list, checked on both sides

Decided: `liveUnificationTickets` is a small reviewed constant — `DEV-795`,
`DEV-804`, `DEV-817`, and `DEV-796` scoped to `negative-controls/` — and a
citation outside it is a violation of the gate's own precondition, refused
before any coverage question is asked. Both sides are checked, because a
citation can rot from either: the walk's route table is audited on every run
of every mode including `--write`, and every waiver on the committed ledger is
audited in enforce mode. The rule is not hypothetical. `debtTarget` routed the
seven carriage and internal rows to `DEV-763`, which had closed, and the rows
kept reading as lawful debt for as long as nobody cross-checked a table of 132
rows against the board; this task repoints them to `DEV-817` and makes the
next such drift a red gate instead of an audit. Closing a listed ticket
therefore requires draining its rows first — closing it while rows remain
turns the whole ledger red, which is the intended direction and still a worse
day than draining. The `DEV-796` entry is scoped rather than plain because
that ticket IS closed: the rows citing it are the negative control's own
plant, they are not estate surface, and they drain when the control retires.
No `src/` row may cite it. Alternatives: query the board at gate time (a wall
that needs the network is a wall that goes yellow on a bad afternoon, and the
board is not a build input); check nothing and trust the routes (the DEV-763
state, restated); admit any `DEV-` shaped string (spelling is not liveness).
Why: liveness is a small reviewed datum, the environment is the routes and the
ledger, and the checker compares them. **Load-bearing? yes** — repointing the
carriage route back to `DEV-763` fails every mode before the walk runs, with
`debt route for src/carriage/ is unlawful: ticket=DEV-763 is not on the
reviewed liveness list`, and deleting the ledger-side stage moves the control's
liveness arm to a different refusal, which its committed trace catches as
`the liveness arm's trace moved`.

### T2. The ratchet pins debt per owning prefix, and `--write` refuses to raise a pin

Decided: the ledger carries a `## Ratchet pins` table — one count per owning
prefix (`truth`, `kernel`, `planes`, `carriage` covering carriage/surface/
internal, `negative-controls`) — enforce mode re-derives each count from the
declaration walk and refuses any prefix whose walked count EXCEEDS its pin, and
`--write` lowers a pin that fell while refusing to raise one. Pins bootstrap
only when there is no committed ledger at all. Without the write half the
ratchet would be worthless: report mode already forces regeneration after any
surface change, so a `--write` that re-pinned upward would make every increase
green in the same act that recorded it. The prefix, ticket, and unification
target are one row of one table (`debtRoutes`), so a pin cannot end up pinned
against a family whose ticket column was re-cut underneath it. Alternatives:
one global count (a conversion in `truth/` would pay for growth in `planes/`,
which is the netting the per-prefix split exists to refuse); pins as a
constant in the script (raising one becomes a code edit, but lowering one
becomes a hand-typed count — the thing this estate bans); pins derived from
the committed ledger's own row counts (measured: coverage then implies
domination, the ratchet can never fire on its own, and a stage that cannot
fail proves nothing); no ratchet at all, coverage only (a new type plus a
`--write` is a green gate and a silently larger universe). Why: the pin is
policy, the walk is truth, and they must be able to disagree.
**Load-bearing? yes** — with `Address.RatchetPlant` planted and its waiver row
hand-added while the pin stayed at 61, enforce refused with `PUBLIC TYPE
UNIVERSE RATCHET: owning prefix=planes walked=62 pinned=61`; `--write` over the
same plant refused with `--write refuses to raise a ratchet pin` and left the
ledger's bytes untouched; and deleting the ratchet stage leaves the control's
ratchet arm green, failing as `enforce mode accepted a prefix whose walked debt
count rose above its pin`.

**What this does NOT cover.** Raising a pin is a hand edit of a committed file,
and so is deleting the ledger to re-bootstrap. The ratchet makes debt growth
NAMED, reviewable, and impossible to acquire as a side effect of regeneration;
it does not make it impossible. The waiver grant stays what A5 says it is —
the operator's act — and the gate's job is to ensure the act leaves a diff
that says which prefix grew and by how much.

### T3. Enforcement is three ordered stages, each with its own refusal vocabulary

Decided: enforce runs PRECONDITION (the ledger parses, pins every prefix the
walk found, and cites only live tickets), then UNWAIVERED (coverage), then
RATCHET (counts), returning at the first stage that has anything to say. The
order is measured, not aesthetic: an unwaivered new type also lifts its
prefix's count, so a ratchet-first order would answer a question about
`Address.RatchetPlant` by naming `planes`. Each stage owns a distinct line
prefix, which is what lets the control's three arms fail apart — an arm whose
mutation produced the right colour for the wrong reason is caught by its
committed trace, not by its exit code. Alternatives: one violation list in
walk order (the three failures interleave and no arm can name its own law);
collect every stage and report all of them (a dropped stage stays invisible
because the other two still speak); a single "enforce failed" message (the
2026-08-18 shape, which cannot distinguish a stale gate from new debt). Why: a
gate with three laws needs three vocabularies or its control has one arm.
**Load-bearing? yes** — each of the three arms goes green under deletion of its
own stage and only its own stage, measured one at a time.

### T4. Report mode keeps running beside enforce, in the same `test:fast` step

Decided: `check:type-universe` invokes the script twice — once bare, once with
`--enforce` — and enforce still never byte-compares the ledger. DEV-796's T2
already bound this: a `test:fast` that swapped report for enforce would leave
the committed ledger gated by nothing exactly when its debt table empties and
the count line becomes the whole artifact. It binds harder now, because the
ledger has stopped being a report and become the gate's own authority: enforce
reads its waivers and its pins, so an enforce run over a stale ledger is a run
over stale authority, and report mode is what proves the authority is fresh.
Alternatives: one invocation doing both (re-entangles the control's arms —
T2's refused shape); enforce byte-compares as a fourth stage (same
entanglement, one mutation away); run enforce only in `test:types` beside the
control (the production surface would be enforced on a different cadence from
the ledger that authorises it). Why: two questions, two runs, and the second
costs 1.9 seconds. **Load-bearing? yes** — dropping the report invocation makes
a hand-edited ledger authoritative with nothing regenerating it.

### T5. The control plants by taking a waiver away, and A5's condition rides the header

Decided: the negative control runs five arms over its one planted pair — enforce
must ADMIT the planted ledger's own six waivers, three ledger mutations must
each be refused for their own reason against their own committed trace, and
report mode must still reproduce the ledger byte for byte. The mutations are
applied to the control's committed ledger, not to a second mutant declaration
file: the gate compares a walk against a ledger, so a planted new public type
and a ledger that stopped naming an existing one are the same edge approached
from opposite sides, and only the ledger side can be mutated without
invalidating the admission arm's artifact, which report mode regenerates from
the walk. A mutation that changes no bytes fails as a control in its own right.
A5's ruling (DEV-772 sitting record, round 1) rides the ledger's Authority
header rather than the walk: a waiver MAY cover NEW surface, on condition that
it names the provably-absent generator/corpus group and its unification ticket
— the DEV-764 shape — and the ratchet then counts that conditioned waiver as
ticketed debt like any other row, so the new surface still costs a pin.
Alternatives: a second mutant `.d.ts` with an eighth type (a second declaration
project and tsconfig to keep in step, for an edge the ledger mutation already
reaches); assert the enforcement result in a unit test over the pure function
(it would stop proving that the CLI wires the stages, which is the failure
DEV-796's T2 was built against); encode A5's condition as a machine check (the
"provably absent generator group" is a judgement about the corpus, not a
predicate over the emitted barrel — claiming to check it would be the false
green this wall exists to refuse). Why: the control exercises the production
`--enforce` branch for every law it now carries, and the one condition the
machine cannot judge is written where the operator granting a waiver reads it.
**Load-bearing? yes** — the three arms and their traces are what caught each
stage deletion above; the A5 header is stated evidence, and this DECISIONS
entry is its record.
## Task DEV-767 — the plane layering lint

### T0. The ladder is held against law 4's bytes; the printed law is a transcription

Decided: `scripts/plane-layering.ts` encodes the five planes in order and, as a
separate arm, reads the ladder back out of the root `AGENTS.md` — the file law 4
is written down in — and refuses when the two disagree. The law text a violation
quotes is the transcribed constant, not the text just read. Alternatives: encode
the ladder and never look at the law (a wall whose authority is one agent's
memory of a sentence); render every refusal from the freshly read law (an
editorial pass over the standing laws would then move every committed control
trace, so a wording change would red the battery as if code had moved); read the
ladder and skip the comparison (the read would decorate nothing). Why: two
artifacts, and the one that drifts names itself — a reordered ladder fails on
"the transcription is stale" rather than as a pile of code findings.
**Load-bearing? yes** — it is the only thing tying this wall to the law it
claims to enforce.

### T1. `internal/` is excluded by citation, and the wall states what it therefore does not claim

SUPERSEDED BY T5 — the coordinator ruled the escalation this entry raised, and
`internal/` is no longer excluded from the ladder. The entry stands as the
record of the gap and of what the round-one wall did not claim.

Decided: the walk places modules in the five planes law 4 names and excludes
`src/internal/` on a stated ruling —
`scratch/dispatch/2026-08-18-plait-plane-reorg-spec.md` §2, RATIFIED 2026-08-18:
"`internal/` is exempt: it is private adapters and helpers, importable from any
layer, never itself importing a public module except its own seam's siblings."
The wall reads that ruling no wider than its first half. Edges *into*
`internal/` are lawful from every plane and are counted separately in the PASS
line; edges *out of* `internal/` are neither judged nor cleared, because "its own
seam's siblings" has no mechanical reading until someone rules what a seam
sibling is. Alternatives: give `internal/` a rung on the ladder (inventing the
placement the spec deliberately withheld); enforce the second half by guessing
the mapping from an adapter's file name to its public seam (`chaos.ts` alone
reaches three of them, so the guess would manufacture findings); count
`internal/`'s outbound edges as clean (the honest gap becomes a green tick).
Why: an unstated placement silently guessed is the machinery this estate
deletes, and a wall that overstates its coverage is worse than an absent arm.
**Load-bearing? yes** — the one open finding `src/carriage/README.md` names that
this wall does NOT catch, `internal/nats.ts` importing `carriage/FabricClient`,
sits exactly in the half left unread.

### T2. Placement is evidenced twice: the directory and the module's own `Plane:` tag

Decided: every module's plane is read from the directory it sits in (the reorg
spec's "Directory = plane") *and* from the `Plane:` tag its header declares, and
a disagreement is a violation. `src/index.ts` is the one module at the root of
`src/`, placed on the surface plane by `src/surface/README.md` ("Two files wear
this plane — `cli.ts` ... and `../index.ts`, the curated barrel that *is* the
public surface"). Any other root-level module, and any directory that is neither
a plane nor a stated exclusion, is refused rather than skipped. Alternatives:
trust the directory alone (a file dragged between planes leaves a header
asserting the old one, and the header is what a reader believes); trust the tag
alone (then placement is whatever a module claims for itself); skip files the
roster does not recognise (a sixth plane could enter the tree by going
unmentioned). Why: two readings that must agree, and a roster with no silent
skip. **Load-bearing? yes** — it is what makes the walk's placements evidence
rather than assumption.

### T3. Delivered wired but ungated, because the tree is red today

Decided: `check:layering` and `check:layering-control` are declared in
`package.json`; only the control joins `test:types`. The positive arm stays out
of the battery until the operator disposes of the two violations it reports on
this tip (`src/kernel/KernelProgram.ts:62` importing `../carriage/CasDaemon.js`,
and `src/internal/permissions.ts` carrying no `Plane:` tag). Alternatives: gate
the battery now (every unrelated seat inherits a red `bun run gates` for a
finding none of them made, and the pressure to soften the lint arrives with it);
ship nothing until the findings are repaired (the seat that repairs them would
be repairing before reporting, which destroys the finding); add a waiver for the
two edges (a wall that ships with its first two exceptions already carved is not
a wall). Why: findings before fixes — the lint is the evidence, and gating is
one line of `package.json` on the day the disposition lands. **Load-bearing?
yes** — this is the difference between a reported finding and a repaired one.

### T4. The control plants both edge forms into a shipped module's bytes, at fixed lines

Decided: `negative-controls/PlaneLayering.shallower-import.mutant.ts` reads the
shipped bytes of `src/truth/Canonical.ts`, checks them clean under the
production law first, then prepends two planted imports — one value, one
`import type` — and runs the same production readers and the same production law
over the planted source. The plants lead the file so the lines the refusal names
are 1 and 2 whatever the victim's own body does; the declared-plane read is
taken from the unplanted bytes, which the plants do not touch. The trace is
recorded by executing the mutant (`bun run generate:layering-control`).
Alternatives: hand a helper a constructed import graph (proves a comparison
function can return false, and nothing about what the wall parses); plant into a
synthetic module (the reader would no longer be reading a shipped artifact);
plant only the value import (the type-only branch carries the real finding on
this tip and would ship unproved); insert after the header so the plant reads
naturally (pins a line number that moves whenever the victim's prose does). Why:
the only difference between this run and a clean one is the two planted lines,
and both forms of the edge the law refuses are exercised. **Load-bearing? yes** —
a lint nobody has watched fail proves nothing, and `src/carriage/README.md`
records that the edges this wall exists for are type-only.

AMENDED BY T7 — the control now carries seven arms, and each arm declares
whether it plants imports or a header so the tag readers and the import reader
are each pointed at the bytes that arm actually moved.

### T5. Internal modules are plane members housed in a flat directory

Decided (coordinator ruling, 2026-08-18, on the G1 escalation T1 raised;
operator delegated the decision in session): `src/internal/` stays flat, and
every module in it declares a `Seam: <plane>` tag in its header, exactly
parallel to the `Plane:` tag the plane modules carry. For the layering law that
tag IS the module's plane — outbound, an internal module may import public
modules only of its seam plane or deeper; inbound, anything may import it only
from that seam's rank or shallower; internal-to-internal edges compare the two
seams. The reorg spec's "importable from any layer" clause is superseded, and
its "its own seam's siblings" phrase now has the mechanical reading it lacked:
the public modules of its seam plane.

In the lint this collapses to one inequality — for every edge, the target's
plane must be at or deeper than the source's, with a seamed module ranked by its
tag. Alternatives: keep the exemption (it is a laundering channel — a kernel
module importing an internal adapter that itself reaches carriage arrives at
carriage through the private bag, and no arm sees it); mirror the plane
directories inside `internal/` (moves fifteen files and re-opens every import
path for a fact a header line already carries); leave the second half of the
clause unenforced (the honest gap T1 reported, now closed). Why: the flat layout
the reorg ratified is a housing decision, and membership is a law — writing the
membership down per module lets both be true at once. **Load-bearing? yes** — it
is what lets one rule judge both directions, and it turns the round-one gap into
a wall.

### T6. Each seam is the deepest one its imports allow, unless the module's purpose is shallower

Decided: an internal module's seam is the deepest plane consistent with its
outbound imports — the tightest bound its own edges force — except where the
module's documented purpose names a shallower home. Fifteen assignments, each
justified by what the module already imports:

| Module | Seam | Why |
| --- | --- | --- |
| `cas.ts` | truth | the one lattice write loop; reaches `truth/Refusal` only |
| `digests.ts` | truth | SHA-256 over canonical bytes; reaches `truth/Digest` only |
| `refusals.ts` | truth | the schema-issue bridge; reaches `truth/Refusal` only |
| `transport.ts` | truth | the NATS error classifier; reaches `truth/Refusal` only |
| `anchors.ts` | planes | the anchor KV adapter; reaches `planes/Anchor`, `planes/Fold` |
| `cells.ts` | planes | the cell KV adapter; reaches `planes/Cell` |
| `chaos.ts` | planes | chaos arms over declared folds; reaches `planes/Anchor`, `planes/Fold` |
| `folds.ts` | planes | durable fold deployment; reaches `planes/Fold` |
| `lanes.ts` | planes | lane streams and emission; reaches `planes/Lane` |
| `pump.ts` | planes | the positioned pump; reaches `planes/{Anchor,Fold,Lane}` |
| `registers.ts` | planes | the register KV adapter; reaches `planes/Register` |
| `sessions.ts` | planes | read-plane session reads; reaches `planes/Session` |
| `successors.ts` | planes | the successor discipline; reaches `planes/Anchor` |
| `nats.ts` | carriage | connection and message-pump types; reaches `carriage/FabricClient` |
| `permissions.ts` | carriage | THE EXCEPTION — its imports reach only `planes/*`, but what it declares is a connection's authority at the broker; the bucket names it reads are the subjects it grants, not state it carries |

`permissions.ts` additionally gained the module header it never had: it arrived
after the reorg's tagging pass, which is why the round-one wall reported it as
half its placement evidence missing. Alternatives: seam every adapter to the
plane it is named after (`chaos.ts` is named after no plane and reaches three);
seam everything to `planes` (four adapters that never touch a carrier would
carry a rank they do not need, and the inbound rule would loosen for all of
them); let `permissions.ts` take `planes` from its imports (a permissions map is
a carriage concern wearing a planes rank, and the next carriage-only import
would silently look lawful). Why: the tightest rank each module's own edges
force is the one that keeps the inbound rule sharpest, and a documented purpose
outranks an incidental import list. **Load-bearing? yes** — these fifteen tags
are what the inbound and outbound rules are evaluated against.

### T7. Truth's internal edges are pinned, and the pin is a reviewed file

Decided (operator amendment to the T5 ruling): a truth-plane edge into
`internal/` is tolerated where necessary and NOT encouraged, and the
discouragement is mechanical —
`test/fixtures/truth-internal-edges.pin.txt` lists every such edge with the
reason the material has not been folded into `truth/` proper, and an edge absent
from the pin is refused even when both seam ranks are lawful. Nothing generates
the pin and no generator reads it, so the only way to add an edge is a diff a
reviewer reads. A row that outlives its edge is refused too: a pin nobody is
reading any more is a standing licence. One row stands today —
`truth/Refusal.ts → internal/refusals.ts`, the schema-issue bridge that owns the
Effect Schema types the seam exists to keep off the public surface.

The control grew to seven arms accordingly: the two round-one plane edges, an
internal module reaching above its seam, a deep module reaching a
shallow-seamed internal (the laundering channel), a truth edge whose ranks are
lawful but which the pin does not carry, a missing seam tag, a seam tag on a
plane module, and a pinned row whose edge is gone. Each arm declares whether it
plants imports or a header, so the tag readers and the import reader are each
pointed at the bytes that arm moved — which is also what keeps the planted line
numbers at 1 and 2 whatever the victims' prose does. Alternatives: let the seam
ranks alone license truth's edges (correct by rank, but "tolerated" and
"encouraged" would then look identical to the wall); forbid truth → internal
outright (the schema-issue bridge has no other home today, so the wall would
ship red on a law nobody has a repair for); keep the roster in a comment
(a comment is not an artifact a check can read). Why: the reviewed diff is what
"not encouraged" means when a machine has to enforce it. **Load-bearing? yes** —
without the pin the deepest plane's exception is invisible the moment it grows.
## Task DEV-763 — the one admission door

### T0. The model-generated language is the contract; a runtime digest is not an identity conversion

**SUPERSEDED in part by ruling A1** (2026-08-19, board DEV-772), recorded under
`Task DEV-763/796 stage 4` below: one guarded seam, `kernel/KernelIdentity.ts`,
does read a runtime content address as a model identity label. The clause that
fell is "no function converts it into a model label"; the clause that stands is
that the door never consults a digest and nothing derives a model label from one
on the judgment path. Restored here because A1 supersedes it, and a supersession
whose antecedent is missing from the record is not a record.

Decided: `KernelDoor` derives candidate, context, and intrinsic-act types from
`KernelSchemas.generated.ts` and preserves the model's `bigint` identity labels
through admission and encoding. A runtime hex digest may ride beside a caller's
value, but no function converts it into a model label and the door never consults
it. Alternatives: hand-write a number-shaped candidate twin (a second type
universe, already demonstrated to drift); derive labels from hex digests (two
different identity scales made falsely interchangeable). Why: the formal model
already emits the literal kernel-language shapes; the trusted-base statement
that real identities are hashes of canonical bytes is evidence about the
runtime, not a missing field in the model algebra. **Load-bearing? yes** — this
is the ruling that unblocks both the door and the CLI projection.

### T1. Context is explicit until the catalog owns its assembly

Decided: the pure seam is `admit(context, candidate)`, with `make(context)` as a
context-bound view. The catalog/pinned-universe value is generated too, but this
ticket does not invent an ambient source for it; the durable catalog slice can
assemble and pass that value when it lands. Alternatives: wait for the catalog
ticket (leaves every host blocked despite a complete judgment contract); read a
global catalog from the kernel (inverts the plane stack and hides an Effectful
dependency inside a pure law function). Why: context assembly and candidate
judgment are separate responsibilities, and an explicit parameter preserves
that boundary without weakening either. **Load-bearing? yes** — it is how this
slice proceeds without pretending the catalog already ships.

### T2. Hosts alias the function; they do not wrap or inject it

Decided: CLI, `FabricClient`, and `CasDaemon` expose the exact
`KernelDoor.admit` function object. The control asserts reference identity for
all three and kills an invented host function. Alternatives: thin wrappers
(semantically innocent today, but a place for host-specific validation to grow);
injectable service methods (fixtures could replace the judgment and erase the
one-door guarantee). Why: carriage and surface contribute no semantics, so the
strongest and simplest representation is literal identity. **Load-bearing?
yes** — this is the executable no-bypass control.

### T3. A verdict carries the intrinsic act or the complete taught refusal

Decided: admission success returns the generated intrinsic act and its canonical
model encoding; refusal flattens the generated table row beside
`verdict: "refused"`, preserving reason, law, repair, and applicability at every
host. Alternatives: return encoding only (throws away the very act the door
constructs); return reason only and require host lookups (permits parity to
depend on the host); nest a second refusal object (adds a vocabulary shape the
model table does not need). Why: the door is the sole constructor of intrinsic
acts and the refusal table is already the single taught vocabulary.
**Load-bearing? yes** — both acceptance halves are observable in one value.

### T4. The door is a named public namespace, barrel and subpath both

Decided: `KernelDoor` joins the root barrel and the `./KernelDoor` subpath in
this ticket. (It was the eighteenth namespace when this was written; the count has
moved since and the ordinal is not the decision.) It is pure, so the public Effect manifest remains byte-stable even
though the namespace is new; the host-route suite asserts the barrel names the
same function. Alternatives: leave the door reachable only by internal deep
import (DEV-786 could not consume the ruled seam as package API); export the
generated schema module wholesale (widens the surface from one concept to an
emitter's file layout). Why: a public admission seam must be nameable, while the
deep module should keep the generated family behind its candidate/act/context
projections. **Load-bearing? yes** — it records that the surface change is the
ticket's decision, not accidental barrel churn.

### T5. The corpus is not the whole wall: absence gets its own control

Decided: one control decodes a lawful `resolveDigest` whose anchor is absent
through the generated codec, admits it at the shipping door, and pins the
resulting sentence against the corpus's own `resolve-schema` vector.
Alternatives: trust the seventeen replayed vectors (they carry the anchored
resolve that must be refused and no bare one that must be admitted, so a door
reading absence as `null` passes all seventeen while refusing a lawful
sentence — measured, not hypothesised: planting `!== null` leaves the replay
green and kills only this row); add a vector to the corpus (the corpus is
emitted by executing the model, so a runtime gap is not a reason to hand-write
into it). Why: the emitted vectors are the model's claims about the language,
and this control is the runtime's claim about the *spelling* the generated
schema hands it — `Schema.UndefinedOr` is the model's `none`, so absence
compares against `undefined` and nothing else. **Load-bearing? yes** — it is
the only row that fails when a door and its generated schema disagree about
how absence is written.

### T6. No service wraps the door in this slice

Decided: hosts hold the `admit` function object itself; no Effect service, tag,
or layer stands between a caller and judgment. Alternatives: an `Admission`
service with a layer per context (it makes the door injectable, which is a
bypass surface the identity control can no longer close, and it was tried and
reverted on this ticket); a per-host wrapper (a place for host-specific
validation to grow). Why: `admit` is pure and total — it needs no environment,
so a service would buy substitutability the no-bypass law exists to deny. A
Layer seam, if a later slice wants one, wraps this generated door.
**Load-bearing? yes** — it records that the missing service is a decision, and
what a future one may and may not wrap.

## Task DEV-763/796 stage 4 — the one-door containment wall

### T0. The shared candidate form is read out of the door's bytes, and its ancestry is checked first

Decided: `check:kernel-door` reads the door module's *source bytes* through the
TypeScript AST for the form it claims — which generated symbol each of the
candidate, intrinsic-act, and admission-context bindings names, and which
`Kernel*` type names it exports — and requires every one of those symbols to be
a name the generated schema module's own bytes emit. That clause runs before
any other module is swept. Alternatives: import `KernelDoor` and read the
schemas off the values (the generated value would only be asked to agree with
itself, verified-codegen's self-comparison failure); hard-code the three
generated symbol names in the checker (a hand-maintained twin of the thing the
wall exists to keep generated); sweep the hosts and never check the door (a
sweep held against a drifted door guards nothing — a door whose `Candidate`
stopped naming a generated symbol would leave every host lawfully consuming a
hand-written form). Why: the ratified stage-4 target is "consume the shared
generated-core candidate form through KernelDoor", so the wall has to establish
that the door's form IS the generated one before it can hold anything to it.
**Load-bearing? yes** — the `door-form-drift` control arm plants exactly this
and is refused before the module clauses are reached.

### T1. The sweep quantifies over every `admit` route, exported or not, and the exception rides a reviewed pin

Decided: the route clause reads every binding, class member, object property,
property signature, method, and function under `src/` named `admit` — not only
the exported ones — and requires each to BE the door's imported function: a
bare identifier bound by `import { admit } from ".../KernelDoor.js"`, or
`<namespace>.admit`, or a signature typed `typeof <that binding>`. A module
that names a route the door does not own is written into
`test/fixtures/kernel-door-routes.pin.txt` by hand with the ticket that owns
its convergence, and a pin row that stops naming a real route reds the wall.
Measured: the tree carries exactly one such route, `src/planes/Address.ts`'s
petname name law, which accepts no candidate, constructs no verdict, and mints
`invalid-petname` — a spelling that module's own header already stages as
DEV-796 debt beside `Binding` and `Directory`. Alternatives: quantify over
exported routes only (a private validator called by an exported function is the
exact shape standing law 2 names, and it would pass); refuse `Address.ts`
outright and ship the wall red (an overclaim — law 2 is about kernel candidate
admission, and this function judges a name against a regular expression);
special-case `Address.ts` inside the checker (a waiver nobody reviews, buried
in mechanics). Why: the pin is nothing's input, so an exception costs a diff a
reviewer reads, and the liveness clause stops the roster outliving what it
waives. **Load-bearing? yes** — narrowing the quantifier to exported bindings
was measured to admit the wrapper the control plants.

### T2. Four spellings of a second door, and two exemptions stated rather than assumed

Decided: the module sweep refuses four shapes — an admission verdict
constructed or declared outside the door (an object property `verdict` whose
initializer is a string literal, or a type member `verdict` whose type is a
string literal); an `admit` route that is not the door's own function; a
hand-written declaration of a name in the door's `Kernel*` form vocabulary; and
a use of one of those names that no import from the door or the generated
schema module bound. Two exemptions: the `*.generated.ts` projections, whose
bytes are the model's and carry the corpus's own admission examples, and whose
regeneration is byte-gated by `check:kernel-schemas` and `check:kernel-tables`;
and `test/` with `negative-controls/`, because a control that plants a second
door has to be able to spell one. Alternatives: refuse any `verdict` field
whatever its initializer (`KernelCorpusSchemas.ts` describes the field with
`Schema.Literal("refused")` — a grammar that describes a verdict is not a door
that mints one, and refusing it would red the wall on the corpus schema);
structurally compare each declared type against the generated candidate union
(fragile, and it answers a question the type-universe walk already owns);
sweep `test/` too (it would refuse `KernelDoor.routes.test.ts`'s own identity
control). Why: the four shapes are the four ways a second door can be written
down in source, and each is refused by its own clause so a red wall names which
one moved. **Load-bearing? yes** — each clause has a planted arm, and dropping
the route clause was measured to leave the other six green.

### T3. The control plants one spelling per clause, at synthetic module paths

Decided: `negative-controls/KernelDoor.second-door.mutant.ts` builds seven
evidence sets from the shipped bytes — the real generated roster, the real door
form, real swept modules — and plants exactly one thing in each, then runs the
production readers and the production law over them. The planted modules carry
paths this file owns rather than the package's, and each avoids every clause
but its own, since the clauses are ordered and an arm that tripped two would
answer with whichever came first. The trace is recorded by executing the mutant
(`bun run generate:kernel-door-control`), never transcribed. Alternatives:
splice the plant into a shipped module's real bytes (the committed trace would
then carry that module's line numbers and "move" on every unrelated edit above
the site — a control reporting a moved law when a comment was added); plant one
mutant that trips several clauses (it answers with the first clause and can no
longer name the law it drops — the shape DEV-796's control was refused for);
assert the refusal strings in a test (a deleted assertion is invisible). Why: a
negative control asks one question, and seven single-clause arms answer seven.
**Load-bearing? yes** — dropping the route clause was measured to make the
control report `the wrapper-route plant was accepted` rather than a trace diff.

### T4. The wall states what can be SPELLED, and says what it does not cover

Decided: this wall reads source bytes, so its claim is about `src/` as written
and never about a running program. Runtime identity of the three host routes
stays `test/KernelDoor.routes.test.ts`, agreement with the model's verdicts
stays `test/KernelConformance.test.ts`, and a route reached only through an
object spread is invisible to the sweep and is the runtime test's to hold.
Alternatives: import the modules and compare function identity in the check
(that is the routes test, already shipped, and a second copy would be the twin
this estate refuses); claim the wall proves no second door exists anywhere
(false — a spread, a dynamic import, or a `test/` fixture is outside it). Why:
a claim is sized to its evidence, and the bound belongs in the module header
where the next reader meets it rather than in a ticket nobody re-reads.
**Load-bearing? yes** — the pair of walls is what makes standing law 2's wall
mechanical; either alone leaves a hole the other closes.

### T5. The guard's domain is the runtime's, because the corpus deliberately has none

Decided (ruling A1, 2026-08-19, board DEV-772): `kernel/KernelIdentity.ts`
holds `kernelIdentity`, and its width-and-alphabet guard is `truth/Digest.ts`'s
own schema run through `Refusal.decodeRefusing` — not a `/^[0-9a-f]{64}$/`
restated in the kernel plane. The ruling asked for the width to be read from
the generated schema rather than assumed. **Measured: there is none to read.**
The generated `KernelDigest` is `Schema.Struct({ id: KernelNat })`, and its own
emitted description says a real digest "is a hash over one canonical byte form"
that "stays in the trusted base" — the model models identity labels and says
nothing about hexadecimal, deliberately. So the only statement of the runtime
digest domain in this package is `truth/Digest.ts:14-15`, and the guard
inherits it rather than twinning it. Alternatives: hard-code 64 lowercase hex
in the kernel plane (a second statement of a domain that already has one, and
the exact hand-written twin Law 1 refuses — it would also silently disagree the
day the domain moves); derive a width from `KernelNat` (the model's naturals
are unbounded, so there is no width there to derive); assume the ruling's "64"
literally and stop reading (it would have been right today and unfounded
tomorrow). Why: the ruling's intent is that the guard not invent its domain,
and the honest way to satisfy that here is to inherit the one domain statement
that exists and to write down that the generated one does not. **Load-bearing?
yes** — this is the difference between a guard that tracks the digest domain
and one that agrees with it by coincidence.

### T6. The guard reuses `malformed-value` and mints no vocabulary at all

Decided: the guard refuses through the existing schema-issue bridge, so its
refusal is `malformed-value` — kind, law, and repair already taught and already
pinned in `test/RefusalPayloads.taught.txt`. Nothing is added to
`scripts/kernel-runtime-refusals.ts`, nothing is regenerated, and no model
refusal reason is minted. The ruling licensed the staged runtime-refusal
mechanism as a fallback "if no emitted reason fits"; measured, the fallback is
not needed, because the bridge that mechanism feeds already carries this exact
meaning: `decodeRefusing(Digest)("")` refuses `malformed-value` teaching "A
decoded value satisfies its declared schema", which is precisely the law a
malformed content address fails. Alternatives: mint `malformed-digest` as a new
DEV-804 staged row (grows the roster, the taught-payload pin, and both
generated files, to say what an existing spelling already says — and every
runtime spelling added is persisted wire vocabulary that DEV-804 must later
converge); reach for a model reason (forbidden by the ruling, and none of the
sixteen means "this text is not an address"). Why: the cheapest lawful refusal
is an existing one that is already true, and the ruling's constraint was about
not minting MODEL vocabulary — honoring it by minting no vocabulary at all
honors it strictly. **Load-bearing? yes** — a reviewer overruling this pays one
line in the seam plus a manifest row, and the wall does not change either way.
*Note for the coordinator: this is the one place I read the ruling's fallback
as permission rather than instruction.*

### T7. Ruling A1's clauses are four, and the second site is pinned rather than refused

Decided: the wall gains four clauses — the seam's conversions all sit behind the
domain guard; the seam contains no `throw`; no unpinned module under `src/`
reads digest bytes as an unbounded natural; and the identity pin names only live
sites. An identity translation is defined as a `BigInt(...)` call over a
hex-prefixed argument. Measured, the tree already carries a SECOND such site:
`Lane.partition` computes `Number(BigInt(\`0x${keyDigest}\`) % BigInt(lane.partitions))`.
It is not refused, and it is not silently exempted either — it gets a pin row
saying what it is. It reduces an ALREADY-BRANDED `Digest` to a shard index; the
result is a routing coordinate that reaches no candidate and names no
declaration, and the package's own law already governs it ("subjects route and
envelopes identify"). Alternatives: refuse it and ship the wall red (an
overclaim — the ruling refuses a second translation into IDENTITY LABELS, and a
partition index is not one); exempt it inside the checker (a waiver nobody
reviews, buried in mechanics — the shape T1 already rejected for `Address.ts`);
widen the rule to `Number.parseInt(_, 16)` as well (it would catch the JSON
`\uXXXX` unescape in `truth/Canonical.ts`, which cannot carry a 256-bit address
because it yields a `number` — the bound is stated in the pin instead of
discovered as noise). Why: a wall that cannot see a site cannot be trusted about
it, and the pin is where "seen and lawful" is written down separately from
"seen and refused". **Load-bearing? yes** — the pin's liveness clause means the
day `Lane.partition` stops converting, the row reds rather than rotting.

### T8. The seam is a subpath export and stays out of the barrel

Decided: `package.json` gains `"./KernelIdentity"` so the module's own example
is truthful, and `src/index.ts` is NOT touched. The plane-reorg spec's open
placement 4 rules that "Exporting Kernel* namespaces from index.ts: a real
surface decision with T7 consequences; stage 3+, its own ticket, not assumed",
and this ticket has no licence to make it. Measured: the public type quantifier
is the emitted barrel, so the subpath export moves neither walk — 132 public
types and 79 emitted signatures before and after. Alternatives: add
`export * as KernelIdentity` to the barrel (assumes the placement decision the
spec reserves, and grows the DEV-795 debt ledger with rows nobody ratified);
ship no export at all (the module docstring's `@example` would name an import
path that does not resolve, which is a doc that lies). Why: hosts inside the
package reach the seam directly, which is what "hosts become judgable" needs,
and the barrel decision stays where the spec put it. **Load-bearing? no** — it
is reversible in one line, and it is recorded so the reviewer sees it was a
choice.
## Task DEV-820 — wall isolation under parallel real-NATS load

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. The board ticket's
body is the whole scope: diagnose why the 4x parallel wall group flaked under
load (OrderedConsumerSemantics, FoldChaos, ChaosCli, a different one each run)
and fix the HARNESS, not test semantics.

### T0. Load-scale the wall-group fetch bounds to a loaded machine, not an idle one

Decided: waitForPorts (200x25ms = 5s nominal) and waitForFile (400x25ms =
10s nominal) in 	est/NatsHarness.ts, plus FoldChaos' own waitForPumpFile
(400x25ms), are raised to 2400x25 = 60s nominal. The mechanism is named and
measured, not assumed: under deliberate CPU load on this 16-logical-core host an
idle nats-server starts in 76-130ms (p50 97ms), but with 8 burners one server
sampled {1236, 2318, 2540, 3559, **20479**} ms — a worst case over 150x the idle
ceiling and past the old 5s bound, which threw 
ats-server did not write its
ports file within 5 seconds and reddened whichever wall file was starting its
server at that moment (reproduced directly under load). Each Bun.sleep(25) in
the poll loop also overruns under saturation (it measures 25ms of timer, not
25ms of wall), stretching the nominal bound further. 60s is a bounded ceiling
that still fails loudly on a genuinely broken launcher or an absent child
result file. Alternatives: leave the idle-sized bounds (the flake); bound by
heartbeat rather than by file (does not cover child-process results). Why: the
startup-and-result-file latency is the one harness-owned resource the walls
rely on, and the old numbers were sized against an unloaded reviewer machine.
**Load-bearing? yes** — a genuinely stuck launcher must still redden the wall,
which the 60s ceiling keeps true.

### T1. ChaosCli's six-field wall gets an explicit bound instead of bun's 5s default

Decided: the "refuses an unpinned head and a module without a fold in six
fields" test, which spawns three bun CLI processes sequentially and asserts
only exit=2 plus the six refusal fields (it makes no timing claim), is given
the sibling chaos walls' 120000ms bound instead of inheriting bun's default
5000ms per-test timeout. Under the wall group's parallel real-NATS load the
three sequential CLI spawns exceeded 5s and the loader reddened the test as
	his test timed out after 5000ms with no assertion false (observed directly).
Alternatives: split the three CLI runs across separate faster tests (changes
the wall's shape); shrink the CLI's cold-start (production change, outside
scope). Why: the flake is a loader-default false trip over a test that never
timed anything, and it is a wall-group robustness fix, not a semantic one.
**Load-bearing? no** — the assertion set is unchanged; only the loader bound
that was silently 5s is made explicit and sized.

### T2. The no-responders wall is re-scoped off a schedule-dependent client transient

Decided: the "direct consumer deletion enters a no-responders repull loop
before heartbeat recovery" test no longer REQUIRES a consumer_deleted
notification; it asserts the load-bearing properties — exactly three

o_responders (the repull loop), zero heartbeats_missed (ahead of heartbeat
recovery), zero ordered_consumer_recreated — and records
consumer-deleted=<n> in its trace. Mechanism, evidenced: consumer_deleted
is a bimodal transient of the pinned @nats-io/jetstream@3.4.0 client. It is
only emitted when a pull races the consumer delete's teardown and returns the
409; a repull that lands after teardown gets a 503 
o_responders and the
client emits consumer_deleted NEVER (it keeps repulling — the 503s are
responses, so the heartbeat monitor with maxOut:2 never fires, so

esetPending/info-refresh and its 409 never run). Reproduced ~50% in the 4x
wall group before the change; a trace with consumer-deleted=0 still passed
after, documenting the repull the test is named for. The obsolete assertion
made the wall flake with nothing false — exactly the "a wall nobody trusts"
outcome DEV-820 is about — and the Windows one-flake observation (~line 421)
is the same transient landing the other way on the next run. Alternatives:
wait longer for the 409 (regime-B schedules never emit it, so any window still
fails or hangs); raise idle_heartbeat (does not create a 409; only widens the
heartbeat window); gate on both it and no_responders (makes the assertion
vacuous then hangs). Why: the wall's own finding is consume-repulls-deleted-name;
the transient was never the claim. The no-responder CASE is still exercised
unchanged (delete the consumer, observe the repull loop ahead of heartbeat
recovery) — this re-scopes to the stable, documented behavior. **Load-bearing?
yes** — the wall's claim is the repull loop ahead of heartbeat recovery, and
that is what is asserted; a future client that heartbeat-recovers instead
(emitting heartbeats_missed) or stops repulling still reddens it.
## Task DEV-786 — the CLI is @effect/cli

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. The board ticket's
scope: rewrite `surface/cli.ts` on the official Effect CLI with Effect-4
semantics throughout, retire the hand-rolled parser, and render refusals from
the taught vocabulary instead of the six-field rival the CLI hand-assembled.

### T0. The dependency law grows by ONE package, and it is not `@effect/cli`

Decided: `packages/plait/package.json` gains `@effect/platform-bun` at
`catalog:` — and nothing else. The ticket commissioned adding `@effect/cli`
plus its `@effect/printer` and `@effect/printer-ansi` dependencies, and that
addition was not made, because the premise does not hold on this release line:
the published `@effect/cli` tops out at `0.77.0`, whose peers are
`effect@^3.22.1` and `@effect/platform@^0.97.1` — the Effect **v3** line. The
workspace catalog pins `effect@4.0.0-rc.108`, and on v4 the CLI is **in-tree**:
`effect/unstable/cli` ships `Command`, `Flag`, `Argument`, `Param`, `Primitive`,
`Prompt`, `CliConfig`, `CliError`, `CliOutput`, `HelpDoc`, `GlobalFlag`, and
`Completions` inside the catalog-pinned release the package already depends on.
So the official CLI package arrives at zero cost to the closed list. What the
tree genuinely lacked is the CLI's `Environment` — `FileSystem`, `Path`,
`Terminal`, `Stdio`, `ChildProcessSpawner` — for which `effect` core ships only
`layerNoop`/`layerTest` fakes; `BunServices.layer` provides all five (plus
`Crypto`) for the real process. Alternatives: hand-write the five service layers
from core primitives (the exact hand-rolling of a shipped primitive that law 6
and this whole ticket refuse); pull `@effect/cli@0.77.0` and downgrade the
workspace to Effect v3 (a catalog rollback nobody ruled, to get a worse
version of a module already present); ship the CLI against `layerTest` fakes (a
CLI that cannot read its own argv). Why: the estate's dependency law names a
closed list, and the cheapest lawful growth is the growth that is actually
needed. `@effect/platform-bun` is the same Effect release at the same catalog
pin, so the list grows by one sibling of a member rather than by a family.
**Load-bearing? yes** — `AGENTS.md`'s runtime-dependency clause is amended to
name it, so a reviewer sees the addition as a diff rather than inferring it.

### T1. Effect's abstractions carry the algebra, rather than the algebra being rebuilt in Effect

Decided: of the two lawful framings the operator named, this file takes
"Effect abstractions as the algebra's carrier". A `Command` tree is already a
declarative structure a parser interprets; `Schema` is already a decode algebra;
`Layer` is already the wiring algebra; the `Refusal` union is already a sum with
one total interpretation. So the estate's algebra is expressed by CHOOSING those
carriers rather than by re-deriving them: the command tree is data, decoded by
`Flag.withSchema(Digest)` — truth's own schema, so the CLI states no width and
no alphabet — and refusals are rendered by encoding the value through its own
schema. The file is laid out in the three movements that follow from this
(vocabulary, declaration, interpretation) and says so in its header.
Alternatives: express the estate's algebra with Effect semantics but a bespoke
parameter model (a second grammar beside the library's — the hand-rolled twin
the ticket exists to kill); the middle course of a thin library wrapper with
estate-shaped helpers around it (neither algebra legible, which the operator
named as the failure mode to avoid). Why: the surface's job is to be a
projection, and the library's own combinators are the projection's carrier.
**Load-bearing? yes** — it is why a future generator verb is a `Command` value
added to `withSubcommands` and nothing else moves.

### T2. The six-field rival rendering dies onto the schema-encoded taught value

Decided: `printRefusal`'s hand-assembled
`{kind, sort, law, path, got, expected, next}` object is deleted. `renderRefusal`
encodes the refusal through the `Refusal` schema union and then through the
package's one RFC 8785 canonicalizer, so what reaches stderr is the taught value
itself, in the estate's canonical bytes, key order and all. Measured
consequence: the rendered payload gains `_tag` — eight keys, not seven — because
a `Schema.TaggedError` carries its tag and the hand-written field list could not.
That is the DEV-804 staged rival retiring, and it is what moved
`negative-controls/Fold.cli-refusal.trace.txt` from `component=six-field-refusal`
to `component=taught-refusal-rendering`. `test/RefusalPayloads.taught.txt` moved
by exactly two lines: `surface/cli.ts#0`, the `chaosRefusal` minting site, is
byte-identical — no taught text moved — and `#1` changed from the rival's
`expected <expression> / next <expression>` to the new total function's
`expected <absent> / next <absent>`, which is the fallback literal that keeps
rendering total when a payload will not canonicalize. `test/RefusalNext.test.ts`
stopped decoding the CLI's stderr through a hand-written `CliStructuralRefusal`
struct and now decodes through the shipped `StructuralRefusal` schema, because a
twin on the reading side is the same defect as a twin on the writing side.
Alternatives: keep the seven-key shape by hand-listing fields after encoding
(the rival, restated); render with `JSON.stringify` and skip canonicalization
(two byte forms for one value, and the package has a law against the second).
Why: "errors reach the terminal AS the taught vocabulary" is satisfiable only by
rendering the value, and a rendering that names its own fields is a second
schema. **Load-bearing? yes** — adding a field to `StructuralRefusal` now
reaches the terminal without editing the CLI.

### T3. The parser owns syntax; the taught vocabulary owns law

Decided: a malformed invocation — unknown flag, unknown subcommand, bad choice,
malformed digest — is refused by the library's parser and rendered with the
command's own help, and the CLI adds no word to it. A well-formed invocation
that violates the estate's law — no fold selector, two fold selectors, an
unpinned span, two head selectors, `--repeat > 1` with the kill arm, a lane that
disagrees with the fold — is a `StructuralRefusal` carrying `invalid-chaos-request`.
`negative-controls/Fold.cli-usage.trace.txt` is the new control arm pinning the
first half, including the assertion that `StructuralRefusal` is ABSENT from a
usage error's stderr — the shape that reddens if a hand-rolled parser grows back.
Two consequences recorded rather than discovered: (1) `plait not-chaos` is no
longer this package's refusal, so `RefusalNext`'s collection of the
`invalid-chaos-request` kind moved to `plait chaos` with no arguments; (2)
judgment order changed — `--fold <digest>` is now refused as uncataloged before
the span is examined, where the old parser checked the span first. Both orders
refuse, with the same kind, and the tested paths (`["fold"]`, `["head"]`,
`["module","fold"]`) are unchanged; the new order answers the more fundamental
question first. `judgeRequest` RETURNS the admitted run rather than nodding at
the request, which is why nothing downstream carries a cast. Alternatives: map
`CliError` into a `StructuralRefusal` so every failure speaks one vocabulary
(it would re-implement the library's usage rendering — the ticket's central
refusal — and would mint estate vocabulary for syntax the model never taught);
keep an `argv[2] === "__pump"` sniff ahead of the parser (the pump is now a
`Command.unlisted` subcommand, parsed by the same tree, hidden from help and
completions). Why: the division is what makes the surface a projection — the
library projects the parameter grammar, the corpus projects the refusal
vocabulary, and neither is asked to speak for the other. **Load-bearing? yes** —
the new control fails if either side starts answering for the other.

## Task DEV-780 — the admin surface pinned; two authority-carrier laws named

Task-local placeholders (rule 1): T-numbers restart per task. Spec authority:
`docs/research/2026-08-13-nats-vendor-corpus-scorecard.md` item 6 — the admin
surface graded CONFIRMED-and-larger-than-gate — plus the DEV-780 charter
refresh, which absorbed DEV-783's mirror half into this ticket. ADR-0009 rules
the roles the two named laws defend. The values below are measurements against
the pinned nats-server (`v2.14.4`, `test/NatsHarness.ts`), not documentation.

**The measured surface at the pin.** A stream created with only the fields the
three carriers used to pin comes back carrying nine more: `republish` and
`subject_transform` absent, `allow_direct` false, `mirror_direct` false,
`compression` `"none"`, `max_msg_size` -1, `allow_msg_ttl` false, and
`allow_atomic` / `allow_msg_counter` omitted from the serialization entirely
when off. A KV bucket's backing stream comes back the same except
`allow_direct`, which `@nats-io/kv` turns ON at creation and reads through.
Every one of the nine was settable on a stream these carriers would then open
and trust.

### T0. Two of the nine fields get their own named laws; the other seven stay shape

Decided: `mirror`/`sources` mint `mirrored-authority-carrier` and
`allow_msg_ttl` mints `expiring-authority-carrier`; `republish`,
`subject_transform`, `allow_direct`, `mirror_direct`, `allow_atomic`,
`allow_msg_counter`, `compression`, and `max_msg_size` widen the three existing
substrate-shape kinds. The split is by REPAIR, not by field count. A mirrored
carrier's repair is a different carrier — ADR-0009's replica read plane — and a
TTL carrier's repair is a fresh stream, because the server refuses to clear
`allow_msg_ttl` once it is set. Neither repair is "restore the shape", which is
what every shape kind teaches. Alternatives: one new kind for the mirror only
and per-message TTL folded into shape (the ticket body rules TTL refused "by
its law", and the charter refresh names both kinds as this widening's mints);
a new kind per field (nine kinds whose repair sentence is one sentence, which
is a vocabulary that has stopped classifying anything). Why: DEV-783's absorbed
finding is precisely that a real law refused INCIDENTALLY teaches the wrong
repair — a mirror carries no `subjects`, so the old gates refused it on the
subjects clause and told the operator to restore subjects a mirror must not
have. **Load-bearing? yes** — the mirror arm in
`test/CarrierAdminSurface.test.ts` asserts the KIND, so a regression to the
incidental refusal reddens rather than passing as "still refused".

### T1. Both new laws are minted once, in one internal module, not once per carrier

Decided: `src/internal/carriers.ts` holds the admin-surface reading and both
named-law mints; `lanes.ts`, `cells.ts`, and `anchors.ts` call them with a
`CarrierSite` naming their refusal path and repair subject. The consequence is
deliberate and visible in the wall: `RefusalPayloads.taught.txt` renders
`next[0].subject <expression>` for both payloads, because the subject is the
one parameterized field. Alternatives: mint at each carrier (three copies of
one law sentence, and the taught-payload wall would then pin three texts that
must be edited together — the drift the wall exists to catch, installed by
hand); make the subject a literal shared by all three carriers (pins the fifth
facet at the cost of telling an operator which seam refused). Why: the role
rule is ADR-0009's and not any one plane's, so one law has one text; the wall
still pins kind, law, expected, the repair note, and the repair body, which is
four of five facets and every sentence an operator reads. **Load-bearing? no** —
it is a placement decision; the laws would hold either way.

### T2. `allow_direct` is pinned per carrier, and declared at creation rather than inherited

Decided: the lane's evidence stream pins `allow_direct: false` and the two KV
carriers pin `true`, and each carrier now STATES the value when it creates its
stream or bucket instead of accepting the client's feature detection. Pinning
one value for both would refuse a carrier this package itself created: the lane
reads through consumers, while `@nats-io/kv` turns direct-get on at creation and
reads through it. Declaring it means a substrate that cannot serve direct reads
fails loudly at `bucket.ensure` — the client rejects the option by name — rather
than creating a bucket the very next line refuses as misshaped. At the R=1 this
package already pins there is no second replica for a direct read to be stale
against, which is the only hazard the vendor names for the flag. Alternatives:
pin `false` everywhere (refuses our own buckets); leave it unpinned (the field
stays in the unchecked set item 6 names). **Load-bearing? yes** — it is the one
field whose lawful value differs by carrier, so a gate that pinned it uniformly
would be wrong at two carriers out of three.

### T3. Two pinned fields have no mutation arm, and the reason is pinned instead

Decided: `mirror_direct` at every carrier, and `allow_msg_counter` at the two KV
carriers, are asserted by the gates but carry no mutated-config control, because
the pinned server refuses to create either configuration —
`mirror_direct` without a mirror is answered "stream has no mirror but does have
mirror direct", and a counter stream over the KV bucket's `discard: new` is
answered "counter stream cannot use discard new". Rather than drop the
assertions or fake the arms, the test file pins those two server refusals by
their exact messages. Alternatives: drop the two assertions (the fields return
to the unchecked set, and a substrate that later admits them is unwatched);
weaken the KV base to `discard: old` so a counter arm plants (mutates two fields
at once, which is exactly what the mutation-arm discipline forbids); assert
`mirror_direct` only on mirrored streams (the mirror law fires first, so the
arm would prove nothing about this field). Why: an assertion with no reachable
control is honest defence in depth as long as its unreachability is itself
walled — the day either configuration becomes creatable, that test reddens and
the field owes an arm like every other. **Load-bearing? yes** — without the
pinned refusal messages the two assertions would be unfalsifiable and
undocumented, which is the shape of a gate that has quietly stopped checking.

### T4. The KV gates read the backing stream's config, not the KV status projection

Decided: both KV carriers now assert over `status.streamInfo.config`. `KvStatus`
projects five of the fields this ticket pins and none of the other four — it has
no reading of `subject_transform`, `allow_direct`, `allow_atomic`, or
`allow_msg_counter` at all, and its `compression` getter collapses the store
level to a boolean. Alternatives: assert what `KvStatus` exposes and leave the
rest unchecked (four of nine fields stay in item 6's unchecked set); read the
stream through `jetstreamManager` separately (a second round trip for a value
the status already carries). The five-field checks keep reading the projection,
so the existing refusal's `got` is unchanged in shape and only gains the admin
surface. **Load-bearing? yes** — half the widening is unreachable through the
projection.

### T5. The lawful arm is the control that makes every mutation arm attributable

Decided: `test/CarrierAdminSurface.test.ts` builds the three carriers' backing
streams by hand — the lane partition stream as `lanes.ts` creates it, the two KV
backing streams as `@nats-io/kv` 3.4.0 creates them for the options the carriers
pass — and its first arm requires all three carriers to OPEN on them, with no
`flip`. Every other arm moves exactly one field off that same base. Alternatives:
let each carrier create its own stream and mutate afterwards (a config update is
refused for several of these fields, and for the rest it is a second code path);
skip the lawful arm (a base unlawful in some second field would make all ten
mutation arms refuse for a reason no assertion names, and a gate that stopped
reading a field would still look green). Why: the hand-built base is a second
statement of the admitted shape, so the wall is not the gate agreeing with
itself. **Load-bearing? yes** — it is the only thing that makes a mutation arm's
refusal attributable to its own field.

### T6. The two kinds are ordinary add-only mints, and the census does not move

Decided: both kinds enter through the DEV-808 machinery — the roster line in
`scripts/kernel-runtime-refusals.ts`, the hand pin citing DEV-804 in
`test/fixtures/refusal-staged-debt.pin.txt`, the taught payloads regenerated
into `test/RefusalPayloads.taught.txt` — and both land as staged debt, since the
kernel corpus carries neither reason. Cited: the operator's A7 ruling that a
refusal mint is add-only and ordinary. No public type name is added: the union
gains two literals, `Refusal.StructuralRefusalKind` stays one row, and
`check:type-universe` reports the same 132 classified types with the same
ratchet pins before and after. **Load-bearing? no** — it records that the
vocabulary door was walked and that the public-surface census was checked
against it rather than assumed.

**Stated residual.** Three things this ticket does NOT do. (a) The Go journal's
shape-gate twin is untouched, so `go/` still pins the narrower surface and the
parity gap is real — the ticket's own Limits section rules its widening a
separate ticket. (b) `internal/registers.ts` and the commons control stream in
`internal/nats.ts` keep their un-widened gates: the dispatch scoped this slice to
the lane stream and the two KV bucket gates, and the register bucket is named in
the ticket body's seam list, so it is owed a follow-up rather than absorbed here
without a ruling. (c) Every check is still open-time. A config mutated after the
carrier opened is invisible to all three gates, exactly as scorecard item 1's
residue says; the standing-invariant ticket owns that and this one does not
claim it.

## Task DEV-779 — the register incarnation pin

Task-local placeholders (rule 1): T-numbers restart per task and collide across
tasks by design; repository D-numbers are assigned at merge. This task
discharges the T6 deferral above and carries the three-bucket condition the
DEV-744 hand-off rode on: which buckets are pinned, which are exempt, and on
what grounds. Measurements below were taken on this Mac against the pinned
nats-server v2.14.4 and `@nats-io/{jetstream,kv,nats-core,transport-node}@3.4.0`.

### T0. The incarnation identity is the backing stream's creation timestamp

Decided: the register pins `KvStatus.streamInfo.created` — the ISO timestamp
the server stamps on a stream when it is created — read from the `bucket.status()`
the substrate-shape check already performs, so the capture itself costs no extra
round trip at open. Alternatives, all rejected on evidence rather than taste:
`config.name` (identical across incarnations by construction — it is the
bucket's name); `config.metadata` (observed identical across three consecutive
incarnations on one server: `{"_nats.level":"4","_nats.req.level":"0",
"_nats.ver":"2.14.4"}` — it describes the server, not the stream);
`state.first_ts`/`first_seq`/`last_seq` (every one of them moves under ordinary
writes); a server-minted stream UID (**does not exist in the pin**: the
client's `StreamInfo` is exactly `{config, created, state, cluster, mirror,
sources, alternates, ts, ...ApiPaged}`, and no field of it is a stream
identity). Why: `created` is the only field that is fixed for a stream's whole
life and re-minted by its rebirth, which is precisely the predicate the pin
needs. Measured resolution: the server emits microseconds
(`2026-08-19T01:09:02.373135Z`); twenty consecutive destroy-then-create rounds
produced twenty distinct values with zero collisions and a minimum separation of
1ms at millisecond parse resolution — about three orders of magnitude above the
field's own resolution. Stated bound: two incarnations created inside one
microsecond would collide, and nothing in the pinned client can distinguish
them. **Load-bearing? yes** — the whole guard is this comparison, and a
weaker field would make it vacuous.

### T1. The assertion runs at the head of every action, ahead of every staleness comparison

Decided: `assertIncarnation` runs first in `grant`, `renew`, `commit`,
`expireSteal`, and `observe`, before those actions read the key or compare
tokens. Alternatives: assert immediately before each `bucket.update`, which is
one round trip tighter. Why the tighter placement is WRONG here: a reborn
bucket's revisions restart at one, so the token comparison `token !==
entry.revision` reaches a verdict on the reborn bucket's numbers and refuses
`stale-register-token` naming a "current" fence no holder of this register was
ever granted. Ordering the pin first makes the classification honest — the
refusal says the bucket was reborn, not that someone else holds the lease — and
the wall asserts exactly that (`expect(refusal.kind).not.toBe(
"stale-register-token")`). Measured cost: one stream-info round trip per action,
0.109ms p50 / 0.173ms p95 / 0.866ms max over 50 samples, against 0.093ms p50 for
the `get` each action already performs. **Load-bearing? yes** — measured
mutation: with all six assertions deleted, the reborn-bucket commit refuses
`stale-register-token`, which is the wrong law, the wrong expectation, and a
green-looking answer.

### T2. `observe` is pinned, and the read-back path revalidates

Decided: `observe` carries the assertion even though it presents no fence, and
`reconcileUpdate` asserts the pin on the branch where the key vanished
mid-flight before minting a transport absence. Alternatives: pin only the three
fenced writes. Why: `observe` is the taught repair of nearly every register
refusal ("Observe the register for the current token and holder"), so an
unpinned `observe` would answer the repair with a different bucket's holder and
token — the exact silent answer the pin exists to refuse. And a key that
vanished under an in-flight write is either lifecycle mutation (the pin's law)
or a genuinely ambiguous outcome (a transport absence); asking the pin is what
tells the two apart. **Load-bearing? yes** — measured mutation: with the
assertions deleted, `observe` on the reborn bucket returns
`{token: 3, holder: "holder-c"}` as this register's state, and `renew`
successfully renews holder-b's lease at token 2.

### T3. A destroyed bucket refuses on the pin's law, not as a retryable absence

Decided: a stream-info request that answers 404 on the incarnation read refuses
`incarnation-mismatch` with `got: "a destroyed backing stream"`, rather than
minting the adapter's transport absence. The classification is
`cause instanceof JetStreamApiError && cause.status === 404` — operation context
plus the published API status, the same shape as `isCasRefusal`, and
deliberately not the unpublished `10059` code constant: `@nats-io/jetstream@3.4.0`
exports `JetStreamApiCodes` without a stream-not-found row, and the concrete
`StreamNotFoundError` class is absent from the package entrypoint, so naming
either would reach past the published surface. Alternatives: leave it a
transport absence (the behaviour before this task). Why: `Refusal.retryAbsence`
retries the absence sort, and no retry can bring the pinned incarnation back —
the absence classification promises a repair that does not exist.
**Load-bearing? yes** — measured mutation: with the assertions deleted the same
scenario refuses with `sort: "absence"`, i.e. a retry loop over a destroyed
bucket.

### T4. The pin is a precondition, not a two-phase commit — the window is stated, not hidden

Decided: the module documentation and this record both say that a rebirth
landing between the assertion and the CAS is a residual window of one round
trip. Alternatives: claim the pin closes the hazard. Why: it does not, and no
client-side check can — the pinned server publishes no expected-stream-identity
precondition to attach to a KV write, so the assertion and the write cannot be
made one operation. What the pin does change is the shape of the exposure: an
unbounded window in which any stale fence lands becomes a one-round-trip window,
and the DEV-716 ACL suite (application credentials cannot delete or recreate
streams and buckets) remains the other half of the guard, exactly as T6 said.
**Load-bearing? no** — it is a bound on the claim, and it moves the day the
substrate offers the precondition.

### T5. The new kind is minted as an object literal so the taught-payload wall pins it

Decided: `incarnation-mismatch` is constructed by calling `structuralRefusal`
with an inline object literal rather than through this module's positional
`lawRefusal` helper. Alternatives: reuse `lawRefusal` like the register's other
seven structural refusals. Why: `check:refusal-payloads` walks object literals
carrying a `law` field and reads the field through `ts.isPropertyAssignment`;
`lawRefusal` builds its record from shorthand properties, which the walk does
not see, so every refusal minted through it is absent from
`test/RefusalPayloads.taught.txt`. Minting the pin's payload as a literal is what
puts its law and its repair under the byte-compared wall — the manifest went
from 62 to 64 pinned payloads, and both new rows carry the full law and repair
text. The seven existing sites are left alone: retro-fitting them is a separate
diff over unchanged behaviour. **Load-bearing? yes** — without it the pin's
teaching would be editable without reddening anything.

### T6. The cell store is EXEMPT from the pin, and here is the argument

Decided: `flb-fab-cell` is NOT pinned. The argument, read off the seams rather
than assumed: (1) **no fence crosses a call boundary.** `CellService` is
`{read, merge}` — no revision is ever returned to a caller, and there is no
caller-supplied revision parameter anywhere on the surface. (2) **The revision
the CAS presents is read in the same attempt.** `internal/cas.ts`'s
`casJoinLoop` re-reads at the top of every iteration and passes
`observed.revision` to `update` inside that same iteration; nothing carries a
revision between calls, so there is no stale token for a reborn bucket to
honor. (3) **The carrier converges by join, not by revision order.** The cell
join is set union over holder-attributed observations with canonical-byte
identity (F1's `f1_cell_merge_aci`), the loop's pre-CAS `carries` guard makes a
re-contributed delta cost one read and no write, and the bucket is `history=1`
— only the current state has meaning and no audit claim rides cells.
Alternatives: pin all three buckets uniformly, which was DEV-744's original
three-bucket order. Why not: the pin's law is about a FENCE being honored across
a reset, and this store presents none; adding a round trip per merge to defend a
law the carrier does not rely on would be cost without a claim. **What the
exemption does NOT say:** a deleted cell bucket destroys data, and the
observations of writers that never re-contribute are gone. That is the deletion,
not the revision order, and no pin recovers it. **Load-bearing? yes** — it is
the recorded half of the DEV-744 hand-off condition, and it is falsifiable: the
day `CellService` hands a revision back to a caller, the argument fails and the
cell store needs the pin.

### T7. The anchor store is EXEMPT from the pin, and its argument is different from the cell's

Decided: `flb-fab-anchor` is NOT pinned. Stated honestly first: unlike the
cell, the anchor store DOES carry a revision across calls —
`AnchorStore.commit(key, expectedRevision, …)` takes one, and the pump holds
`revision` between arrivals. So the cell's argument does not transfer, and the
exemption rests on three different properties that are in the code: (1) **a
reborn bucket detaches the stale pump loudly.** On an empty reborn bucket
`update(anchorKey, bytes, R)` refuses wrong-last-sequence for every R, and the
adapter classifies that as `lost-anchor-cas`, whose law is "One live pump owns
each fold partition; losing its anchor revision CAS is a fatal detach". (2)
**Mutual exclusion of pumps is not the anchor's job.** It is the durable
JetStream consumer `FLB_FOLD_<foldDigest>` on the LANE stream — explicit ack,
`max_ack_pending` at the buffer bound — and an anchor-bucket rebirth does not
touch the lane stream. (3) **What the anchor holds is derived and
re-derivable.** It is `{floor, stateDigest, head}`: the floor is a resume
coordinate into the journal (`opt_start_seq: anchor.floor + 1`), `Anchor.advance`
admits only a contiguous `floor + 1` successor, `head` is a hash chain over the
applied events, and the state is stored content-addressed under `state.<digest>`
with `loadState` re-deriving the digest on every read and refusing on mismatch.
A rewound anchor is a rewind of a deterministic fold over a durable journal,
recoverable by replay; a register's landed outcome is a terminal commitment that
"once set, never changes" and is recoverable by nothing. **That is the actual
line between pinned and exempt in this package: the register's fence guards an
irreversible decision, the cell's and the anchor's revisions guard a value their
own algebra can re-derive.** Residual, stated rather than waved: if a reborn
anchor bucket climbs back to exactly the stale revision at that key, the stale
pump's CAS lands and rewinds the partition's checkpoint — the write is still a
verifiable, content-addressed checkpoint, and the recovery is replay.
Alternatives: pin the anchor bucket too (one stream-info round trip per applied
event — the hottest path in the package, and the pump commits on every applied
arrival). Why not: paying that on the fold's inner loop to convert a
loud-detach-or-replayable-rewind into a refusal is the wrong trade at this
rung, and DEV-744's `Registers.audit` arm plus the DEV-716 ACL posture are where
that case belongs if it is ever taken. **Load-bearing? yes** — same reason as
T6, and the residual named here is the thing a future ticket would close.

### T8. The wall is a new file, and bucket destroy+recreate is its SUBJECT, not its isolation

Decided: the chaos wall lands as `test/RegisterIncarnation.test.ts`, four rows,
and it performs the destroy+recreate on a second connection the register service
does not own. Row isolation stays one fresh nats-server per row (seam rule 7,
DECISIONS T0), which is what makes the deliberate lifecycle mutation legible as
the subject rather than as a leaked isolation trick — the round-1 register wall
was made nondeterministic by using destroy+recreate for isolation, and that
prohibition is unchanged. The load-bearing row drives the reborn bucket to the
exact revision the stale token names (a fresh grant on a reborn stream sits at
revision 1, numerically the fence the stale holder still carries), so the
scenario is silent success rather than an incidental miss, and it then presents
the same stale token to the RAW substrate and asserts it lands — the wall
proves the pin refused something the substrate would have accepted, not
something the substrate was going to reject anyway. Alternatives: extend
`Register.test.ts` (a 386-line file three lanes were touching this week).
**Load-bearing? yes** — measured mutation, all six `assertIncarnation` calls
deleted: 3 of 4 rows red and the positive control stays green. Row 1 reds on
`Result.isFailure(replayed)` being false — the stale commit lands silently. Row
2 reds with `{grant: "duplicate-grant", renew: ACCEPTED token 2 holder-b,
commit: "stale-register-token", expireSteal: ACCEPTED token 3 holder-c,
observe: ACCEPTED token 3 holder-c}`. Row 3 reds with `sort: "absence"`. Row 4,
the untouched-incarnation control, stays green under the mutation, which is what
makes the other three attributable to the deleted assertions and not to the
chaos.

### T9. The kind's estate-terms MEANING is authored at the mint, beside its roster line

Decided: `incarnation-mismatch` carries a meaning — what the kind means in the
estate's language, as distinct from what its refusal teaches a caller at the
moment it fires. **Meaning authored at mint, pending the DEV-825 mechanism
pickup and taste pass.** That ticket pinned the contract as a roster field named
`meaning`, a plain string of one to two sentences; the field does not exist in
`scripts/kernel-runtime-refusals.ts` yet, so the sentence is authored as a
comment beside the roster line, shaped as the exact string that moves into the
field, in the pinned voice — declarative present, estate terms, fact then
implication:

> An incarnation is one life of a store — the store a name resolved to at the
> moment a fence was taken against it. A store reborn under that name is a
> different store answering to it and owes nothing to its predecessor's fences,
> so a fence from the dead incarnation names a store that no longer exists
> rather than a round that has merely moved on.

Alternatives: wait for the mechanism and author the sentence then. Why not: the
meaning is a fact about the kind that only the minting author holds, and
recovering it later is archaeology over a diff. Three texts are deliberately
distinct here and none substitutes for another — the `law` is what the carrier
promises ("A fencing token is honored only by the backing-stream incarnation
that minted it"), the taught `next` is the repair, and the meaning is what the
term denotes in the language. The second sentence is the one that earns its
place: it is why this kind exists rather than reusing `stale-register-token`,
and it is the same property T1's ordering enforces and the wall's
`expect(refusal.kind).not.toBe("stale-register-token")` asserts.
**Load-bearing? no** — it is authored vocabulary; the wall that would catch it
going wrong is DEV-825's, not this ticket's.

### T10. The DEV-780 admin-surface widening completes at the register seam, on the shared laws

Decided: the register bucket's gate reads the same nine admin-surface fields the
lane, cell, and anchor carriers pin, through `internal/carriers.ts` —
`importsFacts`/`mirroredAuthorityCarrier` and `expiresFacts`/
`expiringAuthorityCarrier` ahead of the shape clause, `hasPinnedAdminSurface`
inside it, `adminSurface(config)` spread into the `got`, and `allow_direct:
KV_ALLOW_DIRECT` declared at bucket creation. The read is
`status.streamInfo.config`, because the `KvStatus` projection carries only five
of the nine. This is DEV-780's own stated residual (b) — that ticket scoped
itself to the lane stream and the two KV buckets and named the register gate as
an owed follow-up rather than absorbing it without a ruling — discharged here
because this lane holds `internal/registers.ts`. Alternatives: a separate
ticket, which is what DEV-780 proposed; re-minting the two named laws at this
carrier. Why not the second: a law minted twice is two texts that drift, and the
whole point of `carriers.ts` is that the mirror and per-message-TTL laws are
ADR-0009's role rule rather than any one plane's — the carrier appears in `path`
and in the repair's subject, and nowhere else. **Load-bearing? yes** — measured
mutation, the mirrored arm below.

### T11. The register's admin-surface arm plants a MIRROR, and the lawful base is its control

Decided: the wall arm is a mirrored backing stream for `KV_flb-fab-reg`, planted
by hand on a fresh server, paired with a lawful-base arm that requires the
carrier to OPEN on the hand-built shape. One field moves; the control is what
makes the refusal attributable to it. Alternatives: extend
`CarrierAdminSurface.test.ts`'s ten-row mutation table to a fourth carrier.
Why not tonight: the table is parameterized over three carriers with two arms
already carrying carrier-specific plantability exceptions, and widening it is a
larger change than the seam completion asked for — the arm here proves the
register gate reads the shared laws, and folding the register into that table is
a clean follow-up for whoever owns it next. Why the mirror rather than any other
of the nine: a register is the authority carrier par excellence, and a mirror is
the failure that a shape gate refuses INCIDENTALLY and for the wrong reason — a
mirror carries no `subjects`, so before the named law existed the gate refused
on the subject clause and taught "restore the bucket shape" to an operator whose
actual repair is a replica read-plane carrier. The arm asserts the named kind
and `not.toBe("register-substrate-shape")` for exactly that reason.
**Load-bearing? yes** — measured mutation: with `hasPinnedAdminSurface` and the
two named-law guards removed from the register gate, the mirrored arm reds
because `Effect.flip` finds a SUCCESS — the carrier hands back its five-action
service (`{grant, renew, commit, expireSteal, observe}`) over a mirror, admitting
a read-only copy of another stream's facts as its authority — while the
lawful-base control and all four incarnation rows stay green. Note what the
mutation shows about the old gate: the register's shape clause reads only
`storage`/`replicas`/`history`/`ttl`/`max_bytes` off `KvStatus`, none of which a
mirror moves, so before this widening a mirrored register bucket was admitted
outright rather than refused incidentally.

## Task DEV-825 — the kind-meaning mechanism

Placeholders `T0`–`T7` are task-local; repository D-numbers are assigned at
merge.

### T0. The drafting voice: declarative present, two sentences, fact then implication

Decided: every one of the 59 drafted meanings is written in one register —
declarative present tense, estate vocabulary, at most two sentences, the first
naming what fact the kind names and the second what that implies or protects.
No sentence addresses a reader, none carries a repair, and none paraphrases the
`law` text the same kind teaches at refusal time. Alternatives: mirror the
refusal-time teaching's imperative voice (would make the two registers
indistinguishable, which is the one thing the operator's requirement is
against); a single sentence throughout (loses the implication half, which is
where the estate lesson lives); free length (unreviewable as a set — the
operator's sitting reads 59 of these in a row, and an uneven register turns a
taste pass into a copy-edit). The register was recommended by the dispatch and
is not overridden by the requirement comment, which is silent on voice.
**Load-bearing? yes** — the sentences are what the taste pass rules on, and a
mixed register would be ruled on as prose rather than as vocabulary.

### T1. A meaning is a doc comment, not a data field

Decided: the roster row carries `meaning: string` (the coordinator-pinned
shape), and every projection renders it as a DOC COMMENT — over each literal in
`STRUCTURAL_REFUSAL_KINDS`, over each row of `KERNEL_REFUSALS` and
`KERNEL_RUNTIME_STRUCTURAL_REFUSALS`, and as a paragraph on the prose page.
Nothing gains a runtime field. Alternatives: add `meaning` to
`KernelRefusalRow` and to the runtime ancestry row (would put unratified prose
into a shipped data shape, so a consumer could read it, depend on it, and be
broken by the taste pass); a separate generated meanings module (a fourth
artifact for one string per kind). Why: a doc comment is where a reader and an
agent both meet the kind, it costs no public type — `check:type-universe`
reports the same 132 classified types and the same ratchet pins before and
after — and it can be rewritten wholesale at the taste pass without a wire
change. The roster's own shape did move, from a string array to
`{ kind, meaning }` rows; nothing but `kernel-tables.ts` consumed it.
**Load-bearing? yes** — it is what keeps drafts out of the shipped data shape.

### T2. The emitted reasons get meanings too, in the same reviewed file

Decided: the 16 refusal reasons the kernel model emits get meanings on the same
terms as the 43 runtime kinds, in a second reviewed ledger
(`KERNEL_REFUSAL_REASON_MEANINGS`) beside the roster in
`scripts/kernel-runtime-refusals.ts`. The dispatch rules this the default when
the operator's requirement comment is silent on emitted reasons, and it is —
the comment says "every minted refusal kind" and names only runtime spellings
in its retroactive list. Alternatives: cover the runtime kinds only (leaves the
model's own vocabulary, which is the half a reader of the prose page meets
FIRST, unexplained); put the meanings in the corpus (impossible and forbidden —
the corpus is the model's emission, this package cannot edit it, and it carries
no field a meaning could ride in); a separate `scripts/refusal-meanings.ts`
(two files for one reviewed ledger, and the cross-seat merge surface doubles).
The generator resolves the ledger against the corpus in both directions and
refuses either gap. **Load-bearing? yes** — it decides the mechanism's domain,
and a later ruling to narrow it would have to delete rows rather than add them.

### T3. The prose page gains a runtime-kinds section, and says which of its text is not the model's

Decided: `docs/generated/kernel-language.generated.md` renders each emitted
reason's meaning inside that reason's existing section, beside its law and
repair, and gains a new `## Runtime structural refusal kinds` section carrying
all 43 runtime spellings with their ancestry and their meanings. The page's
header gains a paragraph saying, in as many words, that the meanings are the
one thing on the page that is NOT the model's text. Alternatives: render
meanings for the emitted reasons only (the runtime kinds would have no prose
home at all, and the operator's requirement names them first); a second page
for the runtime vocabulary (a second artifact and a second wall for one
section). Why: the page opened by promising every word on it is the model's
own, reproduced verbatim; adding house prose without retracting that promise
would make the page lie about itself, which is worse than the gap it fills.
**Load-bearing? yes** — the retraction is what keeps the page honest now that
it has two sources.

### T4. The meaning law reads three artifacts' bytes, and the ancestry law is left alone

Decided: `checkRefusalMeanings` is a second law beside `checkRefusalVocabulary`
in the same wall, reading the meanings back out of three sets of committed
bytes — the truth-plane union's source, the kernel table's source, and the
rendered page's — with the emitted reasons themselves still read from the
corpus fixture's bytes. It never consults the reviewed roster the generators
read. Alternatives: check the roster module's values (self-comparison: the
generator's input agreeing with the generator's input); fold the clauses into
`checkRefusalVocabulary` (a red wall would stop naming which of ancestry and
meaning moved). Why the page is the third read and not a convenience: the page
is rendered by `render-kernel-prose.ts` and the modules by `kernel-tables.ts`,
two renderers, so requiring them to agree byte for byte is what catches one
projection dropping, truncating, or reflowing a meaning the other renders in
full. **Load-bearing? yes** — without the independent reads the law would be a
tautology over one value.

### T5. `check:kernel-prose` joins the battery, because a projection outside it is unwalled

Decided: `check:kernel-prose` is added to `test:fast`, which is what `bun run
gates` reaches through `test:packages`. It existed as a script and sat in no
chain, so the committed page's byte-identical regeneration was proven by
nothing before this ticket. Alternatives: leave it out and let the meaning law
alone hold the page (that law compares meanings, not the whole page, so every
other rendered word would stay unwalled); wire it into `test:walls` (that group
is the real-NATS suite, and a pure byte check does not belong behind a
substrate). Cited: root law 9 — a generated artifact needs a check wired into
the battery. **Load-bearing? yes** — it converts a claim about the page into a
gate arm, and it is what makes the page usable as the meaning law's third
artifact.

### T6. One plant per clause, and the fourth clause's absence is stated rather than hidden

Decided: `negative-controls/RefusalMeaning.meaningless-kind.mutant.ts` plants
three mutations into the bytes of the artifacts the wall parses — a kind with
no meaning, a shipped meaning whose marker line was rewritten, and a page
meaning rewritten to a paraphrase — and each is refused on its own clause, with
all three reasons committed in one trace. The fourth clause, one name and one
meaning across both registers, has NO plant, and the mutant's header says so:
no name is carried by both registers at this pin — all 43 runtime kinds are
staged debt and none of the 16 emitted reasons spells one of them — so making
the two disagree would mean inventing a roster row. Alternatives: plant only
the meaningless kind (the dispatch's floor, but it leaves the marker law, which
is the clause the taste-pass ruling will flip, with no evidence it can fail);
synthesise a shared name for clause 3 (a control planting a kind the estate
does not have proves a law over a vocabulary that does not exist).
**Load-bearing? yes** — the marker arm is the only evidence that the draft pin
is a wall and not a comment.

### T7. `unwrapAssertions` learns `satisfies`

Decided: the wall's expression unwrapper now sees past `satisfies` as well as
`as` and the older type-assertion form, because `KERNEL_REFUSALS` is written
`[...] as const satisfies ReadonlyArray<KernelRefusalRow>` and a reader that
stopped at the annotation reported "not an array literal" over a file that
plainly carries one. Alternatives: a second unwrapper for the new readers (two
spellings of one operation, and the next reader picks the wrong one); drop
`satisfies` from the generated table (the annotation is what makes the
generated rows type-check against the row interface, and dropping it to please
a parser inverts which side is the authority). The widening cannot make the
ancestry law pass where it failed: it only lets the reader reach a literal it
previously refused to look at, and every element check still runs.
**Load-bearing? no** — mechanical, but recorded because it moves a shared
reader every clause of the wall depends on.

**Stated residual.** Four things this ticket does NOT do. (a) The sentences are
DRAFTS. Nothing here pins them: the marker is on every one, the wall requires
it, and only the DEV-825 operator taste pass may retire it — reading a green
wall as ratified prose is exactly the misread the marker exists to prevent.
(b) `incarnation-mismatch` is absent from the roster at this pin, so no meaning
was drafted for it; the DEV-779 lane authors it inline when the kind lands, in
the shape this ticket pinned. (c) The meaning law does not prove FRESHNESS. A
sentence edited in the roster and not regenerated is caught by
`check:kernel-tables` and `check:kernel-prose`, both of which were run red
against exactly that mutation and green again after regeneration; the meaning
law reads only what shipped, and that division of labour is on purpose.
(d) The refusal-time teachings are untouched: `RefusalPayloads.taught.txt`
still pins 64 payloads byte for byte and no `law`, `expected`, or `next` moved.
Adding a meaning is add-only beside the teaching, never a rewrite of it.

## Task DEV-825 round 2 — the official surfaces lose their tracking artifacts

Placeholders `T8`–`T13` continue the task above; repository D-numbers are
assigned at merge. Everything here follows one ruling: **operator ruling
2026-08-19, tracking artifacts out of official documents**, sharpened the same
sitting to **all plait items refer only to digests or derived digests**. The
round-1 marker was the ruling's first casualty and its own violation — it
carried a ticket number into three rendered surfaces.

### T8. The marker states the fact and names nothing

Decided: the marker is exactly `Draft meaning, awaiting ratification.` — one
line, a full sentence, no parenthetical, no id. Alternatives: keep a ticket
reference so a reader can find the sitting (that is precisely the artifact the
ruling removes, and the reader who needs the ticket is a maintainer reading the
README, not a reader of the language); drop the marker's period to match a
label style (it is a sentence about the sentence below it, and reads as one).
The wall pins the exact string and refuses any other line opening `Draft
meaning`, so the retired form cannot come back by habit. **Load-bearing? yes** —
the marker is rendered 60 times per surface and is the single most-repeated
string in the projections.

### T9. Provenance becomes the corpus digest, and the renderers stop taking a path at all

Decided: `KernelCorpus` gains a `digest` — SHA-256 over the bytes the reader has
just proved canonical, the same derivation `truth/Digest.ts` applies — and every
rendered surface names its source by that digest. `KERNEL_TABLE_PROVENANCE` and
`REFUSAL_KIND_PROVENANCE` become `{ corpus, format }`; the artifact path,
generation command, generator name, source directory, roster path, and waiver
ticket all leave the generated bytes. Alternatives: keep a path beside the
digest "for convenience" (the ruling is that a path is an ambient reference, and
a convenience copy of one is still one); leave provenance out entirely (a
surface that cannot say what it came from cannot be checked against it, and the
digest is what makes that check mechanical rather than a hope). The stronger
half of the decision is that `renderKernelTables`, `renderRefusalKinds`, and
`renderKernelProse` no longer TAKE a corpus path: rendering one is now a
compile-time impossibility rather than a rule someone has to remember.
**Load-bearing? yes** — it is the ruling's positive half, and it converts an
unverifiable string into a claim a reader can hash and compare.

### T10. Regeneration instructions move to a README beside the artifact

Decided: `docs/generated/README.md` is new and carries what the page may no
longer say — what the artifact is, what it was rendered from, how to regenerate
it, and which wall proves it. Alternatives: put the instructions in the package
README (a reader who finds the page does not necessarily find the package); drop
them (root law 9 requires every generated artifact to document its
regeneration, and the ruling moves that documentation rather than repealing it).
The README is explicitly the sanctioned home for this material, so it is the one
file in that directory where a command or a path appears, and it says so.
**Load-bearing? yes** — without it the ruling and law 9 would read as a
contradiction.

### T11. The rendered waiver goes; the ancestry law keeps its teeth

Decided: `KERNEL_RUNTIME_STRUCTURAL_REFUSALS` rows lose their `waiver` field and
the row type collapses from a two-arm union to one interface with a `source` of
`"kernel-corpus" | "staged-debt"`. `checkProjectionAncestry` drops its
waiver-citation clause. Alternatives: keep the field and exempt it from the
sweep (an exemption is how a law stops being one); render the ticket as a digest
(a ticket number is not a value with canonical bytes, and pretending otherwise
would be worse than a path). Nothing is lost: which ticket owns a staged-debt
row is still required, still hand-written, and still checked — by
`checkRefusalVocabulary` against the reviewed pin, which is a tracking-native
record and the correct home for it. The classification word `staged-debt`
stays, because it is a fact about the vocabulary rather than about a tracker.
**Load-bearing? yes** — it draws the line the ruling asks for in the one place
the two laws met.

### T12. What counts as a path is defined narrowly, and the wall says why

Decided: the sweep refuses three shapes — an extension-bearing name, a path
rooted at one of this repository's directories, and any three-or-more-segment
slash form — with leading `~` and `@` excluded. It deliberately does NOT refuse
every slash: the model's own prose says `immutable/head-relative`, which is a
pair of words, and brand tags are `~foldlab/plait/kernel/...` while package
specifiers are `@foldlab/core/jcs`. Alternatives: refuse every slash (would
refuse the language in order to protect it, and would force the brand tags —
which are identities, exactly what the ruling is FOR — to be spelled around);
refuse only the repo-dir roots (a path under an unknown root is still a path).
`node` is likewise absent from the command-runner list, because the model calls
a graph vertex a node and the first run of the wall caught exactly that.
**Load-bearing? yes** — a wall that cannot tell an identity from a location
would be enforcing the opposite of the law.

### T13. One plant per class, and the retired marker is planted without an id

Decided: `negative-controls/TrackingArtifacts.rendered.mutant.ts` plants four
mutations into the bytes of the three official surfaces — a ticket citation, an
artifact path, a generation command, and a retired-shaped draft marker — each
refused on its own clause with all four reasons in one committed trace. The
marker plant deliberately carries no id, no path, and no command: the literal
retired string contained a ticket number and would have been refused by the
tracking-id clause, so planting it verbatim would have proved the marker clause
nothing at all. Alternatives: plant the literal old marker (refused twice over,
and the arm could not tell which clause fired); fold these arms into the
existing meaning control (a red control should name which law moved, and these
are a different law). **Load-bearing? yes** — the marker arm is the only
evidence that the exact-form pin is a wall.

**Stated residual.** Three things this round does NOT do. (a) The sweep binds
the three surfaces the ruling named — the two generated tables and the prose
page. Other generated artifacts in this package were measured and left:
`KernelSchemas.generated.ts` and the builder projection still carry header
paths and commands, and the CLI's rendered output was not swept. Each is a real
instance of the same law and each wants its own slice; none was quietly fixed.
(b) The sentences are still DRAFTS, on a new marker. The ruling changed what
the marker may say, not whether the meanings are ratified. (c) The
`incarnation-mismatch` meaning landed from its own lane while this branch was
out and is kept VERBATIM — this round did not re-word another lane's sentence,
only re-marked it along with every other.

## Task DEV-831 — the plain-TypeScript SDK becomes generated

Task-local placeholders `T0`–`T7`; repository D-numbers are assigned at merge.
The authority is the TypeScript-projection ruling (§11a ruling 4, adopted with
the operator's four requirements — complete, simple, fully self-contained,
100% fidelity) and the projection wall it left owed. The subject is
`src/kernel/KernelSdk.generated.ts`, emitted by `scripts/kernel-sdk.ts` and
gated by `check:kernel-sdk` with an executed mutation arm beside it.

The prep lane measured fourteen drift rows between the adopted reference sketch
and what the corpus emits today. Four of them were not implementation choices,
and each is answered below with the measurement that decided it.

### T0. The code projection spells the model's own field names

Decided: every field of every generator is the name the model's `Act` record
carries — `writ`, `target`, `lane`, `cell`, `declared`, `register`,
`declaration`, `parent`, `request` — and the surface parameter list of each
constructor is that generator's field list, in that generator's order.
Alternatives: the compound self-descriptive convention the sketch uses
(`writ_digest`, `lane_digest`, `reduction_digest`); a third convention local to
this surface. Why: the compound convention is ruled, and it is ruled for the
WIRE projection, where a flat argument list has no surrounding structure to
carry the sort. A code projection has the sort in the type, and this one has a
harder constraint on top of that — its output values must BE the values the
door accepts, and the door's fields are the model's, so a compound rename would
need a translation layer between the surface and the judgment. That layer is
the hand-derivation the whole pipeline exists to prevent. The generated schemas
and the generated builder already spell the model's names, so this keeps one
code spelling in the estate rather than two. **Load-bearing? yes** — it is what
makes "the SDK's output is exactly what the door takes" a property of the bytes
rather than of a converter nobody wrote.

### T1. The carrier is `bigint`, on the generated family's side of the split

Decided: every model integer is `bigint` in this surface — identity labels,
ranks, fences, positions, and the encoded vectors a verdict carries.
Alternatives: the sketch's `string` for digests and `number` for every scalar;
`number` with a documented ceiling; a substitutable carrier parameter with
`number` as the default, which is what the generated brand aliases do. Why: the
corpus, every generated schema, and the door end to end are already `bigint`,
and the estate's number-domain ruling makes integers exact and unbounded. The
sketch's carriers are the only ones in play that are neither the model's nor a
parameter over it, and their cost is measurable rather than stylistic: a
`number` carrier rounds the pinned canon vector at 2^53 + 1, and a `string`
digest cannot be handed to the door without a conversion the sketch never
defined. The branded aliases keep a `Carrier` parameter so a call site
migrating a real runtime value can substitute, but the default is the model's.
The exactness is walled, not asserted: a lawful emit carrying 2^53 + 1 goes
through admission and its encoded vector is compared against the arithmetic the
model's own canonicalizer specifies. **Load-bearing? yes** — it is the one row
where the sketch was not merely different but unusable.

### T2. The discriminant is `_tag` at camel case, and the reachability requirement is what decides it

Decided: `_tag`, with the model's own camel constructor spellings, on every
tagged union this surface projects. Alternatives: the sketch's `act` key with
kebab tags; a per-layer split, kebab on the wire and camel in code. Why: both
spellings are generated today, in different layers — the tables carry the kebab
wire spelling of the refusal reasons, the schemas carry the camel constructor
names — and an emitter must be told which register it prints. Here it is not a
free choice. The door's candidate type keys on `_tag` at camel, so any other
register would make the SDK's values a different type from the door's, and the
one property this artifact exists to have would be gone. The kebab register
still appears, in exactly the place the door uses it: the taught refusal rows,
whose reasons are the wire spellings. **Load-bearing? yes** — it is the
difference between one grammar and two that resemble each other.

### T3. Brands are string-literal keys, and only a closed brand domain earns one

Decided: the brand carrier is an interface with the string-literal key
`~foldlab/plait/kernel/Brand`, byte-identical to the one the generated tables
declare, and the sorts that earn an alias are those whose every brand parameter
names a record class the corpus enumerates. Today that is exactly `Digest`, by
declaration kind, with the twelve per-kind aliases; `Token` and `Position` are
branded in the model over open domains and are carried here as their carrier.
Alternatives: the sketch's `declare const KIND: unique symbol`; a brand key
local to this file; branding every indexed sort with a type parameter. Why: a
module-local symbol cannot be named from another module, which is precisely
what the twelve aliases exist to provide, and it is not how the estate's pinned
release spells a type identity. Reusing the tables' key is the stronger half of
the decision and it is checked: one kind's digest is ONE type across the two
generated files, and the test assigns in both directions to say so. An open
brand domain is dropped rather than faked because the tie it would have carried
is carried better — see T4. **Load-bearing? yes** — a brand nobody outside the
file can name is a brand that separates nothing.

### T4. The dependent ties are carried by construction, not by an inference guard

Decided: the four ties live in what the constructors WRITE. `decide` takes a
register and a fence and writes the register into the token claim; `fold` takes
a reduction and writes it into the anchor; `resolve` writes no anchor at all;
`join` takes a declared algebra and writes the declared-algebra strategy.
Alternatives: the sketch's `NoInfer` guards on constructor parameters, which is
the sketch's real invention and the thing nothing else in the estate carries;
accepting the raw candidate members and checking at admission only. Why: a
guard refuses a crossed pair that was spelled; construction gives it no
spelling. There is nothing to cross, because the caller supplies the coordinate
once and the constructor is the only thing that writes it twice. That is
strictly stronger than the guard and it survives erasure, which a type-level
tie does not. The one guard worth keeping is kept: `resolve` binds the digest
brand to the named kind through `NoInfer`, because there the two arguments are
genuinely independent and the caller supplies both. The claim is measured on
returned values across several inputs rather than argued from a signature.
**Load-bearing? yes** — it is the answer to the census's asymmetry finding, and
it is why the emitted surface carries ties the program builder had to drop.

### T5. The candidate grammar is projected whole; the eight generators are its lawful half

Decided: the surface carries the entire candidate grammar the corpus declares —
eleven candidate arms, nine predicate productions, eight raw argument atoms,
both merge strategies — as types with constructors for the atoms, the
predicates and the strategies; and eight constructors, one per model generator,
and none for anything else. Alternatives: project only the lawful arms, which
is the sketch's stated principle — an SDK that cannot spell the crime is the
point; project the candidate grammar alone and drop the eight. Why: the sketch's
principle has a measured consequence, and it is the reason this ticket exists —
the sketch declares an admitted-or-refused result and can produce nothing of the
kind, because the door judges candidates and the sketch cannot spell one. A
surface that makes the crime unwritable PREVENTS it; the door REFUSES it and
teaches the repair, and four of the sixteen repairs are machine-applicable,
which is only a meaningful claim if the refused candidate can be written down.
So the principle is kept where it belongs: at the constructors. Twelve of the
nineteen emitted conformance vectors are built by the eight; the other seven are
the structural crimes the four ties forbid plus the three arms with no lawful
generator, and they are written as candidate values so the door can teach them.
All nineteen get the model's own verdict. **Load-bearing? yes** — it is the
whole of "the door stays reachable", and it is the row the code-mode view was
blocked on.

Stated openly: this resolves the code-mode spec's central row in the shape it
called "one SDK, two halves, with the door between them", and it resolves it
because the reachability requirement forces it, not because the alternatives
were priced. Whether the code-mode view takes this whole surface or only one of
its halves is still open and still wants the operator.

### T6. The surface joins the swept official documents

Decided: `KernelSdk.generated.ts` is a fourth official surface under root law
10. Its provenance is the corpus digest and the interchange format and nothing
else; the renderer takes no path, so rendering one is a compile-time
impossibility rather than a rule to remember; and the standing sweep for
tracking artifacts now reads its committed bytes line by line alongside the
other three. Alternatives: carry the header path, command and source line the
schemas and the builder still carry; declare conformance in this file and leave
it unswept. Why: the law's own test is whether a reader is handed the document
as the language, and this one is handed to a model as the language. The two
generated artifacts that still carry paths and commands were measured and left
where they were — each is a real instance of the same law and each wants its own
slice — but a surface landing today has no excuse to land dirty. Every draft
meaning is rendered behind the ratified marker, verbatim, so the marker clause
bites here too. **Load-bearing? yes** — 3470 swept lines across four surfaces is
a wall; a sentence in a header is not.

### T7. The reference sketch is not deleted, and its retirement is a separate act

Decided: `verify/kernel/projections/kernel.ts` stays exactly where it is. The
generated surface is its SUCCESSOR, not its transcription: it carries every
inventory at the same cardinality and the same wire names, it carries the same
sixteen taught refusals at their CURRENT texts (three of which the sketch has
stale), it carries the dependent ties the sketch invented, and it reaches the
door, which the sketch cannot. Alternatives: delete the sketch in this slice;
keep it and wall it against the emitted surface. Why: the sketch is the adopted
reference and it carries four `@ts-expect-error` controls that are each
load-bearing — measured, one error per control with all four neutralised —
which is evidence this surface does not yet reproduce. Retiring it is a review
act at a sitting, on parity of intent, not a side effect of landing its
successor. Walling the two against each other would wall a divergence that is
deliberate on nine of the fourteen measured rows. **Load-bearing? yes** — the
sketch is the only place the type-level tie argument is written down, and
losing it before the sitting reads it would lose the argument.

**Stated residual.** Four things this round does NOT do. (a) The admitted
sentence is projected as its canonical encoding vector and not as a structured
act. The door's verdict is assignable to the projected one, so the surface is
reachable in both directions, but a caller who wants the sentence's fields
reads them from the door's own types. The vector is what two implementations
must agree on, which is why it is the half that landed. (b) The sketch's four
compile-time controls have no twin here. The ties they exercise are carried by
construction and measured on values, which is a different and stronger
measurement, but "this spelling does not compile" is not among the claims this
slice makes. (c) The wall's tracking-id class still matches one ticket series
only, so an obligation cited from a second series inline would pass the sweep.
It was found by the prep lane, it is not fixed here, and it is not exercised by
this surface. (d) `KernelSchemas.generated.ts` and `KernelBuilder.generated.ts`
still carry header paths and generation commands. Each is the same law as T6
and each wants its own slice; neither was quietly fixed.
## Task DEV-825 round 3 — the id clause learns the family, not one prefix

Placeholders `T14`–`T16`. Same ruling as round 2: **operator ruling 2026-08-19,
tracking artifacts out of official documents.** A measurement from another lane
found the round-2 clause spelled `DEV-` and therefore blind to every sibling
tracking family; a live sitting-note citation had walked past it in a projection
outside the swept set.

### T14. The clause is the shape, and the finding is reproduced before it is repaired

Decided: the tracking-id pattern widens from the `DEV-` literal to two-to-four
uppercase letters, a hyphen, and digits — the shape every tracking family in
this estate takes. Before widening, the blind spot was reproduced first-hand:
with the old clause restored and a sitting-note citation planted into an
official surface, the sweep returned no tracking-id refusal for it at all.
Alternatives: add the known sibling prefixes by name (a list of prefixes is the
same defect one level up — it checks the families someone thought of); match any
letter run of any length (collides with far more ordinary prose, and the
measured surfaces gave no reason to reach that wide). **Load-bearing? yes** — a
wall spelled for the instance in front of it checks that instance and nothing
else, which is what this round is repairing.

### T15. The one lawful collision is excused BY NAME, because no shape separates it

Decided: the three swept surfaces were measured before the clause moved, not
after. Across all of them exactly one id-shaped token appears and it appears
twice — `SHA-256`, on the page's provenance line and in the kernel table's
header. Nothing else in the corpus's own prose, the type vocabulary, the
docstrings, or the generated headers takes that shape; widening the letter run
to one-through-six letters and re-measuring returned the same single token. So
`SHA-256` is excused by name, and the decision worth recording is WHY it is not
excused by shape: `SHA-256` and `KM-11` are shape-identical, and what separates
them is what the letters mean, which no pattern can read. Alternatives: bound
the digits, bound the letter run, or look ahead for a power of two — each is a
rule invented to fit one token, and the next family that happened to fit it
would pass invisibly, which is the exact defect being repaired. **Load-bearing?
yes** — the excuse is the one hole in the clause, and its shape decides whether
the hole is one token wide or a family wide.

### T16. The by-name excuse is walled by liveness, and gets its own plant

Decided: every entry in the excuse list must be spoken by some swept surface;
one that is not reddens the wall. A name list is where a family could be
admitted on purpose, so it is held to the same discipline as every other pin
here — it may only widen for something visibly there, in a diff a reviewer
reads. The control gains two arms: a sitting-note id planted into a surface, and
a stale excuse planted into the list the clause is read against (which is why
the list is now passed into `checkNoTrackingArtifacts` rather than reached for
inside it). The sweep also stopped taking only the FIRST match per line, since an
excused token standing before a real one would otherwise report the excused one
and stop — an exclusion that shadows a line is a hiding place. **Load-bearing?
yes** — without liveness the excuse list is an unguarded bypass of the clause it
belongs to.

**Stated residual.** The swept surface set is UNCHANGED and deliberately so: the
measured residuals outside it — the other generated projections and the CLI's
rendered output — remain their own slices under the standing posture, and the
live citation that prompted this round sits in one of them. This round widened
the class, not the sweep.
## Task DEV-823 — identity on the resolve path is the fetched bytes

Placeholders `T14`–`T18`; repository D-numbers are assigned at merge. The
disposition of the digest-resolution audit's F-1 and F-2 was pre-ruled by the
coordinator under DEV-823, from standing law rather than from a fresh judgment:
a repairing decoder names a value that did not arrive (finding #36), byte-to-
value admission passes one constrained door (DEV-806), and identity is exact
bytes (DEV-807). The payload resolve leg was the same defect standing on the
read path. F-3 is a dossier and no code under `internal/registers.ts` moved.

### T14. Identity first, decode second, and the order is the law

Decided: the payload leg admits on `sha256(bytes) == D` over the fetched octets
BEFORE anything decodes them, and only then runs the estate's constrained
decoder over those same bytes. Alternatives: keep the value-level check and
merely make the decoder fatal (that closes the invalid-UTF-8 and
duplicate-member halves and leaves member order, whitespace, and needless
escapes wide open — three of the five laundered rows in the committed control
trace survive it); check the bytes AND then re-derive from the decoded value as
well (a second identity derivation that can only disagree with the first when
the canonicalizer is not idempotent, which would make a canonicalizer defect
surface here as a resolve refusal rather than where it lives). Why: a digest
names one exact byte string, so the only question a read door may ask is
whether these octets hash to it, and asking it first means no interpretation
has had a chance to repair the input. The value handed back is parsed from the
verified bytes, so on this leg the object a caller reads is the object the
digest attests to. **Load-bearing? yes** — it is the finding's whole
disposition.

### T15. One taught law moved, and it moved because the repair inverted its order

Decided: `malformed-value` on the payload leg now teaches *"Bytes admitted at a
digest decode as exactly one RFC 8785 wire value."* The retired sentence said
the decode happened *before any identity check*, which was true of the defect
and is false of the repair — it named the very order the audit found wrong.
Alternatives: leave the sentence (it would print a law the code no longer
follows, which is the condition the audit already flagged once); mint a new
kind for a post-identity decode failure (the fact has not changed — presented
bytes are not one wire value — only where in the sequence it is discovered).
The pin moved by exactly one line and the diff shows it. This is a wire change
and is recorded as one, not as a rendering detail: a consumer reading the
taught law will read a different sentence. **Load-bearing? yes** — a moved
taught text is persisted evidence.

### T16. The oracle is the octets and the digest, and it is pinned before any row is graded

Decided: every row's expected verdict is `sha256(octets) == D` under FIPS
180-4, computed over the exact byte string, consulting neither the resolve door
nor the Go twin; `D` itself is pinned first by requiring the TypeScript seam's
digest of the value to equal the SHA-256 of the Go twin's canonical bytes for
that same value. The Go arm then contributes the question its read door
actually asks — are these bytes already canonical — through the line-oriented
constrained-decode endpoint. Alternatives: compare the two implementations to
each other (both-sides-agree is consensus, not verification, and a shared
decoder assumption is exactly the bug class here); freeze a hand-typed digest
constant in the corpus (a transcription error would make every row agree on a
falsehood). Why the arms compose into a theorem rather than a coincidence:
because `D` is by construction the digest of a canonical byte string,
`sha256(bytes) == D` already implies the bytes are canonical, so the repaired
byte check subsumes the twin's canonicality check instead of sitting beside it.
**Load-bearing? yes** — without a named outside oracle the wall would prove
only that two decoders were written by people who read the same document.

### T17. The control restates the one function, and the control test keeps the restatement honest

Decided: the value-identity control is a deliberate restatement of the payload
leg with one law dropped, not a re-use of the shipped path through a
substitution point. Alternatives: export a seam from the resolve module so the
control could inject its identity step (it would put a test hook on the
package's public surface with no law licensing it, and the public-surface walk
would pin it forever); plant the mutation into the module's bytes and restore
the tree, as the canonicalizer twin control does (that shape suits a source
SCAN, and what wants measuring here is an admission decision at runtime). The
restatement's hazard — drifting into agreement with the shipped door and
passing quietly — is closed by what the control asserts: the variant must ADMIT
byte strings the shipped door refuses, and the committed trace names which
five. A drifted variant fails the control instead of passing it.
**Load-bearing? yes** — a wall no mutant can fail is not a wall.

### T18. F-3 ships evidence and no repair, and the evidence says what it cannot show

Decided: the register finding's disposition is the operator's, so this round
lands two measured rows against a real server and changes no line of the
register adapter. The rows say what a single-replica server can answer — that
the bucket is opened on the direct-read route at one replica, and that the
substrate's compare-and-set, presented with the revision a landing produced,
ACCEPTS an outcome overwrite. Alternatives: land no evidence and argue the
disposition from reading (the whole question is whether the CAS reaches the
pre-check's verdict on its own, and that is a fact about the substrate, not
about the source); reproduce the staleness itself (one replica is the only
replica and cannot lag behind itself; a row claiming otherwise would be
theatre). What the rows deliberately do NOT claim: no staleness was
reproduced, and no reachability argument is made for the revision the raw CAS
was handed. **Load-bearing? yes** — the second row is what makes "demote the
pre-check to advisory, the CAS arbitrates" an unsafe disposition rather than a
tidy one, and it is a fact nobody had measured.

**Stated residual.** Three things this round does NOT do. (a) The catalog leg
still re-derives from the VALUE, because that store holds values and there is
no byte string to check; the module now says so in place rather than letting
the memo's licence sentence imply otherwise. (b) F-2's other two legs are
untouched and still launder: `Wire.verifyEnvelopeDigest` re-canonicalizes the
decoded envelope and compares that laundered digest to the message id — run on
this branch and observed ADMIT for transposed members carrying the canonical
digest — and the anchor adapter's state read hashes the decoded value while the
same file's write path compares raw bytes at the same key. Both are outside
this ticket's file scope and neither was quietly fixed. (c) The audit's hygiene
rows F-5, F-6 and F-7 stay open; the payload leg now happens to return a value
parsed from the verified bytes, which is F-7's structural repair on one leg of
one seam and is not F-7's disposition.

## Task DEV-825 round 4 — the operator ratifies the corpus, and the marker retires

Placeholder `T17` continues the DEV-825 series above; repository D-numbers are
assigned at merge.

### T17. The corpus is ratified whole, and the marker clause inverts rather than leaves

Decided: the operator ratified the drafted meaning corpus in session on
2026-08-19 — all sixty sentences, forty-four runtime kinds and sixteen emitted
reasons, in the voice they were drafted in — so the draft marker leaves every
projection and no sentence changes with it. Not one word of a meaning moved in
this round; what moved is markers and walls. The marker row leaves the reviewed
roster the model emitter reads and the marker field leaves its `Roster`, the
prose renderer and the plain-TypeScript renderer stop emitting the line, and the
five affected surfaces were regenerated through their own commands rather than
edited. From here a sentence-level amendment is an ordinary reviewed diff: the
byte walls still show it, and no ruling gates it.

The marker clause INVERTS instead of being deleted. What was required is now
refused: a meaning rendered behind a draft marker is a ratified sentence telling
its reader the operator has not ruled, which is false. The retired-marker clause
on the official-surface sweep covers BOTH old forms — the original, which
carried a ticket number outward, and the artifact-free one the mechanism ran
under — and refuses anything else that opens by claiming draftness, so a third
spelling cannot be invented back in. That sweep now reads the marker arm BEFORE
the artifact classes, because the original form carries an id and would
otherwise be caught as a tracking id rather than as the marker it is.

Alternatives: delete the marker machinery outright (nothing would then stop a
generator that was never flipped, or a copied doc comment, from rendering
draftness over a ratified sentence — the mechanism's whole point was that the
claim is walled, and the claim inverted rather than expired); keep the marker
row in the roster as unrendered data (dead data a reader has to be told is dead,
and a row nothing reads is a row nothing keeps honest); pin only the
artifact-free form as retired (the original is the one a reader would reach for,
since it is what the earlier commits show, and a wall spelled for the newer
mistake would miss the older one); refuse only the two named forms without the
opening test (a wall spelled for the instances in front of it checks those and
nothing else, which is the defect the id clause was widened to repair one level
up).

Both control arms inverted with the law. The meaning control's second plant used
to remove the marker and now puts one back, and the sweep's retired-marker arm
became two — one per retired form, each refused for its own reason. Their traces
were re-recorded by EXECUTING the mutants through a `--write` path added to each
control driver for exactly that purpose; no trace line was typed by hand.
**Load-bearing? yes** — this is the ruling the mechanism was built to receive,
and the inversion is what keeps the ratified corpus from quietly acquiring a
draft claim again.

**Stated residual.** Three things this round does NOT do. (a) It changes no
meaning, no law, no repair, and no refusal-time teaching; the taught-payload pin
is untouched. (b) The prose page's meanings are now located by page STRUCTURE
rather than by the marker line — the two meaning-bearing sections, named in the
wall — so renaming one of those sections reddens the wall rather than silently
dropping its coverage, which is the trade the marker's second job left behind.
(c) `incarnation-mismatch` is still absent from the roster, as it was when the
mechanism landed; ratification rules on the sentences that exist.

## Task: the algebra-engine unification (operator-direct commission, 2026-08-19)

Placeholders `T18`–`T21` continue the series; repository D-numbers are
assigned at merge. The operator foreclosed the grill in session ("we are
foregoing the grill and you are clear to work till completion"), so each
decision below was resolved at its recommended option under that delegation.
The full sheet (AEU-1..AEU-12) is in
`docs/design/2026-08-19-algebra-engine-unification.md`; these are the
load-bearing rows.

### T18. The engine lives in carriage, and its door context is a replica

Decided: `src/carriage/Engine.ts` is the one language-speaking service —
judgment through the imported `KernelDoor.admit` (never a wrapper), carriage
through the plane services, and a `Ref`-held `KernelDoorContext` grown only
by the engine's own admitted declares (seedable at layer build). Carriage is
the home because the engine decides nothing and carries everything; the
context is a replica in the `CellReplica` sense — a lower bound, never an
oracle — and the read-judge-grow race is benign because door growth is
monotone (the KM-20 `admit_monotone` shape, cited). Alternatives: a new
plane directory (a reorg no ruling covers); holding context in a carrier
read per judgment (a substrate round-trip per T0 operation, and the catalog
service enumerates nothing). **Load-bearing? yes** — every surface that
speaks sentences routes here.

### T19. Execution supplies are refused by the door, never by the engine

Decided: `Engine.run` completes each program node from four provenances —
declaration bytes, dataflow (a consumed local lands as its producer's landed
identity label), supplies bound by node name (`kinds` for declare, `anchors`
for fold, `tokens` for decide, `predicates` for trigger), and nothing else —
then offers the completed candidate to the one door. A missing supply is the
door's own teaching (`unfenced-decide`, `ambient-query-input`); a shape no
candidate slot can carry refuses structurally at `decodeRefusing`, the one
parse boundary. The declaration form under-determines execution BY DESIGN
(kind fields brand and are never written; anchor/token/predicate are
`form: "absent"`), so supplies are the model's own erasure read back, not an
invention. Alternatives: engine-side pre-checks (a second door — refused on
law 2); defaulted kinds or writs (sentences the author never spoke).
**Load-bearing? yes** — this is refusal parity at the program scale.

### T20. The runtime payload projection is pins-plus-identity

Decided: a runtime declare's candidate payload is its pins as `digestRef`s
followed by one `literal` carrying the value's own identity label (the
guarded `kernelIdentity` read of its digest). The model reads a Value as an
opaque identity label, so the projection is faithful; pins surface real
referents to the door's forward-reference and off-writ sweeps. Bound,
stated: an unpinned reference escapes the sweep — the same trust class as
the hash. Alternative: structural translation of every wire value into atom
lists (a second canonicalizer in disguise). **Load-bearing? yes** — it is
the one place the runtime chooses how values meet the model's sweep.

### T21. The MCP surface serves the model's artifact, byte-walled, dual-homed

Decided: `fixtures/tools.schema.json` is a byte-identical committed copy of
`verify/unity/artifacts/tools.schema.json` (the skills-mirror pattern);
`check:kernel-tools` holds the two homes identical with an executed mutation
control; the served toolkit is derived from those bytes at layer build by a
total interpreter over the artifact's nine-keyword census; handlers route
through the engine; the wire-name→candidate-field mapping is hand-carried
data under an A5-shape waiver naming the corpus's provably-absent wire-name
group. The server is the pin's in-tree `effect/unstable/ai/McpServer`
(the DEV-786 in-tree precedent), stdio, as a `plait mcp` subcommand.
Alternatives: a runtime JSON-schema generator from the corpus (a second
generator beside the model's, the drift class); Effect-Schema tools written
by hand (the twin the boundary law refuses). **Load-bearing? yes** — it is
law 3 at the agent face.

### T22. Three ratchet pins rise under the foregone-grill delegation

Decided: the type-universe ratchet pins rose by hand three times this
commission — `carriage` 7→27→29 (the engine service, its outcome and run
vocabulary, then the barrel-walked wrapper types), `planes` 61→65 (the
environment plane's provision shapes and the fold transformers) — each raise
the operator act the ledger's rule demands, performed under the operator's
in-session foregone-grill delegation and cited to it. Every new row is
ticketed debt in the DEV-795/DEV-817 shape the walk assigns, so the
unification lanes those tickets name absorb the new surface with the old.
Alternatives: minting corpus groups first (the right end state — but the
emitter growth is model-side work this commission's bounds exclude);
unexported internals (would hide the public surface the commission exists to
build). **Load-bearing? yes** — it is the audit trail for every hand edit of
a reviewed pin this session.

### T23. The one-door sweep caught the engine's first spelling, and the repair removed the spelling

Decided: when the barrel exports brought `carriage/Engine.ts` and
`surface/mcp.ts` into `check:kernel-door`'s sweep, the wall refused two
spellings this commission had written — a type-level extract naming the
refused verdict shape in the engine's row projection, and an invented
`verdict` wrapper field constructed on every MCP tool result. Both were
second-door spellings by the wall's letter, and the wall was right twice: the
type extract DECLARED a shape the door's form owns, and the wrapper field was
vocabulary the artifact's refusal_result never carried. The repair removed
the spellings rather than pinning them — the row projection takes the
intersection the refused arm already satisfies (field-total, no verdict type
named), and MCP results carry exactly the artifact's fields: a result with
`reason` is the taught refusal, a result with `sentence` is an admission, a
result with `kind` and `sort` is a seam refusal. Alternatives: a pin row
(the pin ledger is for judgment ROUTES, and the verdict clause is absolute by
design); weakening the sweep (the wall firing on the first new consumer is
the wall working). **Load-bearing? yes** — it is the session's executed
evidence that law 2's wall covers the engine, and the reason MCP results
carry no wrapper vocabulary.

### T24. A pre-existing no-op probe in the surfaces control, found and repaired at the close

Finding, then the fix. `check:kernel-surfaces-control`'s flipped-digest probe
mutated the register with a literal replace keyed to a digest beginning with
the letter b. The register rotation that landed with the meaning-corpus
ratification left no digest beginning with b, so the replace became a no-op:
the probe compared the checker's answer on an UNMUTATED register and reported
"probe flipped surface digest was accepted". The control had therefore been
red since that rotation — before this commission's first edit — and the red
was masked in this session's early battery runs by tail-piped invocations
that reported the pipe's exit rather than the battery's, which is the exact
masking failure the estate has already ruled against once. Decided: the probe
now derives its flip from the register's own first digest character and
REFUSES a no-op — a mutation that did not change its input fails the control
by name — the same did-the-mutation-take guard the model-side gates already
carry. All five probes refuse on their own reasons and the healthy tree is
accepted. Alternatives: re-keying the literal to the current register (the
same rot on the next rotation); leaving the red standing (the control's job
is to fail the CHECKER, and a probe that cannot mutate proves nothing about
it). **Load-bearing? yes** — it restores the surfaces wall's falsifiability,
and it is the session's second executed lesson that battery exits are read
unmasked.

### T25. Task DEV-852 slice A — the minimality pass: dead surface deleted, scaffolding leaves the barrel

Decided: the kernel family's public surface shrinks to what something
actually reads. Four names were commissioned for deletion and two were
deleted: `Subjects.SubjectResult` and `Wire.EnvelopeDecode`, each a bare
`Effect.Effect<…, StructuralRefusal>` alias whose only two occurrences in the
tree were its own declaration and its debt row in the type-universe ledger —
no importer, no test, no wall. The other two were REFUSED, and the refusal is
the finding: `KernelDoor.Act` and `KernelDoor.DoorContext` have no
TypeScript importer, but `DOOR_FORM_ROLES` in the one-door containment script
requires the door to export the bindings `Candidate`, `Act`, and
`DoorContext`, and refuses by name when a role's binding is missing. They are
not dead surface; they are the contract `check:kernel-door` reads off the
door's own bytes ("3 generated form roles"). Deleting them would have failed
the wall, and the wall would have been right. Five self-used-only functions
became module-private instead of deleted — `rankToKind`, `rankToStage`,
`encodePredicate`, `decodePredicate`, `canonicalValue` — each verified to
have callers only inside `KernelDoor.ts`; the code stays, the export goes,
and the door's public surface is `admit`, `make`, `encodeAct`, `decodeAct`,
and the generated form. `ContextProgram` leaves the barrel: it declares
shapes and an order with no assembly executor (T22 above, and the module's own
header says scaffolding only), it has no consumer under `src/`, and its test
imports the module directly. The price is exact and paid knowingly: there is
no public context-program surface until the F7 corpus lands, so a host that
wants those shapes reaches the subpath export rather than the barrel. The
module file, its subpath entry, and its test are untouched, so the F7 work
re-exports one line when it arrives. Alternatives: keep the six ledger rows
and let the generator absorb them later (the honest end state, but it prices
six rows of hand-written debt against a corpus group nobody has scheduled, and
the operator's minimal-API commission of this session says a public name earns
its place by being read); deleting the module outright (throws away the shapes
F7 is specified against). Ledger movement: 190 public types → 182, debt 150 →
142, and the kernel ratchet pin fell 20 → 12 under `--write`. No pin rose.
**Load-bearing? yes** — it is the record of which kernel names are public
because something reads them, and the standing evidence that the door's three
form bindings are wall contract rather than dead consts.

### T26. Task DEV-852 slice B — the corpus grows the door's verdict, and the verdict vocabulary becomes generated

Decided: three of the four orphan types enter the emitter's manifest —
`AdmitResult`, `GenTag`, `ProgramNode` — and the door's three hand-written
declarations become re-exports of generated ones. `verify/kernel` was not
edited: all four commissioned types already carried docstrings, so the only
lawful edit was never needed.

**`World` is withheld, and the withholding is the finding.** Its type argument
survives the Lean side intact — `renderRef`'s fvar path renders the binder and
the type record lands carrying `params:[{"name":"Evidence","role":"type"}]` —
so the risk the commission named did not materialise where it was expected. It
materialised one stage downstream, in `scripts/kernel-schemas.ts`, which has
exactly one story for a type parameter: brand erasure, the compile-time
separation carried by the generated aliases. That story is false for a genuine
type argument, whose field `evidence : Evidence` names no declared type and has
no runtime shape at all. Rendering it honestly means a schema factory
parameterized by the evidence schema, which is a surface design the ticket did
not commission and which would move the type universe, the prose renderer and
the SDK together. So `World` stays declared and unprojected, the orphan
register names it at count 1, and the projections gate pins that name where it
pinned `AdmitResult` before. A generator surprise is a finding, not a field to
improvise around.

**The frozen-header pin is a count pin, so updating it is part of add-only
growth.** `type` and `doc` moved 22 → 25 and the corpus 125 lines → 131. The
pin's identity fields — format 2, the generator string, the record and source
names — are untouched, which is the test that distinguished a count update from
a wall being edited to agree. Eight count sites moved in
`verify/unity/run.sh` and three in `verify/projections/run.sh`. Two further
pins moved for cause rather than for count: the projections orphan wall named
`Kernel.AdmitResult` as its known orphan and now names `Kernel.World`, and one
test — `KernelCorpus.test.ts` — counted 22 types and 22 docs and now counts 25.

**The enrichment, in the `KernelRef` precedent's shape.** `KernelVerdict` is
rendered from the `AdmitResult` record: arm names from its constructors, the
admitted arm's field name and carrier from its field. Two things the record
does not state are added by the generator, under a doc comment that names them
where they are applied. First, the admitted arm gains
`encoded: ReadonlyArray<bigint>`: the model SEPARATES admission from framing —
`AdmitResult` carries the `Act`, and an act's encoding lives in the corpus's own
`encoding` group — while the runtime door computes both in one pass and returns
them together. Second, the refused arm flattens `KernelRefusalRow` and the
discriminant is spelled `verdict` rather than `_tag`, because that is what the
door already published. The row comes from `KernelTables.generated.ts` and
deliberately not from this file's `KernelRefusalValue`: the two disagree on
applicability, which the tables spell at the wire (`machine-applicable`) and the
schemas spell in camel. This is the `KernelRef` precedent exactly — reviewed
generator code that admits in a doc comment what the model spells differently,
rather than a hand-written twin standing beside the corpus.

**The SDK's `Verdict` was the ungrounded-generated finding, and is now
grounded.** Three literal `line(...)` calls rendered its two arms with no type
record behind them, so a model that renamed an arm would have left a generated
file asserting the old name. The arm names and the refused arm's payload now
come from the record, and the generator refuses a record whose shape moved. The
admitted arm does NOT gain `act`: this surface's types are the CANDIDATE side,
what a caller builds and hands over, and a minted sentence is not something a
caller can spell — there is no `Act` carrier here and this round does not add
one. What the SDK returns for it is that sentence's canonical framing,
`encoded`, which is what a caller can actually check. The generator asserts the
field it is projecting is still `Act`, so the projection cannot go on quietly
standing for something else. The rendering reproduced the committed bytes
exactly, so no test moved and `KernelSdk.test.ts` needed no reconciliation.

**Three conversions.** `KernelVerdict`, `KernelDoor` and `KernelAdmit` leave
`KernelDoor.ts` as declarations and return as
`export type { ... } from "./KernelSchemas.generated.js"` — the only shape the
type-universe walk counts as derived. `KernelDoorInterface` is renamed on the
way through because the generated module already binds `KernelDoor` to the Door
record's schema; the name a host reads is unchanged. The runtime `admit` and
`make` implementations stay exactly where they were, annotated now against the
re-exported types, which the file also imports locally — a bare re-export binds
nothing in the module's own scope. Ledger movement: 182 public types classified,
derived 40 → 43, debt 142 → 139, and the kernel ratchet pin fell 12 → 9 under
`--write`. No pin rose.

Alternatives priced: re-export the SDK's `Verdict` across from the door rather
than rendering it (refused — the carriers differ on both sides of the sum, since
the SDK's `Refusal` is its own declaration and its integers ride its own digest
carrier, so the re-export would have dragged the schemas module's carrier set
into a surface built to be free of it); leave the SDK hard-coding in place
(refused — it is precisely the ungrounded-generated defect this series exists to
remove, and a generated file that no record grounds is worse than a hand-written
one, because its provenance header claims otherwise); expand the schemas
generator to render `World` as a parameterized schema factory (refused — see
above, an uncommissioned surface design); render the refused arm structurally
from this file's own `Refusal` and `Applicability` schemas to avoid the
cross-module import (refused — the applicability spellings differ, so the
conversion would have silently changed the type the door publishes, which is the
one thing a spelling-neutral conversion must not do).

**Load-bearing? yes** — it is the record of why `World` is declared but
unprojected, and of which two expansions in the generated verdict are the
generator's rather than the model's.

### T27. Task DEV-852 slice C1 (DEV-824) — the builder control's trace was a recording of a compiler nobody named

Decided: the compiler pin is enforced, the stale arm is re-recorded, and the
byte comparison stays total. The ticket offered the fork as "normalize the
trace or enforce the toolchain pin", and the executed evidence decided it
before the argument did.

What actually reds: `check:kernel-builder` was green (byte-identical
regeneration); `check:builder-control` failed on its fourth arm alone, the
cross-sort handle, and on nothing but the order of eight union members inside
one diagnostic — the same eight sorts, `{join, declare, resolve, emit, fold,
decide, trigger, spawn}`, printed as a different sequence. The other three
arms were byte-identical. So the divergence was one line of one trace.

The cause is not host drift, which is what the ticket's framing assumed. The
traces were recorded at `c2b471c` when the root manifest pinned
`typescript: "^5.9.2"`; the pin is now the exact `typescript: "7.0.2"` with
`@effect/tsgo: "0.36.5"` patched over it, and that is a different compiler —
the Go-native port, not the JS one. Three orders for one unchanged type, all
executed on this host:

- committed (5.9.2): `"join" | "declare" | "resolve" | "emit" | "fold" | "decide" | "trigger" | "spawn"`
- 5.9.3 (`typescript-five`, still installed): `"join" | "emit" | "declare" | "resolve" | "fold" | "decide" | "trigger" | "spawn"`
- pinned 7.0.2: `"decide" | "declare" | "emit" | "fold" | "join" | "resolve" | "spawn" | "trigger"`

That middle line is the one that settles the fork. 5.9.3 is a PATCH bump inside
the very range `^5.9.2` the trace was recorded under, and it already prints a
different order: 5.x printed a union in whatever sequence the checker happened
to instantiate it, so under the old floating range the trace was unstable by
construction and its greenness was luck. The pinned 7.0.2 prints the members
sorted — a canonical form, stable across runs (executed six times, identical)
and across hosts on the same lockfile.

Fork (a), normalize the trace — priced and refused. It is cheap and it is not
unfalsifiable: sorting is a canonical form, so an added or removed member still
moves the sorted sequence, and the mutation arm would still red. Three things
refuse it anyway. It buys nothing the pin does not already buy, because the
pinned compiler ALREADY prints sorted — the normalizer would be a no-op the day
it lands, dead machinery justified by a compiler no longer in the tree. It
weakens the one thing a trace control has: the recorded diagnostic text is the
claim, named in full, and a comparison that rewrites the text before checking it
grades the compiler's answer against a paraphrase of its own. And it goes a step
past the DEV-797 precedent it would cite. That precedent normalizes WHICH
diagnostics are in the contract (errors, never advisories); it does not touch
the words inside one. Sorting members inside a printed type is a different act,
and accepting it is accepting the next one.

Fork (b), enforce the pin — taken. `scripts/negative-trace.ts` gains
`compilerPin`, which reads `typescript` and `@effect/tsgo` from the repository
manifest — read, never hard-coded, so the guard cannot drift from the version
the lockfile installs — runs `tsc --version`, and refuses by name before any arm
executes. A host on another compiler is now told which compiler it is on and to
run `bun install`, instead of being shown four moved traces it cannot act on.
The trace is stable by construction and the comparison stays total. Cost: the
control refuses rather than reds when the pin moves deliberately, which is one
extra step — `bun run generate:builder-control`, added for symmetry with the
door and SDK controls — on any intentional toolchain bump. That is the intended
price: a toolchain bump SHOULD be a deliberate re-recording act.

Carried with it: this control was the last one still holding a private copy of
the trace rule. The address, rung, and public-effect controls all read
`errorDiagnostics` from `negative-trace.ts` and the address control's own header
says it copied its shape from this one — while this one still compared raw
compiler output, so an advisory about unrelated `src/` could have reddened it at
any time (the DEV-797 failure mode exactly, latent here). It now reads the rule
from the same place. The adoption is byte-neutral, and that was checked rather
than assumed: re-recording all four arms under the shared rule rewrote three of
them byte-identical, and the only line in the diff is the union order.

Falsifiability, executed, not asserted. `KERNEL_GENERATORS` had `"trigger"`
removed — a real member removal, the ticket's named mutation — and the control
failed with exit 1 on a moved trace; the mutation was reverted and the control
returned to exit 0. The pin guard was proved the same way: the manifest pin was
moved to `7.0.3`, the control printed `REFUSED - the compiler is not the pinned
one` naming both versions, and the manifest was reverted.

Where they run: the ticket asked where, and the answer is the battery, because
the DEV-799 finding that these were unreached by `bun run gates` is what let the
red stand for a day. `gates` runs `test:packages`, which runs plait's `test`,
which chains `test:fast` and `test:types`. `check:kernel-builder` is
toolchain-free — it regenerates from the corpus and diffs, spawning no
compiler — so it joins `test:fast` beside the other generated-surface walls.
`check:builder-control` spawns `tsc`, so it joins `test:types` beside the other
compile-time controls, next to `check:address-control`, which is its own
descendant. Neither can silently rot again.

Not done, and named: the other three `tsc` controls (address, rung,
public-effects) still run on whatever compiler the host offers. `compilerPin`
lives in the shared module rather than in this script precisely so they can
adopt it without a second copy, but adopting them is outside this ticket's
"the control's comparison discipline only" limit.

**Load-bearing? yes** — it is the record that a committed compiler trace is a
recording of ONE named compiler, and the standing reason the estate does not
normalize the text inside a diagnostic it commits to.

### T28. Task DEV-852 slice C2 — the builder surface flips to the Lean emission, and its interpretive load becomes reviewed data

Decided: `KernelBuilder.generated.ts` is projected by `verify/unity`'s
TypeScript emitter, the bun renderer that used to write it is deleted in this
same commit, and the runtime battery holds the surface through the digest
register rather than through a second generator. This is U9's flip discipline
applied to the third surface: retire the renderer in the commit that flips the
gate, or the wall compares a generator with itself.

**The parity evidence.** `lake exe ts --target=kernel-builder` twice; the two
emissions agree; and the emission equals the committed surface byte for byte
over **19,521 bytes / 520 lines — an empty diff, at the first attempt, with no
divergence class met and no iteration spent.** The emitted bytes hash to
`3f79603043cca553bc056ff01884f10a7ab24a6be2afff850899ba9cb143004b`, which is
the digest the DEV-812 measurement artifact recorded for the committed file
before any of this was written, so the two sides agree against a number neither
of them computed for the occasion. The committed target was never edited toward
the generator.

**What the corpus answers, and what it does not.** The eight generators, their
field names, their field order, and each field's own model type reference are
read out of the `Act` record. Four things are not in the corpus, and each is
carried as a reviewed Lean table with a docstring saying so, on the
`JsonSchemaManifest` J1/J2 precedent rather than smuggled in as if the model had
said it: `fieldForm`, the one judgement — how a model type reference becomes an
accepted argument shape, total over what `Act` uses and refusing anything else;
`argumentGrammar`, the three reference forms, which are the freeze's and not the
corpus's, stated once as tree; `handleBrandKey`, the property a handle's brand
rides on; and two authored sentences — what calling a `$` constructor does, and
the two paragraphs about the reference helpers and `Holes`. The model's own
`Act` docstring rides through as its own rows rather than being re-wrapped: it
is prose the model wrote at a width the model chose.

**The grammar had to be reopened, and U6 is the reason that is worth saying.**
U6 sized `TsType`/`TsExpr`/`TsStmt` to all four surfaces so the next slice would
not reopen them, and on node KINDS it succeeded — every construct the builder
needs was already carried. What the census did not size was LAYOUT. Five
constructs the builder writes broken had no broken rendering: an interface whose
members carry their own doc comments and stand a blank line apart, an interface
whose type parameters break one per line, a member whose function type breaks
its binders, a type alias whose union is written one member per line behind a
leading bar, and a `satisfies` whose mapped type breaks. So `Layout` reached
`.union`, `.mapped` and `.function`, `Member` gained a `doc`, `.interfaceDecl`
gained a parameter layout and a spacing flag, and `brokenType` states — as an
`Option`, so a type with no broken rendering says so instead of acquiring one —
which two types the target breaks. The rule the reopening did NOT break is the
one that mattered: no raw-text escape hatch was added. `TsType.keyword` would
have rendered any of these in one line as a string, and using it that way is
exactly how a target grammar stops being a grammar.

Alternatives priced: normalize the layout inside the printer with a width budget
(refused — U5, and it would have agreed with these bytes by coincidence);
render the five broken forms through `.keyword` as raw text (refused — see
above, and the grammar's own docstring forbids it by name); leave the builder
on the bun renderer and wall the two against each other (refused — that is U9's
named defect, two generators for one surface).

**The self-test probe that this flip would have silently retired.**
`check-kernel-surfaces.ts` proved its "unplaceable target" clause by rewriting a
register row to `"kernel-builder"` — a target the check could not place BECAUSE
THE BUILDER HAD NOT FLIPPED YET. Enrolling the builder in `SURFACE_PATHS` would
have turned that probe into a self-comparison accepting its own unmutated input,
which is the identical failure the digest-flip probe already carries a guard and
a comment against. The probe now names `no-such-surface`: a probe keyed to "not
yet a target" expires, one keyed to a name the register cannot mint does not.

**Where the wall now lives.** `scripts/kernel-builder.ts`,
`scripts/generate-kernel-builder.ts` and `scripts/check-kernel-builder.ts` are
deleted, with `check:kernel-builder` and `generate:kernel-builder`. This is the
addendum T27 asked for: C1 put `check:kernel-builder` into `test:fast` so the
builder wall could not rot unwatched, and one commit later the wall changed
shape rather than went away. The surface is now covered by
`check:kernel-surfaces`, which was already in `test:fast` and now holds three
surfaces instead of two, and `check:builder-control` stays in `test:types`
exactly where C1 put it. Both walls are still in the battery; neither is a
second name for the other. `verify/unity/run.sh` gains the third
`check_surface` arm, the builder's digest under the host oracle, and a printer
mutation arm — `field-form-rule` — that moves the surface by changing the
reviewed reference rule and restores it byte-identically, so the one judgement
in the generator is shown load-bearing rather than merely present.

**The em-dash clause needed a per-surface count.** The gate asserted exactly two
em dashes on every surface. The builder carries one — its plane header, and
nothing else — because the second occurrence on the other two is a drafted
meaning about an incarnation mismatch that this surface does not project. One
expected count for three surfaces would have had to be wrong for one of them, so
the count is now pinned per surface and measured.

**Finding, not fixed here: the header still names a command that no longer
exists.** The surface's header carries `Corpus:` as a path, `Command: bun run
generate:kernel-builder`, and `Source:` as a path, and `KERNEL_BUILDER_PROVENANCE`
carries the same three as data. That is U8's filed law-10 residual, and U8
pre-approved the clean header landing at this slice. It did NOT land, and the
reason is the parity wall: cleaning the header moves the bytes, and moving the
bytes in the same commit that flips the generator would have left the flip with
no verifiable parity evidence — the one thing that proves the new generator is
faithful rather than merely plausible. The generator carries the three strings
as reviewed constants documented as the residual they are, so the follow-up is a
three-line change to `builderCorpusPath`, `builderCommand` and `builderHeader`
plus a re-emission. Until it lands, that `Command:` line names a script this
commit deleted, and a reader who runs it gets nothing.

**Load-bearing? yes** — it is the record of which four things in the builder are
reviewed judgement rather than model emission, of why the grammar's layout had
to be reopened when its node census did not, and of the one probe whose meaning
this flip consumed.

## Task: the substrate-session fact and the incarnation fence (estate-daemon S1, and S5's fence groundwork, 2026-08-19)

Placeholders `T25`–`T29` continue the series; repository D-numbers are
assigned at merge. The specification is the estate-daemon spec (COMMISSIONED,
operator ruling 2026-08-19) and its parent measurement record, the
substrate-session-plane record. Two open pins named in that specification stay
the operator's and are NOT resolved here: whether the per-connection exchange
key belongs in the fold, and what the connect option values should be pinned
to. Every decision below is a drafting decision made so that either ruling
later moves one declared list and no code.

### T25. The exchange key is out of the fold, and its exclusion is one row

Decided: the group-1 field roster in `src/internal/substrate.ts` carries the
fifteen fields the parent record measured on a live connection and does NOT
carry the per-connection exchange key. The record lists the key because it was
measured and says in as many words that its membership is a grill question
rather than a drafting one, so the slice lands with it excluded and the
exclusion is a row of a declared table rather than a shape of the code: the
fold walks the roster and selects nothing by hand, so ruling the key in adds
one entry and moves no branch. The wall executes the exclusion rather than
asserting it — a connection carrying an exchange key and a connection stripped
of one name the same session.

The roster also records, per field, whether the pinned client's own
server-information type declares it or whether the substrate sends it on the
wire without that type carrying it. Two of the fifteen are in the second class
— the connect-info flag and the remote account — which is a real finding: the
transcription target is a strict SUBSET of the field set the record measured,
so a transcription narrowed to the type would have silently dropped two fields
the record calls part of the substrate's declaration. Provenance is carried per
row so the narrowing is visible rather than absorbed. Alternatives: transcribe
only the pinned type's fields (drops what the substrate actually declared, and
those fields are named explicitly in the slice's own contract); transcribe
whatever the wire carries by iterating the received object (the fold's key set
would then depend on what one server happened to send, and two mints against
different builds would name different sessions). **Load-bearing? yes** — the
roster IS the fold, and the open pin's whole cheapness is that it moves one row
of it.

### T26. Group 3 is minimal by declaration, and its bound is stated in the value

Decided: the estate's group carries exactly three fields — the writ digest the
connection acts under, which service layer opened it, and the asserted-shape
set — because the parent record calls this group a sketch and names those
three. At the running posture the spine fills the writ with `null` and the
shape set with the empty set, and both are HONEST rather than placeholders: the
spine acquires connections below the plane that judges writs, so there is no
writ to name, and every carrier asserts its shapes after the connection
resolves, so the set at open is empty. That is precisely the ambiguity the
field exists to close — an empty asserted-shape set is now empty by declaration
instead of empty by omission, and re-assertion after a reconnect has a declared
target to compare against. The set is sorted and deduplicated inside the
constructor, so two parties asserting the same shapes in different orders fold
to the same bytes.

Stated bound, because it bites the claim: this slice does not make group 3
carry a writ. A session fact is connection-attributed mechanics and not an
evidentiary "who", and with the writ null it is not even that — it is the
service layer's own name, which any process could claim. Alternatives: omitting
the fields until they can be filled (the omission is what made the empty memo
ambiguous in the first place); reaching up for a writ from the transport spine
(a deeper plane reading a shallower one's judgment, which the layering law
refuses and which would make the fold depend on what was convenient to have at
hand). **Load-bearing? yes** — the empty set's honesty is the field's entire
purpose.

### T27. The predecessor rides the fact, never the fold

Decided: the session's NAME is the digest of the three groups alone; the
predecessor session is a field of the session-established fact that lands on
the lane. The reason is derivability, which is the property the whole
construction exists for: a party holding the same three groups must compute the
same digest with zero I/O, and a predecessor is not one of the three groups — a
party that never saw the connection could not supply it. Folding it in would
make the name uncomputable by exactly the parties the name is for, and would
make the client-minted and owner-minted bytes differ whenever the two disagreed
about history. A reconnect still mints a new session, because the connection
identifier the substrate assigns has moved, and the prior fact is never edited:
nothing on the mint path reads or writes a fact at all. Alternatives:
predecessor inside the folded value (breaks derivability, as above); a separate
successor fact linking two sessions (a second fact kind carrying one field, and
a chain that breaks by dropping a message rather than by editing one).
**Load-bearing? yes** — it is the difference between a name and a log line.

### T28. The declared connect options are the connect's source, not its description

Decided: every connect option the estate runs under is named in one declared
table, with the four the spine sets taking the caller's values and every other
row taking the pinned client's own value, transcribed. The arguments handed to
the client are then PROJECTED back out of that declaration rather than built
beside it, so "the session fact pins the options the connection ran under" is a
construction and not a comment — there is one value, read twice. No transcribed
default is passed: passing one would convert a transcription mistake into a
silent change to what the estate runs under, and the wall asserts that the
argument object's key set is exactly the estate-set rows. This slice changes no
option value; the value pins stay the operator's, and changing one afterwards
is a one-field edit to a declared value.

The table separates two kinds of inherited value, because they are not the same
fact: a row the pinned client's default table carries, and a row it carries
nowhere and reads as absent at its point of use. Four options are in the second
class, and they are exactly the ones nobody could have read without opening the
client's source. Alternatives: declaring only the four options the spine sets
(leaves the defaults undeclared, which is the omission the ruling retires);
passing the transcribed defaults through to the client (turns a declaration
into a runtime change, and the transcription is not the authority on the
client's behaviour). **Load-bearing? yes** — it is the declared-data half of
the standing connect-options requirement.

### T29. The incarnation register is keyed by the chain position, not by the store alone

Decided: the register key a decide competes at is the digest of the round — the
store-directory digest together with the incarnation being succeeded — rather
than the store-directory digest alone. The reason is the register's own law: an
outcome, once landed, never changes. A key that is the store digest alone
therefore admits exactly one landed incarnation for the life of the store,
which is right for one round and wrong for a store directory that outlives many
server runs; succession would be unsayable without destroying and recreating
the backing bucket, which is precisely the lifecycle mutation the incarnation
pin exists to refuse. With the round as the key, at most one incarnation lands
per chain position, which is at most one incarnation current per store
directory, which is the property the store needs. The store digest remains the
key's only free coordinate at any one position.

The fence is built ON the register and does not extend it: grant then commit,
with the granted token carried between them, and no path through the decide
starts a server — starting one is the winner's act afterwards. The register's
incarnation pin is what makes this fence trustworthy at all, and it is
consumed, not re-derived.

Alternatives, both refused on the register's own semantics: key by the store
digest alone (one incarnation ever, or bucket lifecycle mutation, and the
second is the pin's refused case); re-open a landed round with expire-steal
(the steal takes a lease, and an outcome once landed never changes, so it
cannot re-open what has landed).

Stated bounds. The race arm is executed against a fixture carrier with a
scheduling window between every read and write, with a committed refutation —
the same fence minus its token comparison lands two incarnations — so the arm
is falsifiable. It is not the out-of-process race the specification's later
slice describes, and it certifies only its own bounds. The chain walk is total
and acyclic over seeded histories and refuses on a planted cycle; nothing is
claimed about chains this package did not build. Crash is not forged: nothing
here retires an incarnation on another's behalf, and a round nobody decided
reads as absence, never as a running server. **Load-bearing? yes** — the key
choice is what makes the fence expressible on the register the estate already
has.

## Task: the roster expands and the writs open (estate-daemon S1 follow-up, operator ruling 2026-08-19)

Placeholders `T30`–`T32` continue the series; repository D-numbers are
assigned at merge. The commission is the operator's follow-up ruling in
session 2026-08-19 — *authorized to update estate facts to allow for digest to
expand, open writs* — and it resolves the first of the two pins `T25`–`T29`
were drafted around. The second, what the connect option values should be
pinned to, stays the operator's and is untouched here.

### T30. The roster is add-only, and its digest rides the value it governs

Decided: the group-1 field roster expands by APPENDING one row with its
provenance, and the roster is itself a declared value whose digest is folded
into the substrate declaration and carried on the session-established fact. Two
parties on the same roster still fold byte-identical declarations; a party on a
grown roster names a different session, and the difference is READABLE rather
than merely present — each fact says which roster its holder folded, so the two
resolve the rosters and see the appended row instead of discovering only that
two digests disagree.

The add-only half is walled, not asked for: the wall pins the roster as it
stood before this expansion and asserts it is a PREFIX of the standing one, so
an append passes and a rename, reorder, retype, or removal reddens. That
discipline is not tidiness. The roster digest is folded, so a rewrite in place
would silently rename every session ever folded under the old roster, while an
append renames them visibly.

Alternatives, priced. A schema version integer on the fact: cheaper to write and
strictly worse, because a version is a word this package would have to keep
true by hand — two different rosters can carry the same number, and the number
says nothing about what differs. Nothing at all, resting on the fact that the
folded key set already changes when a row is added: true, and it is why the
derivability wall held before this slice, but a key-set difference is
indistinguishable from a substrate that sent different fields, and neither party
can name which roster the other held. A full roster value inside the fold rather
than its digest: self-describing without a resolve, at the cost of putting
sixteen rows of transcription into every session's bytes and making the fold's
size grow with the roster; the digest buys the same property at one field, and
resolving it is the estate's ordinary act. **Load-bearing? yes** — the digest is
the whole difference between "we disagree" and "you are on the roster with the
exchange key and I am not".

### T31. The exchange key joins the roster; T25's exclusion is superseded, not rewritten

Decided: `xkey` is the sixteenth row of the group-1 roster, `measured`, because
`@nats-io/nats-core@3.4.0`'s own server-information type does not carry it —
the same class as the connect-info flag and the remote account. T25 recorded the
key as excluded and said in as many words that its membership was an open pin
held by the operator rather than a drafting question. The operator ruled in
session 2026-08-19; this section records the supersession and T25 stands as
written, because what T25 decided was correct at the posture it was decided at
and rewriting it would erase the evidence that the exclusion was cheap to
reverse.

It was cheap to reverse, and that is the claim T25 made and this section
discharges: ruling the key in moved one row of one declared list and no branch
of any function. The wall that asserted the key was out INVERTED rather than
being deleted — a connection carrying an exchange key and a connection stripped
of one named one session before and name two now, and both parties are shown to
be on the same roster, so the disagreement is about what the substrate declared
and says so. Alternatives: leaving the key out and folding it into a separate
observation value (a second value to carry and reconcile, for a field that is
part of the substrate's own declaration); folding it but suppressing it when
absent (an optional key in the fold, which is the presence ambiguity the
always-all-keys rule exists to refuse). **Load-bearing? yes** — it is the
expansion discipline's first exercise, and an expansion mechanism never exercised
is a claim, not a construction.

### T32. The substrate writ declares roles and families, and declares nothing else

Decided: a substrate connection acts under a declared writ — one canonical
value carrying the layer it is declared for, the carrier roles that layer acts
as in the permission projection's own vocabulary, and the subject FAMILIES those
roles are granted, with each deployment coordinate written as its own
brace-wrapped name. Its digest is its name, group 3 carries that digest, and
resolving the digest returns the exact bytes. The table is keyed by the layer's
own name and not by the caller's connection nickname: renaming a connection
renames a connection, it does not change what the layer may do, so the session
fact carries both — the nickname in `layer`, the authority in `writ`.

Three bounds, each stated because each bites.

**No enforcement is built, and none is implied.** Enforcement at the substrate
is the substrate's: the account ACLs the carrier-permission projection derives
are what refuses a publish, and the daemon that owns the credentials provisions
them. A writ disagreeing with those ACLs is a WRONG DECLARATION that changes no
runtime behaviour — the same failure posture T28 chose for the connect options,
and the one to prefer, because the other posture changes what the estate may do
by editing a table. It is also why an undeclared layer folds `null` at the spine
instead of refusing the connection: a declaration that can take down a
connection is enforcement by the back door at the one seam where this package
says it builds none. The lookup still refuses, so "no writ is declared" and "the
least writ is declared" stay two different facts, and the fence against a spine
acquire site drifting into the first is a wall that WALKS the acquire sites out
of `src/` — a ninth site joins the wall by construction.

**The content is the permission projection's, gated rather than imported.**
Every family is exactly what `internal/permissions.ts` grants the named roles,
read out of that projection under a scope whose free coordinates are their own
names. The projection is not imported: it sits at the carriage seam, the writ
sits at truth, and a truth module importing carriage is the one edge the
layering law refuses. The wall derives the same rows from the projection and
compares them, so the two cannot drift undetected; what is lost against a direct
import is that the drift is caught by the battery rather than by the type
checker, and that is stated rather than absorbed. The alternative that would
restore the import — inverting the dependency so the projection interpolates a
scope into families declared at truth — is a rewrite of a security module's
projection for a property the wall already holds, and it is refused on blast
radius rather than on taste.

**Two of the eight layers hold the LEAST writ, and that is a finding.** The
projection declares roles for the estate's publishing and key-value carriers
only; it declares none for a consuming connection, none for the chaos harness,
and none for the CLI's head probe. Those two layers therefore declare no role
and no family — the same shape as the read plane's empty writ, and honest: the
estate has declared no substrate authority for them. It is not a claim that they
reach nothing, and the writs of the six layers that do carry roles under-declare
their consuming half for the same reason. Inventing a role to cover the gap
would put a word in the security projection's mouth that the projection never
said.

Alternatives, priced. Roles alone with no families: genuinely minimal and it
keeps one authority with no gate at all, but a reader then needs the projection
AND a deployment scope in hand to learn what the connection may address, and the
writ stops being self-describing — which is the property that makes a digest
worth resolving. Fully-scoped subjects rather than families: the spine has no
deployment coordinates at acquire time, so every one of them would have been
invented. A writ per role rather than per layer: the acquire site is a layer, not
a role, and a layer acting as two roles would then need two writs and a rule for
combining them. **Load-bearing? yes** — group 3's writ field existed and named
nothing; it now names a value, and the difference between those two states is
the whole of what "open writs" asked for.

---

## Task: the status pump as a fact source, over the transcribed event vocabulary (estate-daemon S2, 2026-08-19)

Placeholders `T33`–`T38` continue the series; repository D-numbers are assigned
at merge. The commission is the estate-daemon slice plan's second vertical
slice, cut under the daemon commission's ruling R-3 — *the protocol is the wire
vocabulary, by transcription* — and rider (b), full adoption of the vendor's
lifecycle events. The session-fact schema this slice builds against is the
LANDED one, roster digest and writ digest included, not the commissioning body's
prose.

### T33. The vocabulary is a transcribed table with per-row provenance, and the machine is a second table over it

Decided: the eleven status event types the pinned client declares are
transcribed into one declared value in the pin's own declaration order, with the
vendor's own event name, the vendor's own payload field names, a sort per field,
and the vendor's own type-alias name as that row's provenance. A second declared
value places seven of the eleven as state transitions, carrying per row the
state entered, the admissible predecessors, whether the row mints a successor,
which fact form it emits, and whether the state is absorbing. Both tables are
data. The event-name type and the state type are PROJECTIONS of those tables,
derived from them, so a row appended tomorrow widens both by construction.

The refused alternative is the hand-written union — a `type ConnectionState =
"connected" | "disconnected" | ...` beside a switch statement over eleven cases.
It is refused for a mechanical reason and not a stylistic one: the parity ticket
in this same stage byte-compares the two language sides' tables against one
another and against the pinned source, and a table that exists only as inline
branches has nothing to compare. The gate this slice ships makes the refusal
executable rather than asserted — it plants the union and requires the refusal.

**The state before any transition is `null`, not a word.** The pin declares no
event meaning "attached for the first time", so naming that condition would have
been the invention R-3 forbids. Every state is named by the transition that
enters it, and the absence of one is spelled as an absence. The cost is that a
reader sees `null` where they expected a name; the payoff is that every word in
the machine is the substrate's own, checkably.

**Sorts are this transcription's vocabulary and events are the vendor's, and the
two share no word.** The client's error payload is transcribed at the sort
`error-object` rather than `error`, because the vendor also declares an event
named `error` and a consumer branching on the sort would then be
indistinguishable from a consumer branching on the event — which is exactly what
the gate's fifth clause refuses. The collision was found by that clause going
red on the first honest spelling. **Load-bearing? yes.**

### T34. Readings within a state are observations, and the split is walled rather than asserted

Decided: four of the eleven rows — the cluster-list update, the protocol error,
the client ping, the slow consumer — are placed as READINGS. They emit
observation facts citing the session and the state they were read within, they
move the machine nowhere, and no row of the machine names one as a state. The
gate holds all three: no reading appears as a state, no reading has a machine
row at all, and every machine state is a transcribed transition's own name.

Modelling them as states would have been the invention the composition rule
warns about, and it is a live temptation: three of the four read like conditions
a connection could be *in*. The wall is what keeps the temptation from being
resolved by taste. Its plant promotes a reading to a state and requires the
refusal; the runtime half of the claim is a real slow-consumer condition induced
on a real connection, landing as an observation with the state it was read
within, next to zero transition facts.

The commissioned second reading — the client's own ping — is NOT induced against
a live server. The client emits one on its declared ping interval, that interval
is a declared connect option, and this slice may not move a declared value to
make an arm convenient. The ping row is exercised over a constructed status
value of the pin's own shape instead, and the gap is named here rather than
papered over. **Load-bearing? yes.**

### T35. The pump attaches where connections are established, and its exposure is a hand-off rather than a landing

Decided: the one consumer of a connection's status source is built inside
`establishConnection`, which also mints the session that consumer cites. There
is no other place a connection comes into existence, so "one pump per
connection" is a property of the tree rather than a rule someone has to
remember. Facts leave through a bounded queue that a lane-holder takes from and
lands through the session lane's one emit.

The landing regress the predecessor slice recorded is unchanged and was not
worked around: the lane service opens a connection whose establishment is itself
a session, so a spine that landed its own facts would open a connection to
record that it had opened a connection. The pump therefore mints and exposes;
it holds no lane, imports no lane module, and has no second landing path to
build. Backpressure is real rather than lossy — a holder that stops taking stops
the pump, and the client's own status iterator buffers behind it — because
dropping the record of what happened to a connection is the one outcome this
slice exists to prevent.

**A finalizer closes the connection before the consumer is interrupted, and that
is load-bearing rather than tidy.** The pin's status source is a generator parked
on a signal that only the connection's own teardown resolves, so a scope that
interrupted the consumer first waited forever on an iterator nothing was going
to wake. Two wall arms hung for two minutes each before the ordering was
corrected. **Load-bearing? yes.**

### T36. The commissioning record's single-consumption premise is false at the pin, and the fence stands for the other reason

Decided: the fence against a second consumer of one connection's status source
stays, and its stated reason is corrected. The commission ruled that "the pinned
client's status source is not a broadcast: consuming it twice splits events
between consumers and silently loses facts". Measured at the pin, it is the
opposite: each call to the source registers a fresh listener and the protocol
pushes every event to every listener. A second consumer therefore loses nothing
and DOUBLES everything — every transition minted twice, and a second successor
chain running against one connection.

Both halves are executed rather than argued. One arm reads the client's own
dispatch out of the installed bytes; another runs two consumers over one event
sequence and shows the facts duplicated exactly. The fence itself is a defect
and not a refusal: calling the spine twice on one connection is this package
calling itself wrong, and the transport spine's own two-sided rule is that a
defect never wears the absence sort — a retryable absence over a bug is what
that rule exists to prevent.

The alternative was to build against the commission's premise and wall
"consuming it twice loses facts", which would have been a wall that passes over
a falsehood. **Load-bearing? yes** — the reported reason is what a later reader
uses to decide whether the fence may be relaxed.

### T37. The session lane's event form grows add-only, and teardown keeps its own variant

Decided: the transition and observation variants are APPENDED to the declared
event form, leaving the established and ended variants in place and in order.
The form's digest is the lane's route, so an append moves the route visibly
while a rewrite in place would move it silently — the same discipline the field
roster carries, for the same reason.

The terminal transition does NOT emit a transition fact. It emits the
session-ended fact, because the record already has a form for "this connection
is over" and a second one would be a twin of it. That decision is what makes the
empty cause meaningful: the pin resolves its closed promise with an error when
the connection died of one and with nothing when it was taken down in order, so
an empty cause is the pin's own report rather than a missing field, and an
orderly drain and a hard kill stay distinguishable in the record instead of
being remembered. **Load-bearing? yes.**

### T38. The status vocabulary sits at the truth seam, and the session facts moved down with it

Decided: the fact vocabulary the establishment path mints — the declared event
form, the four schemas, the mints — moved into its own module at the truth seam,
and the lane module above it kept the declaration and the one emit. The pump
ranks at truth for the same reason: it reaches nothing on the state-carrier
plane.

This was forced rather than chosen. The spine reaches the session mint the
moment a connection resolves, before any lane exists; the lane module imports
the lane plane, which imports the lane adapter, which imports the spine. Leaving
the mints in the lane module would have closed that cycle through a module whose
top-level bindings are built at import time, and the first test file to import
the spine directly would have hit the dead binding rather than a stack trace
anyone could read. Splitting by seam rank rather than by resemblance is what the
layering law already asks for, and the split says so in both module headers.
**Load-bearing? yes.**

## Task: the daemon takes its first breath (estate-daemon S4, 2026-08-19)

Placeholders `T33`–`T37` continue the series; repository D-numbers are assigned
at merge. The specification is the estate-daemon spec's slice S4 and its
lifecycle contract, under the operator's daemon commission of 2026-08-19. The
code this slice lands is in the Go module rather than in this package, and the
entries live here because the daemon track's earlier entries do: a decision log
split across two files by which language happened to hold the code is a log
nobody reads whole. What lands in this package is one test-only process — the
far side of the differential — and nothing under `src/`.

Two pins the specification leaves open stay open and are NOT resolved here: the
values the connect and server options should be pinned to, and the schema for
the full declared option set. Both are named in the slice's own limits as a
later slice's, and this slice reads a declared value rather than defining what
one may say.

### T33. The daemon is a package in the Go module, beside the substrate rather than inside it

Decided: the daemon lands as a library package in the Go module with its wall
as a sibling command — the shape that module's existing walls already take. The
graduation map named that destination and nothing occupied it.

Alternatives, priced. Growing it inside the substrate-assumption package: that
directory is tests only and holds no shipped Go file at all, so promoting its
harness into it would have made an assumption gate own production lifecycle
code, and a red there would then mean either "an assumption moved" or "the
daemon broke". Growing it inside the journal package: the lanes are journal
lanes and the daemon uses them, but a lane package that also owns a server's
lifecycle is two seams at one name. Making it a command with no library: the
wall needs the package and so will the supervisor slice, and a command's
internals are reachable by nobody. **Load-bearing? no** — it is a placement
decision with a cheap reversal, recorded because the map named a destination
and the seat should say it went there.

The substrate harness's pattern is ADOPTED rather than rebuilt: options value →
construct → start on a goroutine → readiness gate → in-process connection →
teardown on release is exactly what that harness proves, and this package is
that pattern promoted from test-only scaffolding to owned code with the health
read added. The lanes are the journal package's, the canonical bytes are the
canonical package's, and the register package is untouched — the incarnation
register is the next slice's.

### T34. The Go fold is a transcription with a byte-compare wall, never a twin

Decided: the Go side restates the roster, the three groups, and the folded
value's shape from the TypeScript spine's fold, and the wall that makes the
restatement honest is a byte comparison across the language boundary rather
than two tables agreeing by inspection. The spine's fold is the REFERENCE: a
divergence the wall exposes is a defect on the Go side, and reconciling one by
moving the reference is refused on sight.

The Go side folds into the JSON domain — the maps and slices the canonicalizer
already speaks — rather than into Go structs with tags. Structs would have read
better and would have put a second encoder on the meaning path: the field order
would then be the struct's and the omission rule would be the tag's, and both
are exactly what RFC 8785 exists to take away from the author. Folding into the
domain the canonicalizer accepts means the bytes are the canonicalizer's
opinion and nobody else's.

Alternatives, priced. Generating the Go fold from the corpus: right, and not
available — the emitter has no substrate-vocabulary group yet, which is the
staged debt the reference itself wears. Sharing one implementation by having
the daemon call the TypeScript spine: that inverts the topology the commission
adopted, since lifecycle authority cannot cross into a client-only ecosystem.
Comparing digests only rather than bytes: cheaper to print and strictly weaker,
because a digest disagreement says two things differ and a byte disagreement
says which field. **Load-bearing? yes** — the transcription is the whole risk
this slice takes on, and the byte compare is the only thing that makes it
survivable.

### T35. Two group-one rows are not reachable from options and registration, and the bound is stated rather than papered over

Decided: the daemon's options-and-registration carriage takes two inputs that
phrase does not name, both measured rather than assumed, and the differential's
residual says so.

The first is the server's public exchange key. The pinned vendor generates it
at construction from a fresh keypair, so it is a function of neither the
options value nor any registration, and the vendor exports NO accessor for it —
the server identifier is exported, the exchange key is not. The only surface
carrying it is the protocol greeting the server writes. The daemon therefore
reads its incarnation identity once, from one greeting taken at acquire time
before any served connection exists, and cites it thereafter. The cost is real
and is the differential's residual: of sixteen group-one rows, fourteen are
folded from the options value and the registration alone, one comes from an
exported accessor, and the exchange key's two carriages share a source and so
cannot disagree.

The second is the pair of rows the roster already calls MEASURED — the
connect-info flag and the bound account. The pinned server writes a SECOND
greeting after the connect exchange to any client registered at a protocol that
understands one, and only that second greeting carries them; a connection's
current declaration is therefore the later greeting, not the opening one. Two
consequences were taken. The daemon's greeting capture keeps the LATER greeting
rather than the first, because the reference folds the declaration a connection
currently holds. And the options-and-registration carriage declares the flag
true and reads the bound account from the registration, falling back to the
server's own global account name when the registration omits it — which the
registration does exactly when the account IS the global one.

The bound on that second decision, stated: the registration does not carry the
client's protocol, so the daemon cannot check that a given client was sent the
second greeting. Both pinned clients register at a protocol that is, and that
is measured by the differential itself rather than asserted — a client that did
not would fold a null against a true and redden the first arm on the spot.

A third measurement made the first arm honest and is recorded with them: the
server enqueues its reply to the connect exchange's round trip BEFORE that
second greeting, so a fold taken the instant establishment resolves can race
it. The daemon takes one further round trip before reading, which cannot race
because the greeting was enqueued ahead of that trip's own reply. The reference
takes no such trip, and whether its fold is exposed to the same race across a
socket read boundary is a question this slice raises and does not answer.

Alternatives, priced. Folding the opening greeting on both sides: symmetric,
and it would fold a declaration the connection no longer holds, so the wall
would prove agreement about a stale value. Dropping the two measured rows from
the roster: it would make this slice's arithmetic easy by shrinking the
reference's fold, which is moving the reference to make the transcription pass
— the one move refused above. Minting a system-account credential to read the
connection's protocol from the server's own event stream: outside the algebra,
an operator act with blast radius, and named as a stop-and-report in the
slice's limits. **Load-bearing? yes** — a differential whose residuals are not
stated is believed further than it was measured.

### T36. The daemon's own connect options under-declare, visibly, rather than transcribing a table nobody has walled

Decided: the daemon's client-zero connect-options declaration names exactly the
three options the daemon SETS, in the pinned Go client's own option vocabulary,
and names no default at all. The reference's declaration names every option its
own pinned client runs under because that client's defaults have been
transcribed with a wall behind them; the Go client's table has not been, and
transcribing it here would put values nobody has ruled into the estate through
a package with no wall for them. An absent row is honestly absent — it says the
estate has declared nothing about that option, which is true.

The declared server-options value takes the same stance from the other side: it
carries six keys, every one the pinned vendor's own spelling, and the vendor's
baseline fills the rest. Those filled values are READ BACK from the constructed
options rather than re-declared, for the reason the reference states about its
own defaults — a transcription passed as an argument turns a transcription
mistake into a silent change to what the estate runs under, while a
transcription that is only declared makes the declaration wrong and the runtime
unchanged.

Two option fields are set that the declared value does not carry, and they are
named rather than hidden: the vendor's logging and signal handling are
suppressed, because a library inside another process owns neither its process's
log nor its signals. Neither is configuration and both are the vendor's own
option names.

Alternatives, priced. Transcribing the Go client's defaults now: it is the
honest full declaration and it is a later slice's, and doing it here would
resolve a pin the specification names as the operator's. Declaring nothing for
group two at all: the group is what the process declares about itself, and a
connection that declares nothing has not declared that it declares nothing.
**Load-bearing? maybe** — the under-declaration is visible and cheap to grow,
but a reader who mistook it for a full declaration would mistake silence for a
measurement.

### T37. The differential is driven from the Go side, and the far side holds its connection open

Decided: the wall is a Go command that owns the daemon, executes the
one-language arm in process, spawns the TypeScript minter against the daemon's
client URL for the two-language arm, and compares. The far side writes one line
of evidence and then WAITS on its own input until the near side closes it,
because a registration is gone the moment its connection is and a wall that
read the registration after the far side exited would be comparing two
different connections.

The declared VALUES cross the boundary, not only their digests. The far side
sends its connect-options declaration and its estate declaration as values; the
near side canonicalizes them with its own canonicalizer and derives the digests
itself. Sending digests alone would have made the comparison one
implementation's opinion carried twice.

The negative control is its own battery stage rather than a second pass inside
the passing one, so a red line names which claim broke: the differential and
the proof that the differential can fail are different claims. The control
mutates exactly one field in exactly one group — the declared connect-options
digest, the cheapest single-field mutation available — and the stage passes
only when the comparison fails.

The ports-file retirement takes the battery's existing empty-output shape, and
its detector proves it can fire inside every run: an empty-output stage is the
shape most exposed to a scanner that quietly stopped matching, so the run scans
a planted sample first and reports a detector that does not fire on it. The
stock-binary harness whose readiness IS that poll is deliberately not walked —
both postures run side by side, and a suite that spawns a binary has no other
signal.

Alternatives, priced. Driving from the TypeScript side, as the register wall
does: that wall's Go process is a participant and its TypeScript side owns the
server, which is the opposite of this topology — here the Go process owns the
lifecycle by physics, so a TypeScript driver would have to spawn a Go process
that spawns a server and then ask it questions through a protocol invented for
the purpose. Running the far side as an ordinary test file: it would run twice
per battery, once in its own stage and once in the package's, and the second
run would prove nothing the first did not. **Load-bearing? yes** — the
direction is forced by which side can hold a server, and the held-open
connection is the difference between measuring one connection and measuring
two.

## Task: the run replay wall (the corpus's run group, operator commission 2026-08-19)

The interchange grew a `run` group carrying the model's own executions of the
committed program declarations. This side reads them and runs them, and the
decisions below are about what a replay can honestly claim.

### T33. The comparison is byte-equal on the outcome, and the outcome is label-free

Decided: `test/EngineReplay.test.ts` canonicalizes the outcome this engine
reaches and compares it byte-for-byte with the vector's own `bytes` field. What
it compares is the arm, the refusing node, the taught reason, the walked node
sequence, and per step the generator and the TAGS of the payload atoms.

Alternatives, priced. Compare encoded sentences: the model's identity labels are
small naturals it chose and this engine's are content addresses its hasher
computed, so the comparison fails for a reason that is not a defect — and
"relabel the encoding back" is not sound, because an encoding interleaves labels
with tags. Compare landed labels: the same problem one level down. Compare
nothing but the arm: passes on an engine that walks one node and stops.

Why the tags earn their place: they are the strongest label-free statement
available and they catch the defect this wall exists to catch. A consumed local
must reach the door as a `literal` and an unfilled hole as a `hole`, so a
dataflow substitution that silently stopped substituting moves a byte. The
executed control mutates exactly that, and two more besides. **Load-bearing?
yes** — it is the definition of what "replays byte-equal" means here, and
anything stronger would be a claim the two identity scales cannot support.

### T34. The payload comes off the verdict stream, not off a re-derivation

Decided: the wall reads each step's payload atoms from `engine.verdicts` — the
judgments the engine publishes as it issues them — rather than recomputing what
the completion should have produced from the declaration and the landings.

Why: recomputing it here would rebuild the engine's completion inside the test,
which is precisely the hand-built expectation the commission asked to retire.
The engine's step record carries the node and the ACT's encoding but not the
candidate, so the stream is the only place the engine itself says what it swept.
Alternatives: widen `RunStep` to carry the candidate (an engine change, and the
commission forbids engine semantic changes); accept a re-derivation (a wall that
agrees with itself). **Load-bearing? yes** — it is what keeps the payload column
the engine's answer rather than the test's.

### T35. The label map is built by declaring the vector's OWN door

Decided: for each referent the vector's `context` names, the wall declares one
real carrier through this engine — a lane for a lane, a cell for a resource, a
register for a program, a declared value otherwise — and the map from the
model's labels to this engine's falls out of those declarations.

The retired alternative is the one that was there: `test/Engine.test.ts` carries
hand-typed maps (`if (kind === "index" && id === 8n) return …`) beside hand-typed
supplies and hand-typed expectations. Those tests are KEPT — a hand-built wall
and a vector wall disagreeing is a finding, and deleting one of them deletes the
comparison — but nothing new is added to them.

Why: the map is now a function of the vector, so a vector naming a referent the
wall has never staged fails loudly instead of silently mapping it to itself.
**Load-bearing? yes** — it is the difference between running the corpus and
running a transcription of it.

### T36. A supply slot this wall cannot stage refuses; it is never skipped

Decided: `suppliesOf` translates `kind` and `token` directly, stages `strategy`
as a cell binding, and THROWS on any other slot.

`anchor` and `predicate` are real slots of the model's completion that no
committed program vector exercises, because no committed declaration applies
`fold` or `trigger`. Writing untested translations for them would ship code no
run has ever taken. Alternatives: translate them speculatively (untested code on
a wall's critical path); skip unknown slots (a vector whose supply nobody
translated then replays green by omission, which is the worst of the three).

Why: the loud refusal is the honest shape — the day the corpus grows a fold or
trigger vector, this wall fails and someone writes the translation with a run to
test it against. **Load-bearing? yes** — silence on an unknown supply is how a
conformance wall stops conforming.

### T37. `join`'s strategy is staged as a binding, and the mismatch is reported

Decided: the vector's `strategy` supply is not passed to `Engine.run`. It is
read, and the cell it names is DECLARED against that algebra, so the engine
fills the slot from its own binding exactly as it does in production.

This is the finding the commission asked to be reported rather than repaired.
`RunSupplies` names four members — kinds, anchors, tokens, predicates — and
`strategy` is not among them, because `Act.join` drops the strategy that
`CandidateAct.join` carries, so no declaration form and no field table read off
`Act` can name it. The engine therefore has a fifth completion provenance the
model's run form has no counterpart for: its own binding replica. Alternatives:
add a `strategies` member to `RunSupplies` (an engine surface change, forbidden
here, and a decision that belongs to the model first); drop the join node from
the landed vector (deletes the only four-generator end-to-end run).

Why: staging the binding replays what the engine actually does, and reporting
the gap is what the limits require. **Load-bearing? yes** — it is a named gap
between the model's run form and the runtime's, standing open on purpose.

### T38. The unspeakable arm is not byte-compared, and the divergence is named

Decided: for a vector whose outcome arm is `unspeakable`, the wall asserts that
`Engine.run` refuses structurally — in the error channel, before the door — and
checks the vector's account of WHERE against the corpus's own declaration: the
named slot really is absent from the named node's arguments. It does not compare
bytes.

The divergence, stated: the model's account carries the steps that stood before
the unspeakable node; this engine's completion refuses into the error channel,
which discards every step the run had already carried. So the two sides agree on
the arm, the node and the reason, and disagree about whether the prefix survives.
That is a real difference in what a failed completion reports, and it is written
down rather than smoothed over by dropping the steps from the vector.
Alternatives: drop the steps from the model's account (destroys the evidence
that node 1 landed before node 2 could not be spoken); make the engine return
the prefix (an engine semantic change, forbidden). **Load-bearing? yes** — the
wall's coverage is uneven across the three arms and a reader has to know where.

### T25. The incarnation register key is the round digest, ratified

Decided: the operator ratified in session (2026-08-19) the incarnation
fence's key discipline as landed — the register key is the digest of the
ROUND, the store directory together with the incarnation being succeeded
(`digest({store, predecessor})`), never the store alone. The reasoning the
module records stands ratified with it: a landed outcome never changes,
which is right for one round and wrong for a lifetime; a store-keyed
register that admitted one landing ever would make succession unsayable,
while the round key makes at-most-one-landing-per-round exactly
at-most-one-incarnation-current-per-store — the fence the store needs, in
the register's own at-most-once vocabulary with no new machinery.
**Load-bearing? yes** — it is the key law every successor slice of the
daemon epic builds on.
### T39. The reconnect pins become estate-set rows, and the transcribed defaults leave

Decided: `maxReconnectAttempts` and `reconnect` move from `client-default` to
`estate-set` in the connect-option table, take their values from one declared
pin (`-1` and `true`), are projected back out by `estateConnectArguments`, and
are handed to the pinned client on every connect. Both rows leave
`CONNECT_OPTION_DEFAULTS`, because a row the estate passes has no transcribed
default to carry, and two readings of one option is exactly the drift the
transcription discipline exists to refuse.

The declaration digest moves with them, so every session folded after this is a
different session — visibly, and with the option table resolvable from the fact
that pins it. That is the intended consequence rather than a cost: "we changed
the reconnect bound" is now a difference in the truth plane.

Alternatives: thread the two values through the connect-declaration input so a
caller supplies them (a per-call-site reconnect policy, which is the shape the
ruling was made to remove); leave them `client-default` and pass them anyway (a
transcribed default silently becoming a runtime value, refused in place by the
table's own docstring). **Load-bearing? yes** — it moves what every connection
in the estate runs under, and it moves every session digest with it.

### T40. The kill-the-server wall becomes a bounded observation window

Decided: the arm that used to claim "a drop, one fact per attempt, then a
permanent teardown" now claims "a drop, then retry evidence for a fixed window,
and no teardown", asserts the connection is still open at the end of the window,
and reads the budget it reasons about off the declaration the connection ran
under rather than restating it.

The old arm's terminating sequence existed only because the estate had never
chosen a reconnect budget and inherited the client's, at which an absent
substrate permanently closes the connection after a measured span. With the
budget ruled to never give up, that teardown is unreachable, and an arm waiting
for it would be waiting for the property the ruling deleted — it would fail by
timing out, which reports nothing. The window is sized well past the span the
old default closed at, so "no teardown appeared" is a statement about the
declared value and not about a window too short to have seen one.

Alternatives: keep the old arm and move the pin back for the test (a declared
value moved to make a test convenient, which the wall's own header forbids);
delete the arm (loses the only executed evidence that the pump emits retry
facts at all). **Load-bearing? yes** — it is the wall that proves the ruled
value is the value the runtime runs under.

### T41. The heartbeat's claimed time is schedule arithmetic, not a clock read

Decided: the schedule declaration carries an origin and a period, and the
claimed time of firing n is the origin advanced n periods. The seat consults a
clock only to pace itself between firings, and nothing it reads there reaches a
field, a digest, or a fold.

This is what makes the whole tick body a function of its declared inputs, which
is in turn what makes two emitters of one occurrence produce byte-identical
bodies. Had `claimed` been "what time is it now", the occurrence key would have
named the occurrence while the body still disagreed, and the duplicate-safety
claim would have been about a triple nobody compares rather than about the bytes
the lane absorbs.

The bound is stated where it bites and is not smoothed over: `health` IS a
genuine observation, so two emitters that observed different health mint
different bytes. That is the right answer — two parties claiming different
health of one connection are not making one claim twice — and it means the
occurrence key makes a second emitter safe without making two disagreeing
observers agree.

Alternatives: carry the wall-clock reading (breaks byte-identity and puts a
clock one field away from meaning); drop the claimed field entirely (the spec's
shape carries it, and an executor does not edit the spec it builds against).
**Load-bearing? yes** — it is the premise the duplicate-absorption and
replay-determinism arms both rest on.

### T42. The set-plane rung is earned by executing the ladder's own suite

Decided: the presence module declares the rung its reduction stands at, and the
wall earns it by walking the bounded-semilattice row of the ladder's own rung
table through the ladder's own law-atom suite, over the presence join. The fold
itself is declared through the fold door against the commutative brand its
eight-partition lane demands, which the ladder's one branding door hands out.

The reason it is not a type-level brand: the ladder ships exactly one branding
door and it brands the rung below this one, so the brand this rung would carry
does not exist to be attached. Attaching it would need a second branding door,
and this slice may not add public surface. Asserting the rung without executing
anything was the other option and is the one the estate's own rule forbids — a
brand is earned by a suite, never asserted.

Reported as a finding rather than repaired here: the ladder owes a
bounded-semilattice branding door, and until it exists a set-plane read's rung
is a declared claim with an executed suite behind it instead of a compile-time
one. **Load-bearing? yes** — it is the difference between the rung typing the
carrier and the rung being written down beside it.

### T43. The absent-by-silence pin is one declaration, and both readings are built

Decided: one declared constant names which reading the estate's readers take,
both readings are constructed by the presence read, and the non-negotiable half
is a computation rather than a comment. Ruling the pin is an edit to that one
declaration.

No third state was invented. Under either reading a member is a member and the
silence is a separate number beside it, so the reduction stays what the fold
table declares — established and not ended — and nothing in the reduction learns
to say "probably gone".

Alternatives: pick one reading and build only it (resolves a pin the ticket
reserves for the operator); return a three-valued membership (invents the third
state the ticket forbids). **Load-bearing? yes** — the pin is open and the shape
of the resolution is what this decision fixes.

### T44. The staleness read breaks firing ties toward the later landing

Decided: when two positions carry the same greatest firing for a session, the
read takes the later position.

Both choices are deterministic and replay-stable. This one makes the read
duplicate-free: a re-landed tick at the head leaves the distance from the head
where it was, while taking the earlier landing would make a repeated tick look
one position staler than the tick it repeats — a duplicate moving a read that
duplicates are supposed to be free in.

The measured reason this matters rather than being hypothetical: the lane's
message id is the ENVELOPE digest and the envelope carries the holder, so two
DIFFERENT holders emitting one occurrence land two messages carrying one body.
The substrate absorbs a holder racing itself; it does not absorb two holders,
and the tie rule is where that second case becomes free. Reported as a finding
for the emitter-plurality question rather than repaired here — narrowing the
message id to the body would be a change to the lane's own identity and belongs
to a ruling, not to this slice. **Load-bearing? yes**

## Task: the run outcome's third arm, in the engine and on the wall (operator ruling 2026-08-19)

The grill on the run group's two model-side questions was ruled. `Completion`
re-types to `Option CandidateAct` and `RunOutcome` grows `unspeakable (node,
steps)` with prefix-keeping semantics, and the ruling named this engine's
error-channel discard of the prefix as the divergence to REPAIR. T38 above was
written under that divergence; it is SUPERSEDED, not rewritten.

### T39. A node that cannot be spoken ends the run as an outcome, keeping the prefix

Decided: `Engine.run` catches a completion that produces no candidate and
returns `{ _tag: "unspeakable", node, slot, detail, steps }` with the steps
that already stood standing. The error channel no longer carries it.

This is the one licensed engine semantic change and nothing else moved with
it: the walk still stops at the first refusal, the tail after either stop is
still unjudged, every judgment still routes through the one door, and every
other engine surface keeps the error channel it had. The gap travels the
completion's OWN error channel as a private tagged value the run converts, so
it never escapes as a refusal a caller sees. Alternatives: return the prefix
alongside the refusal in the error channel (which makes a refusal carry
success, and every caller pay for it); leave the discard and pin it as a bound
(what T38 did, and what the ruling closed).

Why: the admissions before the unspeakable node really happened — they were
judged, carried, and landed — and none of them depended on the node that could
not be spoken. A report that erases them is a report that lies about work the
carriers already did. **Load-bearing? yes** — it is the ruled repair, and it is
what makes the fifth replay vector a byte claim.

### T40. The completion names its gap where the model names one, in the model's four words

Decided: each site where a required slot has no value answers with the slot
name and one of `unwired`, `unsupplied`, `unlanded`, `unbranded` — a reference
slot the declaration leaves unwired, a supply the run does not bind, a local
consumed before it landed, a reference carrying no brand the completion needs.
The four words are read off the corpus's own run schema through a type
extraction, never restated as a literal union here.

Before this, an unwired reference slot reached the constrained decoder as an
absent field and refused there. That refusal was true and unusable: it named a
schema mismatch, not the slot a program's author has to wire. The explicit
checks are a transcription of the model's own `completeNode`, in its order —
payload first, then the reference slots, then the supplies. Everything that
does complete is still constrained-decoded through the one parse boundary, so
the boundary is not weakened, only pre-empted where the model already answers.
Alternatives: derive the slot from the decoder's issue path (couples the report
to a formatter's shape, and still cannot say `unwired` from `unsupplied`); scan
the built candidate for absent keys after the fact (needs a key order that
matches the model's report order, restated by hand).

Why: the corpus's unspeakable row states WHERE and WHY, and byte-equality with
it is only meaningful if this engine states the same two things from its own
completion rather than from the vector it is being compared to. **Load-bearing?
yes** — without it the fifth vector cannot be byte-compared at all.

### T41. Every replay arm is byte-compared, and a dropped prefix step is refutable

Decided: `assertReplays` byte-compares all five vectors. The unspeakable arm's
exemption is gone, and a fourth mutation joins the executed falsification: drop
the step that stood before the unspeakable node from the committed bytes, and
the wall must refuse.

T38 recorded an uneven wall — three arms, two byte-compared — and named the
divergence behind it. The ruling closed the divergence, so the unevenness has
no reason left. The fourth mutation is what keeps the ruled semantics a claim
rather than a sentence: an engine that discarded the prefix would pass a wall
that only checked the arm, the node and the slot. Alternatives: assert the
prefix's length separately (a weaker statement that the bytes already make);
leave three mutations (which would leave the newly-compared field unfalsified).

Why: a byte wall with an exempt arm is a wall with a hole, and the hole was
exactly where the interesting disagreement lived. **Load-bearing? yes** — "all
five vectors byte-equal" is the wall's whole claim now, and a mutation per
thing it is sensitive to is what licenses saying it.
## Task: the incarnation register and the lifecycle facts (estate-daemon S5, 2026-08-19)

Placeholders `T39`–`T47` continue the series; repository D-numbers are assigned
at merge. The specification is the estate-daemon spec's fence inventory and its
lifecycle contract, under the operator's daemon commission of 2026-08-19 and the
ratification of the round key in the same session. The code this slice lands is
in the Go module, and the entries live here because the daemon track's earlier
entries do. What lands in this package is the lifecycle facts' declarations in
one internal module and one test-only process — the reference side of the byte
comparison — and nothing under a public surface.

`T29` stands unchanged: the round key is ratified and this slice is built on it
exactly as the groundwork keyed it. Nothing below re-opens it.

### T39. The Go register pays the incarnation pin by transcription, and the control opens the guard both ways

Decided: the incarnation pin the Go register package recorded as deferred is
implemented, transcribed from the spine's, and the package documents the debt as
paid rather than restating it. Open records the backing stream's creation stamp
and every action re-asserts it ahead of its own law checks; a mismatch refuses
`incarnation-mismatch` on the incarnation's own law with the spine's taught
repair, never `stale-register-token`, which would name a current fence no holder
of that register was ever granted.

An unpinned open is added beside it and exists for exactly one purpose: the pin's
committed refutation. The wall runs the same stale-token presentation both ways
and records both outcomes — with the pin the presentation refuses, without it the
stale token lands on the reborn bucket. A guard whose absence changes nothing was
never guarding, and the only way to know which kind this one is, is to run it
both ways.

Alternatives, priced. Leaving the pin deferred and fencing on top of it anyway:
the daemon's incarnation register is precisely the case the deferral was written
for, so building the fence on an unpinned register would put the whole slice on
the bound the ticket exists to close. Making the pin optional per call: the
assertion's value is that no action can forget it, and a flag at the call site is
a way to forget it. Comparing something other than the creation stamp: the
bucket's name is identical across incarnations by construction and every state
field moves under ordinary writes, so nothing else the pinned client publishes is
fixed for a stream's life and re-minted by its rebirth. **Load-bearing? yes** —
without the pin the fence's own token order can be reset out of band.

The cost is one stream-info round trip per action, which is what the spine's
entry already accepted and what this side now accepts on the same terms. The five
actions' semantics are otherwise untouched, and existing consumers see one new
refusal kind rather than a changed law.

### T40. Every register refusal teaches a repair, and the table is walled for totality

Decided: the Go register's refusal type grows a repair, transcribed from the
spine's taught notes, and a table keyed by refusal kind supplies one for every
kind the package mints. The refusal-parity law asks for reason, law AND repair,
and this seam was returning two of the three.

The table is walled rather than trusted: the package publishes the roster of
kinds it mints and a test walks it, so a kind added without a repair reddens on
the day it is added. A kind outside the roster teaches nothing, and that arm is
in the same test — a totality check that passes for everything proves nothing.

Alternatives: a repair per call site (the same repair retyped at each site that
mints one kind, and they drift); a single generic repair (a repair that fits
every refusal directs nobody anywhere). **Load-bearing? no** — the refusals were
already typed and the law was already stated; this closes a gap in how they were
carried.

### T41. The decide is a function of the register, and the winner starts the server afterwards

Decided: the incarnation decide is grant-then-commit with the granted token
carried between them, and it returns before anything is constructed. Starting a
server is the winner's act, performed after the decide returns, and no path
through the decide reaches a substrate at all.

The separation is MEASURED rather than asserted, and that is the part worth
recording. Every racer writes a witness file into the contested store directory
at the instant it commits to constructing a server there, before it constructs
one, so a loser that proceeded leaves evidence on the filesystem that outlives
its process. The wall counts witnesses, port binds and bind failures and prints
all three. "The losers never started" is then a filesystem reading rather than a
property of how the code happens to be arranged.

Alternatives: asserting the separation from the call graph (true today, silent
the day somebody moves a line); counting only successful binds (a loser that
tried and failed would look the same as a loser that never tried, and those are
very different facts). **Load-bearing? yes** — the whole fence is the claim that
a loser never touches the store.

### T42. The race is released by one message over one path, and one round is ordered on purpose

Decided: the racing-start wall releases every arm — in process and out of it —
with one published message that all of them are subscribed to, with every arm
already connected and its register already open before the release. Two earlier
schedules were run and both were biased, and the bias is recorded because it is
what makes the current schedule readable: releasing the in-process arms with a Go
channel while the far arm waited on a message gave the near arms a head start of
one network hop, and letting each arm connect after the release gave the far arm
a head start of one connection handshake. Each bias produced a clean sweep for
whichever side it favoured.

Under the fair schedule the out-of-process arm still loses most rounds to process
wake-up latency. So one further round is ORDERED on purpose — the in-process arms
are held back — and it is labelled as ordered in the wall's own output. Without
it the fence would only ever have been measured refusing the far side; with it,
both directions are measured. The fair rounds stay fair and their winners are
reported as they fall.

Alternatives: tuning the fair schedule until the arms win equally (that is
engineering the race, and the number it produces means nothing); dropping the
out-of-process arm (the specification requires it, and a goroutine race inside
one runtime is not the hazard); reporting the sweep without comment (a result
whose cause is the scheduler, presented as a result about the fence).
**Load-bearing? yes** — a race arm's bounds are the whole of what it certifies.

### T43. The lame-duck fact is a new kind on the session lane, and its owed variant row is named

Decided: the drain disposition lands as `substrate-incarnation-lame-duck` on the
session lane, citing the session it is about, the incarnation that entered lame
duck, the vendor's own event name, and the server that event names. It is landed
BEFORE the vendor's drain runs, because a disposition announced only by a status
event reaches the clients that happen to be connected, and the record is what
reaches everybody else.

The residual, stated rather than buried: the session lane's declared event form
carries four variants and this is not one of them, so a reader decoding that lane
under that form refuses this fact. Appending the variant is owed work in the
module that owns the form, and this slice does not own it.

Alternatives, priced. Reusing the transcribed transition variant, which already
carries the vendor's lame-duck row: it has no field for the incarnation, so the
fact would name the session and the server but not the run that is draining, and
the join back to the incarnation would go through the server name and the
declared options value — recoverable, but a join where the specification asks for
a citation. Appending a fifth variant to the form: the right end state, and not
this seat's file. **Load-bearing? yes** — which shape the fact has decides what a
consumer can read without a second lookup.

### T44. The retirement causes are two declared estate values, and there is no row a crash could enter under

Decided: retirement carries a cause, the roster has exactly two rows — drained
and stopped — and both are marked as DECLARED ESTATE VALUES, because the pinned
vendor supplies no retirement-cause vocabulary at all; its lifecycle surface is
verbs. Minting a retirement with any other cause refuses.

The roster's shape is what makes crash-forgery unsayable rather than merely
discouraged. There is no row a crash could enter under, so "no heartbeat for two
minutes, so retire it" cannot be written down even by a caller who wanted to. The
teardown wall executes that: four forged causes are attempted and all four
refuse, and the killed incarnation is folded twice, once immediately and once
after the run, and stays established both times.

Alternatives: a free-text cause (anything at all becomes sayable, including a
verdict on silence); a crashed row (the forgery, spelled); no cause at all (drain
and stop would then differ only by the presence of a lame-duck fact, and the
retirement itself would say nothing). **Load-bearing? yes** — absence read
honestly is the slice's central refusal.

### T45. The fold has no answer that means live, and the standing vocabulary says so

Decided: the fold over the incarnation lane answers with a standing that is
either established or retired, and there is deliberately no third value meaning
live, running, or healthy. An incarnation whose process died reads as
established, forever, which is exactly the absence the supervisor's fenced decide
is fed.

The teardown wall records the fold's output verbatim rather than summarising it,
because a summary is where a liveness claim gets added back by a reader.

Alternatives: a live standing computed from a heartbeat (a clock read in meaning,
and a promise the algebra never makes); an unknown standing (it reads as a third
state of the world rather than as the absence of a fact). **Load-bearing? yes** —
"the substrate is alive now" is unsayable by construction, and a fold that could
say it would be the construction failing.

### T46. Three server-option rows leave the priced-grill list, and the power-loss residual is a declared field

Decided, under the operator ruling of 2026-08-19 riding this lane: the server
name is SET and refused when absent; the log suppression becomes a declared row
that is false under the daemon posture, with the hermetic test harness sites
keeping their own true; and the sync interval is ACCEPTED at the vendor's own two
minutes, declared out loud, with the power-loss residual stated beside it and the
one reversible field that would close it — sync-always — declared false.

Each refusal is how the ruling is kept rather than remembered. An absent server
name would make the session fact's server name and the lame-duck fact's server a
per-restart identity, so it refuses. An absent sync interval is not the same fact
as an accepted one: the vendor would fill its own baseline and the estate would
be running under a value nobody declared, so that refuses too.

The residual, stated: between two flushes the substrate's durability against
POWER LOSS is not guaranteed. Process crash is a different failure and is covered
by the recovery suite's measurements. Flipping sync-always is a one-field change
with a measured throughput cost, and the ruling took the interval rather than the
flag.

Alternatives: leaving all three implicit (the estate runs under values nobody
declared, which is the drift class the declared value exists to refuse); setting
sync-always true (the other end of the trade, not ruled); suppressing the log
everywhere (a daemon owns its process and therefore owns its log).
**Load-bearing? yes** — the options digest is what every incarnation cites, so
what the value carries is what an incarnation can be said to have run under.

### T47. The consumer's freedom from callbacks is by construction, and the control proves the difference is real

Decided: the lane-driven lame-duck consumer is constructed from a lane and
nothing else. It holds no connection, so there is no object on which a status
callback could be registered — the absence is structural rather than a discipline
somebody maintains, and the wall reads the type's fields rather than taking the
sentence's word for it.

The committed control is what makes the distinction more than a preference. It
runs the same drain with NO fact landed and a consumer wired to the vendor's own
lame-duck callback, confirms that the callback fired, and then measures that a
second party holding an anchor on the session lane can find no trace of the
reaction. The control passes only when both halves hold: a control that could
find the reaction would prove nothing, because then the callback shape would be
auditable too.

Alternatives: asserting the absence in prose (the class of claim this estate does
not accept); a control that merely fails to compile (it would show the shape is
unavailable, not that the two shapes differ in what they leave behind).
**Load-bearing? yes** — the shuttle inherits this seam.

## Task: the schema and SDK surfaces flip to the model emitter (DEV-812, operator ratification 2026-08-19)

The last two hand-written TypeScript projections move onto the canonical AST.
Both interpretive manifests were ratified AS-IS by the operator in session, so
what follows is transcription and the record of what the committed bytes forced,
not a second round of judgement.

### T1. The schema surface's interpretive load becomes reviewed Lean data, transcribed rather than re-decided

Decided: the ratified schemas manifest is carried in `verify/unity`'s emitter as
reviewed Lean values with their own docstrings, and every row of it is the
retiring renderer's, transcribed. The idiom map says `List` is `Schema.Array`,
`Option` is `Schema.UndefinedOr`, a sum whose constructors are all nullary is a
`Schema.Literals` union, and everything else is a union of tagged structs. Brand
arguments are dropped, because the target erases and the compile-time separation
is generated next door. The title of every schema is its docstring's first
sentence. The module's own prose, the `KernelRef` expansion and the brand
sentence are carried as string data, verbatim.

The alternative considered and refused was paraphrase: re-deriving the prose from
the corpus, or tightening a sentence while moving it. Either would have made
parity unmeasurable, and parity is the only evidence a flip has.

**Load-bearing? yes** — the manifest is the surface's meaning; the emitter is
only its transcription.

### T2. The recursion rule is a manifest row, and it is mechanical

Decided: a type whose constructor field references the type being declared is
SUSPENDED. Its schema is written `Schema.suspend((): Schema.Codec<T> => S)` and
its value type `T` is written out in full ahead of the schema, because a
suspended schema carries no type to read back off it. The rule is stated over
the type records — declaration index of the referenced name against the
declaration index of the referencing type — and nothing in the generator knows
that today's one instance is `CandidatePredicate.negation.inner`.

A forward reference (a name declared strictly later) is refused rather than
suspended: the model writes none, and admitting one would emit a schema that is
not yet bound.

Alternatives: name the recursion by type (works today, silently wrong the first
time the model gains a second one); suspend every declared reference (correct
output, but it would spell eight schemas as thunks and say something false about
each).

**Load-bearing? yes** — the rule decides both a schema spelling and whether an
alias is written out, and it is the one place the surface's shape depends on the
corpus's order rather than its contents.

### T3. The two layout kinds added to the target grammar, and the evidence that forced them

Decided, and RATIFIED BY THE OPERATOR IN SESSION 2026-08-19: `Unity.Ts` grows
two expression constructors, append-only, both on the LAYOUT axis. No structural
TypeScript kind was added and the forty-five-kind census is unchanged — a
`CallExpression` is still a `CallExpression` and a property is still a property.

The evidence the ratification rests on is the committed bytes, per kind:

  * `.apply` — the surface writes `Grammar.KernelHeaderRecord.annotate({` with
    the argument's brace closing the calling line and `})` closing it. The
    existing `.call ... .block` writes the argument on its own indented line
    (`annotate(` / `  {` / `  },` / `)`), and `.call ... .inline` writes the
    whole object flat. Neither is the committed rendering, and no layout the
    spine already carried reaches it.
  * `.offset` — the surface writes `description:` alone on its line with the
    concatenation beginning two columns deeper on the next. `propertyLines`
    could only write `key: value`, beside the key. The rendering is a fact about
    the site, which is exactly what LAYOUT IS DATA says belongs upstream.

Three smaller reachings on the same axis went with them: `.constant` gained a
type-annotation slot (`export const KernelCandidatePredicate:
Schema.Codec<...> =` — a slot the spine did not have at all), `.field` and the
inline type alias gained broken renderings, and a union member may now be a
record the site writes open. Each is the same argument: the committed bytes name
a rendering, and the spine had no path to it.

Alternatives: a raw-text escape hatch on the tree (refused on sight — raw text
is how a target grammar stops being a grammar, and it would have spelled all
five of these as strings); editing the committed surface toward the spine (the
one thing a parity discipline may never do).

**Load-bearing? yes** — this is a change to the shared spine four other surfaces
print through, and it is written so it can be overruled cleanly: reverting the
two constructors reverts the schema surface and nothing else, because the three
standing surfaces re-emit byte-identically with or without them.

### T4. A third layout kind was proposed, probed, and withdrawn

Decided: the doc-comment wrap is the spine's existing `descriptionWrap`, and the
second wrap policy drafted for it was removed.

The reasoning that drafted it was sound and the probe refuted it. The retiring
renderer's word wrap keeps each run's trailing separator and treats the empty
string after a trailing space as a word; the spine's `wrapWords` drops
separators and skips empty words. The two differ whenever a paragraph's last row
lands exactly on the budget, which the model's docstrings — every one of them
ending in a space — could plausibly hit. So a `DocBlock.paragraph` constructor
was added.

Measured: substituting the spine's own `descriptionWrap` and re-emitting
produced the committed bytes exactly, cmp exit 0. The boundary never fires on
this corpus, so the constructor came out.

The separator-keeping split did NOT come out, because a second consumer does
force it: a description is emitted as a concatenation of string literals, the
runs must add back up character for character, and a wrap that dropped the space
between two runs would silently rewrite the sentence. It is exposed as
`splitRuns` for the generator on the `flatWidth` precedent — a width test a
generator has to reproduce, whose result is a value the tree carries.

Alternatives: keep the constructor because the divergence is real in principle
(it would have been growth no committed byte demands, which is the fence this
task was given).

**Load-bearing? yes** — as precedent rather than as code: growth is argued from
the bytes, and a growth whose probe passes without it is not growth.

### T5. Measured facts the committed bytes forced, recorded as facts

Decided: three quirks of the retiring renderer are reproduced rather than
corrected, because parity is bytes.

  1. **The generated file ends without a trailing newline.** The renderer joins
     its lines and writes; the emitter's module therefore closes on its last
     statement rather than on a blank. The printer already treats the trailing
     newline as a fact about the surface and not a constant of the printer, so
     this needed no change — only the discipline not to add one.
  2. **The renderer's broken-object join is a no-op undone.** It joins members
     that already end in commas with `",\n"` and then replaces `",,"` with
     `","`, which is exactly `join("\n")` unless a member's own text contains a
     double comma. Measured: neither the corpus nor the committed surface
     contains `",,"` anywhere, so the two spellings agree and the emitter writes
     the plain join.
  3. **A container's layout is decided after its elements are rendered at the
     inner indent.** The renderer measures the flat form built from already
     rendered children, so a child that broke makes its parent break without a
     second test. The emitter reproduces the order rather than re-deriving a
     width rule.

None of these is a judgement about what the surface should say. Each is recorded
so that a later cleanup knows it is changing bytes on purpose.

**Load-bearing? no** — but a future header cleanup will move all three, and it
should move them knowingly.

### T6. The renderer retires in the flip commit, not after it

Decided: `scripts/kernel-schemas.ts`, its generate script and its check script
are deleted in the same commit that enrols the surface in the digest register,
on the builder's precedent (U9): a flip that keeps both generators walls one
against the other and proves nothing.

What replaced each wall: `check:kernel-schemas` regenerated and diffed on the
bun side; the surface now rides `check:kernel-surfaces` in `test:fast`, which
holds the committed bytes to the digest the model emitter registers, and the
byte-identical regeneration itself is walled under `verify/unity/run.sh` where
the emitter can be run.

One test had to change rather than move. `test/KernelSchemas.test.ts` imported
`firstSentence` from the renderer to check every schema's title — which, once
the renderer wrote the surface, was the generator agreeing with itself. The rule
is now restated in the test file. That is a strengthening: the model computes
the title, the test computes it again from the same docstring, and the two meet
on the committed bytes, so the assertion has an oracle outside both sides for the
first time.

Alternatives: keep the renderer as a second opinion (the both-sides-agree
failure the estate has already paid for once); drop the title assertion (it
would have retired a real wall to avoid restating four lines).

**Load-bearing? yes** — after this commit nothing hand-written stands on the
surface's road.

### T7. The SDK manifest is transcribed whole, and reconciled against the corpus in both directions

Decided: the ratified SDK manifest — the eight-row projection table with each
row's candidate arm, its extra parameter and the ties it makes unspellable, the
two type maps, and the projection notes — is carried as reviewed Lean data,
verbatim.

The reconciliation is the part worth stating, because it is what makes the table
safe to transcribe. Before a byte is written the emitter checks that the table
has exactly as many rows as `Act` has generators, that row `n` names generator
`n`, that no two rows claim one candidate arm, that a row's field list equals the
candidate constructor's own field list name for name and in order, that every
tag a row writes names a constructor the corpus has, and that no parameter is
taken and read nowhere. A field added to the model reddens the emission instead
of arriving as a silently dropped argument.

Two of those checks changed shape in the move and both got stronger. The
retiring renderer found the tags with a regular expression over the expression's
source text and found the unread parameters with a second one; the emitter walks
the expression tree, so it is reading what the surface will actually write
rather than a rendering of it.

Alternatives: derive the table from the corpus (it cannot be — the projection is
a judgement about how a lawful sentence meets a raw one, and the corpus states
neither side of that); check one direction only (the failure it misses is a
surface that silently lost a sentence).

**Load-bearing? yes** — the table decides what every caller of the SDK is asked
for.

### T8. The target grammar grew PAST the ratified layout fence, and this is the entry that says so

Decided, and NOT covered by the operator's in-session ratification: emitting the
SDK required five additions to `Unity.Ts` that are structural rather than
layout. The census moves from forty-five reachable kinds to fifty. This is
recorded as its own decision, separate from T3, because T3's ratification was
argued on the ground that no structural TypeScript construct was added — and
here some are.

What forced each, from the committed bytes:

  * `digestOf` is written with a Block body:
    `): Digest<Kind> => {` / `  void kind` / `  return id as Digest<Kind>` / `}`.
    That is a Block, a ReturnStatement, and an ExpressionStatement over a
    VoidExpression — three kinds the spine did not carry, because until this
    surface every function the emitter wrote returned an expression.
  * `id as Digest<Kind>` is an AsExpression that is not `as const`, which the
    spine carried only in its const-assertion form.
  * The generators' bodies are written `{ _tag: "declare", kind, payload: value,
    writ }` — `kind` and `writ` are ShorthandPropertyAssignments, a different
    node from the PropertyAssignment the spine's object properties were.

The layout-axis additions in the same commit are the ratified kind and are
listed for completeness: an arrow now carries its own type parameters, the
layout its binders are written at, a doc comment per binder, and where its body
starts. Those are four renderings of an ArrowFunction, not four new kinds.

One function in one surface forces the first four of the five. That is the
smallest true statement of the cost, and it is the number the operator should
rule against. The alternative was to change the committed bytes of `digestOf` to
an expression body, which is the one move a parity discipline may never make —
the surface is the target, and a generator that edits its target to fit itself
has stopped being a projection.

Refused outright: a raw-text escape hatch on the tree. It would have carried all
five as strings and cost nothing today, and it is exactly how a target grammar
stops being a grammar.

**Load-bearing? yes** — and reversible in one direction only: reverting these
five reverts the SDK surface, and the other four surfaces re-emit
byte-identically without them.

### T9. The SDK's two walls move to where the emitter runs, and the sharpest one is rebuilt rather than dropped

Decided: `check:kernel-sdk` and `check:kernel-sdk-control` retire with the
renderer, and what each proved is re-established under `verify/unity/run.sh`.

`check:kernel-sdk` proved three things. Determinism — two renderings of one
corpus byte-equal — is what the gate's `check_surface` does for every surface it
emits. Served-equals-derived is the parity arm itself. Provenance-is-a-digest is
unchanged in the bytes: the surface still names the corpus by digest and the
register now cross-checks that digest against a host oracle.

`check:kernel-sdk-control` is the one that could not simply move. It planted
mutations into the *bytes of the corpus file* the renderer read; the emitter
reads the model's own emission rather than a file, so that plant has no site.
The clause worth keeping is the third arm — a moved candidate field name must
make the generator REFUSE rather than drop an argument into the wrong slot — and
it is rebuilt as a gate arm that plants the moved field into the reviewed table
and requires the emission to stop, naming the two field lists it could not
match. The two "a model edit reaches the surface" arms are covered by the
existing shape of the wall: the surface is byte-compared against a fresh
emission from the model on every gate run, so a model edit that failed to reach
it reddens by construction, which is a stronger statement than a planted word.

The fourth arm — renaming a record the surface does not project must NOT move
the bytes — is the one thing genuinely lost, and it is recorded as lost rather
than waved at. It discriminated a wall that reddens on any change from one that
reddens on a vocabulary change. Its replacement, if the operator wants one, is a
gate arm that edits the model and requires exactly one surface to move; that is
a change to the model gates rather than to this lane, so it is not made here.

Alternatives: keep the bun control by having it read the emitter's output (it
would compare the emitter against itself); leave both walls declared but
unreachable (the DEV-799 failure).

**Load-bearing? yes** — and it carries one named loss, above.

### T10. The trailing newline is a fact about each surface, measured separately

Decided: the schema surface ends without a final newline and the SDK surface
ends with one, and the emitter reproduces each.

Measured, and it was the only byte wrong on the SDK's first emission: both
renderers join their lines with newlines and write, so the difference is entirely
whether the renderer's last act was a blank line. The SDK's generator loop ends
with one; the schema renderer's last statement does not. The printer already
treats the trailing newline as a fact about the surface rather than a constant of
its own, so both are expressed by what the module's last statement is.

**Load-bearing? no** — one byte, on two files. Recorded because it is the kind of
difference a reader assumes is a mistake in one of the two files, and it is not.
## Task: server options as declared data, and the closed-channel refusal (estate-daemon S6, 2026-08-19)

### T1. The option table is the schema, and the declared value's key set IS the table

Decided: one transcribed table of server options lives on both sides of the
language boundary, and the declared server-options value carries exactly its
rows — no more and no fewer. Both directions are walked by a test rather than
argued: a table row the value does not carry is a row nobody declares, and a
value key the table does not name is a key nobody transcribed.

The alternative was a schema stated once in prose and a value assembled by hand
at each site, which is the shape that lets a row exist in the struct and not in
the bytes. **Load-bearing? yes** — the digest of this value is what every
incarnation cites, so its key set is what "the options this run used" means.

### T2. The values are transcribed, never ruled

Decided: this slice records what is MEASURED at every row and moves nothing. The
rows whose values are priced decisions belonging to the operator — the sync
interval and sync-always, the log suppression, the server name, and the
monitoring HTTP port — are carried at their measured settings, with the pricing
noted in their own declarations. A value moved here would be a ruling taken by a
transcription.

The monitoring HTTP port is the clearest case: it is transcribed at zero because
zero is what is measured, and zero also happens to close the listener — but it
is NOT an inventory row, because refusing a non-zero value there would be this
slice ruling a row that was explicitly left priced. The HTTPS monitoring
listener is a different row and IS in the inventory, because nothing about it
has ever been priced.

Alternatives: ruling the open rows here (out of scope by declaration, and the
declaration is the point); leaving them out of the table entirely (then the
estate runs under values nobody declared, which is what this slice retires).
**Load-bearing? yes.**

### T3. Two rows are declared inverted so that the zero value is the hermetic posture

Decided: the listen switch and the signal switch are carried in the Go struct as
the positive reading of the vendor's `dont_listen` and `no_sigs`. The declared
VALUE carries the vendor's own key at the vendor's own polarity; the inversion
lives in the field a caller writes and never in the bytes.

The reason is not taste. The signal row used to be set behind the declared
value's back, on the sound ground that an embedded server does not own its
process's signals; making it a declared row at the vendor's polarity would have
made the zero value of the struct install signal handlers, so every construction
site would have carried a setting whose omission changed behaviour. Inverted,
the zero value is the posture the daemon actually holds and no existing site
moved.

Alternatives: a declared row at the vendor's polarity with every site updated (a
footgun left behind for the next site); keeping the value out of the declaration
(the exception the slice exists to retire). **Load-bearing? yes.**

### T4. Keys are the vendor's, and the nesting is the vendor's

Decided: a row's key is the vendor's own configuration word where the vendor has
one, and the vendor's own field name in the snake spelling its configuration
uses everywhere else where it does not. A `named` column records which of the
two each row is, so a reader resolves a key back to the vendor rather than to a
convention. Rows the vendor declares inside a configuration block are declared
inside that block in the value, spelled with that block's own word, so the
table's key for such a row is a path through the vendor's own structure.

The refused alternative was flattening the nested rows into estate-composed
names. A flattened name is an estate word wearing vendor parts, and the adoption
rule is that no estate word enters the option vocabulary at all.
**Load-bearing? yes** — the rule is what makes the table a transcription.

### T5. Provenance is the vendor's declaration AND the place it is declared

Decided: every row carries the vendor's own identifier verbatim and the file and
line where that identifier is declared at the pinned version. The identifier
resolves a row to a declaration; the place makes the transcription checkable by
a machine that has the vendor's source, which is what the parity wall's site
oracle does.

A tracking-artifact concern was weighed and answered: a source location is
tracking-land, and these tables are internal transcription modules rather than
rendered or projected surfaces — nothing generates a document from them. The
place stays. **Load-bearing? no** — the identifier alone would resolve the row;
the place is what buys the oracle.

### T6. One law over an inventory, with per-row reason and repair as DATA

Decided: the closed-channel refusal states one law — the estate's substrate
admits at the doors the estate declared and at no others — and the inventory
carries, per row, the option it reads, the setting at which that option is
closed, the surface a repair happens at, and the repair itself. The door WALKS
the inventory; it branches on nothing.

That is what makes the refusal comparable across the language boundary at all: a
repair written at a call site cannot be byte-compared, and a switch statement
over eight channels cannot be read by anybody who has not gone looking for it.
It is also what makes the closed setting a declaration rather than an inference
— absence is not closure. **Load-bearing? yes.**

### T7. "Remove the field" is a failing repair, and the failure is walled

Decided: every repair must name the closed inventory, say the row is closed by
declaration rather than by accident, and name the act that would open it — an
operator ruling, because a new listener is a new authentication surface. A
repair telling a party to remove the field is refused by a test, because
removing the field would replace a declared closure with an absence, which is
the state the declared value exists to retire.

Alternatives: leaving the repair's content to review (a teaching nobody
executes). **Load-bearing? yes** — a refusal that does not teach is a verdict.

### T8. The inventory is a parameter, and the committed control empties it

Decided: the door takes its inventory as an argument, and the shipped door
passes the estate's. The control passes an EMPTY one, and the same enabling
values are then admitted. This follows the register's own precedent, where the
unpinned client exists solely so the incarnation pin's refutation can be
executed rather than argued; no shipped caller passes anything else.

The alternative — asserting in prose that the inventory is what refuses — cannot
distinguish the inventory from any other check the value might have failed.
**Load-bearing? yes** — a refusal that cannot be turned off proves nothing about
what is doing the refusing.

### T9. A citation RESOLVES; it is not re-derived

Decided: the options citation is admitted only when the cited digest resolves in
a content-addressed store AND the bytes it resolves to are byte-identical to the
value the server was constructed from. Two reasons are distinguished — a digest
nothing resolves, and a digest resolving to another value — because they teach
different repairs.

Re-deriving the running value's digest and comparing digests was the weaker
alternative, and weaker in exactly the place that matters: it compares two names
rather than the value a reader would obtain, so a store resolving a digest to
the wrong bytes would pass. **Load-bearing? yes.**

### T10. The greatest-position read compares canonical bytes, not Go values

Decided: the tie check at the greatest position compares the two candidates'
canonical bytes. Identity is of canonical bytes throughout the estate, and the
declared value now carries a list, which Go cannot compare at all — so the
comparison the tie needs and the comparison the digest already makes became one
comparison rather than two. **Load-bearing? no** — it is the same verdict by a
better route.

### T11. The parity wall carries two oracles outside both transcriptions

Decided: before the two languages' bytes are compared, the pin the tables name
is checked against the module the wall's own binary links, and every row's site
is opened in the pinned vendor's source and checked to declare the field the row
names. Both-sides-agree is not verification: two transcriptions sharing a
mistake agree perfectly, and the vendor is the only referee outside both.

A module cache that does not carry the pinned vendor FAILS the arm rather than
skipping it. **Load-bearing? yes** — without the oracles the parity stage would
certify consensus.

### T12. The flush interval crosses the boundary as the vendor's own rendering

Decided: the declared value carries the interval as the string the daemon's
language renders it to, and the spine carries that rendering rather than
deriving one. The bound is stated where it bites: the parity comparison over
that field compares what both sides declared, not two independent renderings of
one duration. Deriving it on the spine side would have meant restating a
duration format nobody transcribed. **Load-bearing? no**, but the bound is real
and is recorded rather than discovered later.

### T13. The table's digest does not ride the declared value

Decided against, deliberately: the session declaration carries its roster's
digest so a party can resolve the exact roster it folded under, and the same
could have been done here. It is not, because the option value's key set already
determines the table up to sorts and provenance, and making the value's
construction depend on a digest would make it an effectful construction in both
languages for a property the key set nearly carries.

Recorded as the considered alternative, so a later slice that wants the
self-description knows it was weighed rather than missed. **Load-bearing? no.**

### T14. New Go code, and where an existing package would have served

Decided, with the gaps named: the daemon mints its own typed refusal because the
Go side has no shared refusal package — the register's is package-scoped — and
the two declarations are held together by their fields and by review rather than
by a wall. The options store is new for the same reason: the Go side has no
content-addressed store, and the citation needs a resolve rather than a
recomputation. Everything else is adopted rather than rebuilt — the
canonicalizer and the digest are the canonical package's, the lanes are the
journal's, the fence is the register's, and the incarnation fact machinery is
the one the fence slice built. **Load-bearing? no**, but the gaps are the honest
list of what a shared Go refusal package would absorb.
## Task: the read-side folds, the digest instances, and the coherence wall (2026-08-19)

### T1. The structural-kind fold is a mapped arm record, not the pin's discriminator matcher

Decided: `Refusal.matchKind` is an explicitly typed record dispatch whose arm
record is a mapped type over the generated kind union, and the pin's
`Match.discriminatorsExhaustive` is not used for it.

The spec's own signature block writes the mapped record, and the pin explains
why it has to. `discriminatorsExhaustive` computes each arm's argument as
`Extract<R, Record<D, Tag>>`, which is a narrowing BETWEEN union members. A
structural refusal is one class whose `kind` field carries forty-four literals,
not forty-four classes, so the extraction finds no member for any tag and every
arm would take the empty type — a matcher that typechecks and hands each arm
nothing to read. The mapped record states exactly the same totality, keeps the
argument the refusal itself, and costs one property lookup.

The sort fold is the opposite case and gets the opposite answer: `Refusal.match`
IS over a union of two tagged classes, so `Match.tagsExhaustive` is the pin's
own tool and is used.

Alternatives: a matcher for both (arms with nothing to read); a hand-written
switch (the closure would be a habit rather than a type); one fold covering both
sort and kind (two different closures, one of which would have to be optional).
**Load-bearing? yes** — the closure contract is the whole affordance.

### T2. The matcher's `Unify` narrowing is stated at the seam rather than absorbed

Decided: `Refusal.match`'s implementation narrows the pin's
`(u: Refusal) => Unify<Out>` to the declared `(refusal: Refusal) => Out`, with
the reason written beside it.

`Unify` reduces at every real application and cannot reduce over a type
parameter no call site has resolved, so the mismatch exists only inside the one
function that is generic in it. The declared signature above the implementation
is the contract, the exhaustiveness is the matcher's, and the narrowing is the
seam between them.

Alternatives: exporting the pin's return type (every caller would inherit an
unreduced conditional in its own signature); dropping the matcher for a tag
switch (T1's reason not to).
**Load-bearing? no** — a later pin that reduces `Unify` over parameters removes
this line and changes nothing else.

### T3. A closure suite cannot state the closure, so the compile-time half is a separate executed control

Decided: the runtime half — every kind dispatches, and to its own arm — is the
derived suite; the claim "a caller that has not handled a new kind fails to
compile" is an executed must-not-compile control beside it, wired into
`test:types`.

The two halves cannot be one artifact, and the reason is the amendment that
required the suites to derive from the union in the first place. A suite that
builds its arms from the union GROWS with the union, so on the day a kind is
added it keeps passing — which is correct for what it claims and useless for the
other claim. The caller the fence is really about is one whose arm record was
written before the kind existed, and only a compiler can be shown that caller.

Alternatives: asserting the arm count against a written number (the enumeration
this ticket exists to stop writing); a type-level equality assertion inside the
suite (it would fail the same compile the suite runs in, so the suite could not
also report the runtime half).
**Load-bearing? yes** — without the control the closure is untested at the only
moment it matters.

### T4. The control declares its arm records instead of building them, and the dropped kind is the union's own first literal

Decided: both mutants use `declare const` for the full record and for the
arm-short one, and derive the dropped kind as `(typeof Kind.literals)[0]`.

Building the full record needs an `Object.fromEntries` cast, and that cast is
itself an error under the pinned compiler — two errors in a file whose contract
is that it fails for one named reason. The claim is about what can be SPELLED,
so the control needs the types and not the values; nothing in the file runs.
Deriving the dropped kind rather than naming one keeps the control from falling
out of step with the union it watches.

Alternatives: casting through `unknown` (a second cast to explain, and the
scaffolding still in the trace); naming a kind literally (a rename would break
the control for a reason unrelated to closure).
**Load-bearing? yes** — a control reporting two errors proves the file does not
compile, not that the spelling is unlawful.

### T5. The committed traces name the whole arm record, and re-recording is the cost of growing the vocabulary

Decided: the traces are recorded as the pinned compiler prints them, record type
and all, and adding a refusal kind is expected to move them.

The alternative is a normalizer, and this repository already refused that class
of answer for the builder control: the words inside a diagnostic ARE the claim,
so rewriting them before comparing grades the compiler against a paraphrase. The
consequence is honest and small — a kind added to the vocabulary costs one
deliberate re-recording, which is one deliberate acknowledgement that every
caller must now handle it.

Alternatives: matching only the error code (a control that would keep passing
while pointing at a different property); trimming the type text (the paraphrase
problem).
**Load-bearing? no** — a stabler printer would shorten the trace without
changing what it holds.

### T6. The register fold discriminates on the holder, not on token zero

Decided: `Register.matchState` reads `absent` from a null holder, `held` from a
null outcome under a holder, and `landed` from both present.

The spec's gloss says "token 0, no holder", and only the second half is a fact
about the value: the observe path answers a missing entry with a zero token, a
null holder, and a null outcome, while every present entry carries a holder the
stored schema types as a string. Reading absence off the token would make the
fold depend on a revision numbering that belongs to the substrate, and the seam's
own rules already ban reasoning from revision arithmetic.

Alternatives: discriminating on a zero token (substrate arithmetic); a fourth arm
for the unrepresentable holder-less landing (a case the stored schema excludes).
**Load-bearing? yes** — absence is the arm a consumer is most likely to reach.

### T7. The read-side types are spelled through the modules' own exported types, never through `string` and `number`

Decided: every arm shape and instance is written over the concept module's
exported type — `RegisterState["token"]`, `NonNullable<RegisterState["holder"]>`,
`RegisterState["outcome"]`, `DecodedEnvelope`, `CellState`, `Envelope`,
`PublishedEnvelope`, `EmittedEvent` — and no primitive alias is restated here.

The sorts sweep that brands these fields is being built concurrently. Spelled
this way, a brand landing on a holder or a lane handle transports into these
folds without touching them; spelled as `string`, each one would be a second
declaration of a concept the sweep is trying to unify, which is the first
standing law's definition of a defect. The token order survives the same way for
a different reason: `Order` is contravariant in its parameter, so the pin's
number order remains the order of a branded token.

Alternatives: writing the primitives now and re-typing after the sweep merges
(two edits, and a window in which the wrong type ships).
**Load-bearing? yes** — it is what makes the rebase mechanical.

### T8. The coherence wall demonstrates the pin's equality cache rather than citing it

Decided: the wall's last case mutates a decoded envelope after its first
comparison and shows the pin still answering with the answer it had before, then
shows a fresh decode of the same value answering correctly.

The gotcha is the reason every comparison above it is over decode-fresh values,
and a discipline whose justification is a sentence in someone else's
documentation is a discipline nobody can check. Executed, it is evidence: the
cache is real, plait values are decode-produced and treated as immutable, and the
wall holds itself to that by construction rather than by intent.

The generated half is bounded the same way. The envelope arbitrary draws from a
deliberately small pool in every coordinate, because a property that only ever
produced different envelopes would exercise one side of the biconditional and
report a pass for both — so a third case samples the pool and requires the
digests to collide, which makes the positive branch's coverage a measured fact.
The backward direction is stated as trusted base, in the ledger's own terms:
observing that no colliding pair appears is not a proof that none exists.

Alternatives: citing the pin's documentation in prose (unfalsifiable); generating
envelopes from the schema's own arbitrary (the wire-value declaration carries no
arbitrary, and a wide pool would never collide).
**Load-bearing? yes** — every digest equivalence in the package inherits this
wall.

### T9. The named first consumers carry no refusal fold, and none was manufactured

Decided: no consumer was refactored through `Refusal.match` or
`Refusal.matchKind`, and the reason is reported rather than repaired.

The dispatch charged this run to route the served face and the engine's outcome
plumbing through the new folds. Reading them, every branch in both is over the
ENGINE's own outcome union — carried against refused, and the door verdict's
refused — and not over a refusal at all. The one place the served face touches a
refusal reads its shared fields uniformly into the wire shape, with no branch to
replace; folding it would spell two arms doing identical work. A sweep of the
package finds exactly one conditional anywhere that reads refusal sort, and it is
the retry predicate the sort exists for.

The nearest genuine candidate for a NEW fold is the incarnation round's landed
read, which answers null for both non-landed states — a single field read under
one null check, which is the case the dispatch explicitly excluded.

Alternatives: routing the served face's uniform projection through a two-arm fold
(ceremony over a shape with no branch, and every served byte at risk for it);
minting an engine-outcome fold (new public surface outside this scope).
**Load-bearing? no** — the folds' first real consumers will be the surfaces that
answer differently per sort, and none is built yet.

### T10. The counted type universe did not grow, so no pin was raised

Decided: no ratchet pin was touched and no waiver was added.

Every export this run lands is a VALUE — folds, an order, three equivalences —
and the census quantifies over public type declarations. The walk classified the
same 182 public types before and after, and the public-effect manifest did not
move either, because nothing added returns an `Effect`, a `Layer`, or a `Stream`.
Both were run rather than assumed.

Alternatives: pre-emptively raising a pin (a raise that measured nothing).
**Load-bearing? no** — a later export that names a type will pay the pin then.

## Task: the completion pass — a fold for the engine's unions (operator ruling, 2026-08-19)

The prior task reported the engine's outcome union as a hand-folded site outside
its scope. The operator ruled the fold in — the beauty is in completeness, a
match for every matcher — and this task is that completion.

### T1. Both engine unions get a fold, and the run outcome is public surface rather than an internal shape

Decided: `Engine.matchOutcome` over `EngineOutcome<Landed>` and
`Engine.matchRunOutcome` over `RunOutcome`.

The second one was a judgment the dispatch asked for rather than assumed.
`RunOutcome` qualifies on every count the completeness rule cares about: it is
exported through the package barrel, it is a closed three-arm tagged union, it is
the return type of the public `run`, it is already counted in the public type
universe as owned debt, and it is read by hand — the engine and replay suites
both branch on its tags. A union a consumer can only read by branching is a union
that should offer a fold.

Alternatives: folding only the write outcome (the run outcome is the wider union
and the one whose third arm is easiest to forget); leaving both and reporting
(the ruling closed that option).
**Load-bearing? yes** — the run outcome's third arm is the one a consumer drops.

### T2. Both engine folds use the pin's tag matcher, and that is consistent with refusing it for the kind fold

Decided: `Match.type<...>().pipe(Match.tagsExhaustive(cases))` for both.

This is the same rule the prior task applied, reaching the opposite answer
because the shapes differ. `Match` discriminates BETWEEN union members: it earns
its keep exactly when the union is a union of tagged object types, which both
engine outcomes are, and it cannot work when the union is one type whose field
carries many literals, which the refusal kind is. The kind fold's mapped record
and these two matchers are the same discipline applied to two different shapes,
not two tastes.

Alternatives: conditional folds on `_tag` (they would work and would state the
closure less; the matcher's arm record makes a missing arm a missing required
property and an extra arm the empty type).
**Load-bearing? no** — the closure would survive either spelling.

### T3. `matchOutcome` is dual, because it is the family's only fold whose input is parametric

Decided: `matchOutcome` supports data-first and pipeable use, in the same idiom
`retryAbsence` already uses; `matchRunOutcome` stays pipeable-only like the rest
of the family.

The asymmetry is forced and not a preference. Every other fold in the family
takes a concrete input — a refusal, an envelope, a register state — so the
pipeable shape has nothing left to infer. `EngineOutcome` is parametric in its
landing, and a caller who writes the arms first has handed the compiler no
outcome to read the landing off: `Landed` resolves to `unknown` and the carried
arm loses the very value it exists to receive. Data-first reads the landing off
the outcome. Both shapes are declared, so nothing is lost.

The arms' return type is annotated at each served call site rather than inferred.
A single `Out` is the stronger contract — it forces both arms to agree on what
the fold answers — and on this surface what they must agree on has a name.

Alternatives: a single `Out` inferred as the union of both arms' returns (weaker:
the arms would never have to agree); requiring the caller to spell both type
parameters (noise at every site).
**Load-bearing? yes** — without it the carried arm is untyped where it matters.

### T4. No must-not-compile control for these two, and the line is where the union comes from

Decided: the two engine folds get runtime closure suites and NO compile-time
control, and the rule that decides it is stated rather than the case being judged
one at a time.

A control earns its keep when a union can GROW WITHOUT ANYONE TOUCHING THE FOLD.
That is exactly the refusal vocabulary and the envelope grammar: both are
projected from the corpus by an emitter, so a kind can arrive in a regeneration
that edits no fold and no call site, and only a compiler run against a caller
written before that day can show what the arrival costs. `EngineOutcome` and
`RunOutcome` are hand-written unions in this module. A third arm arrives only by
someone editing the very lines the fold sits beside, and the compiler tells them
at every call site in the same edit — a control would restate, on a committed
trace needing re-recording, what that edit already surfaces immediately.

The structural totality is unchanged either way: the matcher's arm record makes a
missing arm a missing required property and an unknown arm the empty type. What
the control adds is not the closure, it is the WARNING, and only a generated
union can spring it.

Alternatives: a control per fold (ceremony, plus two more traces to re-record for
a union nobody can grow accidentally); no runtime suite either (the dispatch to
each arm would then be unexercised).
**Load-bearing? yes** — it is the rule that keeps the control set from growing
with every union.

### T5. Five sites, not six, and the three that remain are a different union

Decided: the served face's five `EngineOutcome` folds are refactored; the three
`KernelVerdict` folds beside them are left, and the prior task's count is
corrected.

The prior report said six hand-fold sites in the served face. Recounting against
the file: five read `outcome._tag === "refused"` over `EngineOutcome`, and three
more read `verdict.verdict === "refused"` over `KernelVerdict` — the generated
door verdict, a different union with a different discriminant. Six was a
miscount, and the corrected numbers are five refactored and three deliberately
untouched.

Those three are left for a reason beyond scope. `KernelVerdict` is generated
kernel vocabulary, and the one-door wall refuses a module that constructs or
declares an admission verdict or declares a hand-written twin of a name the
door's form owns. A verdict fold is exactly the shape that wall exists to catch,
so it is the door's to offer if anyone offers it — minting one on the served face
would be a second-door spelling wearing a fold's clothes.

Alternatives: folding the verdict sites here (risks the wall this pass was told
to keep green, and would site kernel vocabulary on a surface).
**Load-bearing? yes** — the boundary between the engine's unions and the kernel's
is what keeps the served face out of the door's business.

### T6. The engine's own three carried-guards are left as guards

Decided: the three `if (outcome._tag === "carried")` sites inside the engine's
lane, cell, and register declares keep their shape.

They are not folds. Each performs a side effect on one arm and returns the same
outcome on both, so routing them through the fold would spell two arms returning
the identical value with one of them mutating a replica on the way — the
"do not force it" case, restated inside the module that owns the union.

Alternatives: folding them for uniformity (uniformity of spelling at the cost of
saying what the code does).
**Load-bearing? no** — a later refactor may find a shape where the fold reads
better.

### T7. Served bytes were held by running the walls, not by inspecting the diff

Decided: the refactor's constraint was checked by executing the parity and door
gates and the served-face suite rather than by reading the change.

Each site keeps the same constructor calls with the same arguments in the same
order, so the rendered objects have identical keys in identical order — but that
is an argument, and the constraint was a wall. `check:kernel-tools` and its
mutation control, `check:kernel-door` and its eleven planted second-door
spellings, and the served-face suite were each run bare and each passed.

Alternatives: reasoning from the diff alone (the class of claim this estate does
not accept).
**Load-bearing? yes** — served-equals-derived is a blocker-severity law.

### T8. Neither manifest moved, and the pins were left alone

Decided: no ratchet pin was raised and no waiver added, for the second time and
for the same measured reason.

The folds are values; the arm types they name — the carried and refused arms of
each union — are non-exported aliases, so the census sees no new public type. The
walk classified the same 182 public types and the ratchet held at its committed
pins; the signature manifest regenerated byte-identical, because a fold returns a
function and never an `Effect`, a `Layer`, or a `Stream`. Both were run.

Alternatives: exporting the arm aliases for callers to name (four new public
types and four waivers, to save callers a `ReturnType`-shaped spelling nobody has
asked for yet).
**Load-bearing? no** — exporting an arm type later is an ordinary reviewed diff.
## Task: the sorts sweep — canonical strings become concrete types (2026-08-19)

### T1. The sorts are brands over the shipped checks, not new validation

Decided: seven canonical strings became branded schemas on the `Digest`/subject
precedent — `CellName`, `WorkKey`, `Holder`, `OutcomeValue`, `LaneHandle`,
`StreamName`, `SegmentName` — each `Schema.String.check(...)` piped through
`Schema.brand` and annotated, and each carrying exactly the check its seam
already made.

The sweep's claim is nominal identity, not stricter admission. Every token-shaped
sort is checked against the grammar the adapter under it was already testing, and
the two non-token sorts carry the non-empty check their seams already enforced
(`Session.writ` refuses an unnamed holder today, and did before this run). So no
value that was admitted yesterday is refused now, and no value that was refused
is admitted. What changed is that a cell name and a work key stopped being
interchangeable, and that a bare string stopped being either.

Alternatives: `Schema.fromBrand` over a `Brand.Constructor` (a second place to
state a grammar, for a brand tag we already spell); tightening the checks while
branding (would have made this a behaviour change wearing a typing change's
clothes, and the register key's real tightening belongs to the slice that makes
it a digest).
**Load-bearing? yes** — every later constraint on these values lands on the
brand rather than on a sweep of the seams that spell it.

### T2. Two sorts live one plane deeper than their concept, and are re-exported

Decided: `CellName` is declared in `kernel/Subjects.ts` and `Holder` in
`kernel/Wire.ts`; `planes/Cell.ts` and `planes/Register.ts` re-export them.
Every other sort is declared in its concept module.

The dispatch asked for the brands at the concept modules. Two of them cannot be:
the context program's cell selector is a kernel-plane declaration that spells a
cell name, and the envelope is a kernel-plane value that carries a holder, and
plane layering refuses a kernel module importing `planes/`. The choice was a
kernel-plane home with a re-export, or leaving those two kernel seams spelling
bare strings. Leaving them bare would have put a hole in the sweep exactly where
the corpus's own declarations are, so the sorts went deeper and the concept
modules re-export them — one declaration, reachable where its concept lives.

The homes are not arbitrary. `Subjects.ts` already owned the literal-token
grammar, which is `CellName`'s whole check; `Wire.ts` is where the estate's
holder field actually crosses the wire.

Alternatives: a new sorts module (refused — no new modules, API log 0018);
declaring each sort twice (a second declaration of a corpus concept is a
first-standing-law defect); leaving the two kernel seams unbranded and reporting
them (a stated hole in an acceptance the dispatch scoped).
**Load-bearing? yes** — the placement is what lets the sweep be total.

### T3. One minting site per sort that teaches a refusal; the adapter calls it

Decided: `Cell.cellName`, `Register.workKey`, and `Lane.laneHandle` are the
public smart constructors, they mint the refusals that used to be minted inside
`internal/cells.ts` and `internal/registers.ts`, and those adapters now call them
rather than re-testing the grammar. `Lane.declare` calls `laneHandle` instead of
composing an evidence subject itself.

"Minted once" is the dispatch's own word for the pattern, and it has two halves:
one regular expression (`Subjects.TOKEN_PATTERN`, which replaced three private
copies) and one teaching. Leaving the refusal in the adapter while the check
moved to the schema would have left the law stated in one place and taught in
another.

**Refusal delta: none, and it was measured.** The payload pin regenerated with
the two refusals moved from `internal/cells.ts` and `internal/registers.ts` to
`planes/Cell.ts` and `planes/Register.ts`; `kind`, `law`, `expected`, and every
`next` text are byte-identical across the move, which the pin diff shows line for
line. No kind was added, none was retired, and no taught text moved.

Alternatives: a second refusal beside the adapter's (two law texts for one kind);
`Refusal.decodeRefusing` at the constructors (would have replaced the seams'
specific teaching with the generic parse refusal).
**Load-bearing? yes** — the one-site rule is what the AGENTS law now names.

### T4. The keep-list, with the reason each stays bare

Decided: four families keep bare strings, for four different reasons.

| Family | Verdict | Reason it stays |
| --- | --- | --- |
| bucket names (`CELL_BUCKET`, `REGISTER_BUCKET`) | keep | internal literal consts; no seam crossing, so a sort would name nothing a caller can hold |
| refusal kinds, envelope kinds, volatility classes | keep | already closed literal unions, which IS the sweep's target state — a brand over a closed union weakens it to a string |
| `connectionName` | keep bare | deployment configuration, outside meaning; a brand here would dignify an ops nickname into a sort |
| operation names in refusal `path`s | keep bare | diagnostics inside a refusal payload, not identities; the refusal schema is their law |

Two further families were examined and kept, beyond the dispatch's list.
`Cell.Observation.holder` is a `WireValue`, not the `Holder` sort: a cell's
observation is holder-attributed in the lattice's own alphabet, where the
attribution is a canonical value rather than a name, and narrowing it to a string
sort would narrow the carrier. `internal/writs.ts`'s `SubstrateWrit.holder` is
derived from a connection name — it is the layer the writ is declared for — so it
belongs to the keep-bare connection-name family and not to the attribution sort,
despite sharing its field name.

**Load-bearing? yes** — the keep-list is the sweep's boundary, and an unbounded
sweep is how ops labels become sorts.

### T5. Where a digest becomes a work key or an outcome value, the mint is explicit

Decided: the engine's two commit paths, the incarnation round key, and the two
daemon lane handles mint their sorts explicitly rather than widening the sorts to
admit digests.

These are the sites where the kernel's direction is already visible in the
runtime: a register key IS a work digest, a decide lands the cataloged outcome's
ADDRESS, and the heartbeat and session lanes route under their own event-schema
digest rather than a chosen name. A digest is a lawful literal token by
construction, so every one of these mints is total — but it is written out, so
the day the commit door constrains an outcome against a declared schema, the
sites that have to answer for it are the sites that named themselves here.
`roundKey` now returns a `WorkKey` directly, because its own doc comment already
argued that a digest is one literal key.

Alternatives: widening `WorkKey`/`OutcomeValue` to accept `Digest` (would have
made the sort a union and hidden exactly the transition the kernel is heading
for).
**Load-bearing? yes**

### T6. The Symbol statements, restated where they bind

Decided: no code changed for the Symbol decision; the statements are recorded
here and, where they bind on a shipped surface, in the module that carries them.

Service identity stays `Context.Service` over string keys, which is the pinned
release's own service-identity form. Value identity is brands, which is what this
task landed. A string TypeId field ships only on a demonstrated same-shape
runtime collision, and none exists in this tree — the sweep looked, because
branding every canonical name is exactly the pass that would have surfaced one.
`Algebra.ts`'s phantom `unique symbol` plus separate runtime witness is kept as
the house earned-brand form and is the precedent for future earned brands: the
phantom makes the brand unforgeable outside its module and the witness makes it
checkable at the deployment door, which no single mechanism does. `PrimaryKey`
stays reserved for the first class-shaped carrier. `Equal`/`Hash` instances stay
refused for plain structs; the coherence wall that landed beside this run rests
on structural equality being native at the pin, which an instance would displace.

**Load-bearing? no** — the statements bind future work, and each names the
condition that would change it.

### T7. The template-literal option is not exercised, and the refusal stands

Decided: no `Schema.TemplateLiteral` was introduced. The brands are the
deliverable; the template-literal form for the subject family remains a priced
option, adopted only when a consumer needs to PARSE a subject rather than
construct one. The fixed-length digest's refusal is untouched.

This was ratified before the run and is recorded so the next reviewer does not
re-derive it. Nothing in this sweep created a decomposition consumer.
**Load-bearing? no**

### T8. The type universe grew by eight, and the pins were raised by hand

Decided: the ratchet pins moved `carriage` 29 → 30, `kernel` 9 → 13, and
`planes` 65 → 68; `truth` is unchanged at 36. The raise is a hand edit of
`test/PublicTypeUniverse.inventory.md`, made under the coordinator's explicit
delegation for this dispatch.

The gate refused `--write` until the pins were raised, which is the discipline
working: the eight new rows are `Cell.CellName`, `Subjects.CellName`,
`Wire.Holder`, `Register.Holder`, `Register.WorkKey`, `Register.OutcomeValue`,
`Lane.LaneHandle`, and `FabricClient.StreamName`, each a hand-written type
wearing the unification ticket its owning module already carries. `CellName` and
`Holder` are counted twice because the census quantifies over barrel namespaces
and each is reachable through two — one declaration, two reachable names, and the
ledger says so by naming one owning module for both rows. `ContextProgram`'s
`SegmentName` is not counted, because that module is not exported from the
barrel the census walks.

The classified total moved 182 → 190, and the signature manifest moved by exactly
three lines: the three smart constructors, each carrying only `StructuralRefusal`.
**Load-bearing? yes** — the count is the estate's staged-debt measure.

### T9. One project for the whole family's compile-time wall

Decided: `check:sorts-control` runs ONE project over one mutant carrying eight
planted spellings — one per sort, plus a work key spent where a cell name is
demanded — each with its lawful twin beside it, against one committed trace.

The house pattern is one mutant per project so the compiler reports one error and
not two. The reason behind that pattern is the twin, not the count: what
separates "the unlawful shape is unrepresentable" from "this file does not
compile" is that the lawful spelling keeps compiling in the same project. Eight
twins do that eight times. And the sweep's claim is about the FAMILY — no bare
string survives for ANY canonical value — so a sort that quietly stopped refusing
has to redden this wall, which one trace over the whole family does and seven
near-identical files would only obscure.

The trace names the brand identifiers, so renaming or adding a sort moves it.
That is the intended cost: one deliberate re-recording per change to the family
the fence watches.

Alternatives: eight projects and eight traces (seven copies of one file);
folding the plants into the existing rung control (a different law's arm).
**Load-bearing? yes** — this is the dispatch's stated acceptance.

### T10. Two adapter schemas suspend their sorts, for the reason the cell adapter already stated

Decided: `internal/registers.ts` builds its stored-state schema with
`Schema.suspend(() => Holder)` and `Schema.suspend(() => OutcomeValue)`.

`Register.ts` imports the adapter and the adapter now imports the sorts back —
the same public/internal cycle `internal/cells.ts` already carries for
`Observation`, and it bites the same way: a direct reference reads the binding
before the public module has initialized it, which is a module-init
`ReferenceError` and not a type error. The suite caught it, which is the point of
running the battery rather than the typechecker alone. The comment beside it
states the reason in place.

**Load-bearing? yes** — the next sort that reaches an adapter's schema meets the
same cycle.

### T11. One committed trace moved, and it moved for a printed type

Decided: `negative-controls/MatchClosure.envelope-kind.trace.txt` was re-recorded
with `generate:matcher-control`; its sibling refusal-kind trace did not move.

The concurrently landed matcher control commits the compiler's rendering of the
envelope arm record, and that rendering prints `holder`. Branding the field
changed `holder: string` to `holder: string & Brand<...>` inside a diagnostic
whose refusal reason — `Property 'emit' is missing` — is unchanged. Nothing about
what the control refuses moved, and the re-recording is the trace-comparison
discipline behaving as designed rather than a weakening of it.

**Load-bearing? no**

### T12. One test asserts a refusal the brand makes unspellable, and says so

Decided: the session suite's unnamed-holder arm presents `"" as unknown as
Holder` rather than a minted empty holder.

The brand makes an unnamed holder a compile error, which is the sweep working;
the seam's runtime check still exists and is still what the test is about, so the
test presents an ill-typed value through a cast — the same shape the arm directly
above it already used to present a non-digest view. The alternative, deleting the
arm, would have retired a runtime refusal because a compile-time fence now stands
in front of it, and the two fences catch different callers.

**Load-bearing? no**

### T13. A completeness audit closed three gaps the first pass left

Decided: a sweep of the package for missed seams, restated grammars, and
re-validations found three things worth fixing, and they were fixed.

`internal/permissions.ts` carried a character-for-character copy of the
literal-token pattern with no import — exactly the duplicate the "stated once"
rule exists to prevent, and the one that would have made the law this run wrote
a false claim on the day it landed. It now imports `TOKEN_PATTERN`. The subject
and permission FAMILIES beside it keep their own anchored patterns: they compose
tokens with fixed prefixes and wildcards, so they are different grammars that
share an alphabet rather than restatements of one grammar, and the law says so
in those words.

`surface/cli.ts`'s chaos-fold export schema judged a lane handle as
`Schema.String`, and the decoded value is handed straight to `Lane.declare`. It
now decodes as `LaneHandle`, so the boundary that admits an untrusted module
admits its route name under the grammar the lane seam demands, rather than
leaning on a cast further down to re-brand it.

`Session.writ` hand-tested its holder for being a non-empty string — the brand's
own check, restated. It now asks `Schema.is(Holder)`. The refusal is unchanged
in kind, path, and every taught word; what changed is that the law has one
statement. A typed caller cannot reach the branch at all now, which is the point
of the brand, and an untyped one still meets the seam teaching it always did.

**Load-bearing? yes** — the first of the three is what keeps this run's own law
true.

### T14. What this run deliberately did not touch

Four findings are reported rather than fixed, all outside this dispatch.

`ContextProgram.declare` takes `candidate: unknown` and decodes, so the branded
`Segment` and `Selector` shapes constrain a caller who BUILDS a typed program —
which the control exercises — and not a caller who hands `declare` a literal.
That is the module's declared parse boundary, and changing it is the assembly
slice's call, not this sweep's.

`internal/nats.ts` and `internal/substrate.ts` carry `stream: string` and
`name: string` on internal helpers below the `StreamName` seam. They are private
adapter plumbing under a branded public option and were left bare; branding them
would be a second statement of the public sort's grammar with no seam crossing to
justify it.

`internal/permissions.ts`'s `CarrierPermissionScope` carries `evidenceLane`,
`commonsStream`, and `evidenceStreams` as literal tokens where a lane handle and
two stream names are what they hold — the scope is interpolated into
`flb.fab.ev.{lane}.*` and into a stream-info subject, so the values really are
those sorts. The struct is internal and crosses no public seam, so it sits
outside the sweep's stated boundary; it is the strongest remaining candidate if
that boundary is ever widened to the security projection.

`surface/cli.ts` decodes three content addresses in the same chaos-fold export
schema as `Schema.String` rather than as the estate's own `Digest`. That is the
same slip the lane handle beside them had, against a sort this task did not
mint, and it belongs to whoever tightens that boundary next.

## Task: the durable catalog layer, and the fold's checkpoints become its consumer (2026-08-19)

### T1. The inversion runs the ruled way, and the seam does not move

Decided: `CatalogService` gains a second adapter and nothing else. The interface
is unchanged — `get` returning `Option<WireValue>`, `put` returning a `Digest` —
and `Catalog.layerDurable(options)` supplies it from a file-backed, R=1,
non-evicting KV bucket whose keys are digests. `internal/anchors.ts` then
consumes that store for fold state: `ensureState` became `catalog.put` and
`loadState` became `catalog.get` plus the one fact the catalog cannot state,
that an anchor names a state the store does not hold.

The direction was ruled and the reverse was never open. Moving the fold onto the
process-local map would delete the crash-durability its two chaos gates prove,
which is the whole reason the ruling names one direction rather than "unify
them". What the anchor adapter keeps is what is its own: the checkpoint fact,
its parse, and the single-shot revision CAS whose loss is a fatal detach. That
CAS never touched a retry loop before this run and does not now — the three CAS
disciplines stay unentangled, and admitting a value through a store that
reconciles by read-back is not routing an anchor through one, because the value
being admitted is content-addressed and the anchor write is still the one
unretried `update(rev)` it always was.

One adapter was a hypothetical seam. The seam is real now, which is the
deep-module payoff: the module hides the bucket's ruled shape, the key layout,
the idempotent-create mechanics, and the verification, and a caller sees the
same two functions either way.

**Load-bearing? yes**

### T2. Verify-on-read lives at the store seam this adapter owns, and T18 is intact

Decided: the durable adapter admits on `sha256(fetched octets) == D` before
anything decodes, then decodes from those verified bytes with the estate's fatal
constrained decoder, and refuses `digest-mismatch` on disagreement.

That is not a second verify door under `Resolved.resolve`, and the T18 split it
might look like a breach of is unweakened. T18's argument is about the
WRITABILITY OF A CONTROL: a store that polices its own answers cannot be made to
lie by a fixture, so the two stores a resolved reference reads through stay
unverified and a lying layer can be supplied under them. That argument binds the
IN-MEMORY seams — `Catalog.layer` and `Payloads` — because a fixture is the only
way to make them lie. A real backend needs no cooperation at all: its control
flips bytes in the bucket behind the API, which `CatalogDurable.test.ts` does,
and the tampered value is refused rather than served. This is the same
disposition `Blob.ts` already carries in the same words, and the scoped law now
states the distinction rather than leaving it to be inferred.

Two consequences worth writing down. `CatalogService` still promises no
verification: a caller resolving a reference verifies at the one seam whichever
adapter is underneath, and a control can still supply a lying `testLayer` under
`Resolved.resolve` because that layer is a fixture and not this adapter. And the
identity check got STRONGER on the fold's path, not merely relocated — see T3.

**Load-bearing? yes**

### T3. The anchor state read's refusal kind moved, because the check moved to the bytes

Decided: a tampered fold-state entry now refuses `digest-mismatch` (the
catalog's law, path `["catalog", <digest>]`) where it used to refuse
`malformed-anchor-state` (path `["state", <digest>]`). The anchor adapter still
mints `malformed-anchor-state` for everything that is its own: a malformed
checkpoint record, an initial state outside the wire grammar, a committed anchor
whose `stateDigest` disagrees with what the store admitted, and a state the
store does not hold.

The kind moved because the CHECK moved, and it is not the same check. The old
one decoded the entry and re-derived `digestOf(decoded)`, which asks a question
about the value; the estate already ruled that shape a laundering door at the
payload leg of `Resolved.resolve`, because every decoder that repairs its input
answers it for byte strings the store was never given — a member transposition,
an inserted space, a duplicate member resolved last-wins, an undecodable octet
turned into U+FFFD. The catalog asks about the octets, before anything
interprets them. Refusing under the law that actually did the refusing is the
honest rendering, and dressing the catalog's refusal back up in the anchor's
kind would be re-teaching a law that no longer fired.

No suite asserted the retired arm; the taught-payload pin carries the anchor's
kinds unchanged and gained the catalog's three.

**Load-bearing? yes**

### T4. The duplicate-create reconcile's tolerance is named, cited, and walled

Decided: the module law states the tolerance with its upstream citation and the
maintainers' disposition, and an executed runtime control kills the variant that
drops it.

A create at a digest key that reports wrong-last-sequence is disposed by reading
the key back and comparing bytes. That is not defensive style, and the law says
why: `nats-io/nats-server` issue 5162 — a KV `Create` racing a `Delete` on a
tombstoned key returns a spurious wrong-last-sequence — has been OPEN since
2024-03-02 and is judged on the record to be unfixable under the current
protocol, a project member's "I think this is more a client thing", a
contributor's "I do not think we can improve this scenario at the moment given
current API capabilities", and the reporter's root cause: the JetStream protocol
carries no atomic KV create that avoids the client checking for a delete marker.
So removing the read-back now costs somebody the work of checking whether that
issue closed, which is exactly the price a load-bearing tolerance should carry.

The control is a runtime mutant on the house pattern. `catalogStoreOver(bucket,
disposition)` is the shipped constructor; `reconcileByReadBack` is what ships
and `trustCreateOutcome` is the twin that believes the report, spelled in the
shipped module beside it for the same reason the lattice plane's
last-writer-wins merge is, so the control exercises the real store rather than a
restatement of it. The wall captures a GENUINE server-minted wrong-last-sequence
(held to the pinned wire shape at the same time, so a report that stopped
looking like the one this tolerance is about reddens here) and interposes on the
bucket handle so a create LANDS and then reports it anyway. Under the shipped
disposition the value is admitted; under the twin it is refused — and the trace
records that the refused value is one the store is holding, which is the kill.

Why a landed-then-reported create rather than the tombstone race itself: the
client cannot tell the two apart, which is the point. What the store sees in
both is a report about a sequence number and a key whose bytes settle the
question, and the interposed schedule is the deterministic one.

**Load-bearing? yes**

### T5. One refusal kind was added to the vocabulary, the long way

Decided: `catalog-substrate-shape` joins the runtime refusal roster with its
standing meaning, and the carrier's shape gate mints it.

The alternative was to reuse a kind. Every candidate was a lie against a
ratified standing meaning — `substrate-shape` names the commons control stream,
`anchor-substrate-shape` names the anchor bucket — and the A-11 fact-1 family
gives each carrier its own kind precisely so a refusal names which carrier
refused. So the roster grew: the reviewed meaning was written into both copies
(the model emitter's and the package's), both generated surfaces and the prose
page were regenerated from the emitter with the digest register, and the
staged-debt pin gained its row by hand. The corpus digest did not move, because
the roster is reviewed data beside the corpus rather than part of it. The
matcher-closure trace was re-recorded, which is the acknowledgement the law
already names: growing the vocabulary costs every existing fold one deliberate
re-recording.

Two kinds were NOT added. Verify-on-read failure and a duplicate create whose
stored bytes differ both refuse `digest-mismatch`, which is the estate's existing
name for exactly that fact and already carries two laws at two seams; bytes that
hash right and do not decode refuse `malformed-value`, as the payload leg does.
The transport absence `catalog-transport-unavailable` needed no roster row —
absence kinds are free strings by construction, and only structural kinds are
the generated union's.

**Load-bearing? yes**

### T6. The carrier gained a role, and the anchor role gained a bucket

Decided: `catalog` is a new carrier role granted the catalog bucket alone, and
the `anchor` role's grant now covers two buckets.

Both fall out of the inversion rather than being scope creep. The anchor carrier
opens the catalog bucket on its own connection — that is what "consumes the
store" means — so a grant covering only the checkpoint bucket would strand every
resume at the first state read, and the writ rows for the fold and session
layers carry the same two-bucket family set the projection grants. The durable
layer's own acquire site is a tenth connection the spine opens, and the writ
table is total over acquire sites by wall; declaring it with the anchor role
would have over-granted it the checkpoint bucket, and declaring it with the
least writ would have been false about a connection that plainly publishes to
`$KV`. So it got a role of its own, whose grant is exactly what it uses.

**Load-bearing? yes**

### T7. The bucket, the key, and where fold state now lives

Decided: `flb-fab-cat`, one retained revision, keys `value.<digest>`.

History is one because a digest names one byte string forever: a second revision
under one address could only be a value that address does not name, so there is
no past to retain and a bucket that retains one is refused. The key prefix is
layout and carries no identity role, exactly as the blob store's fan-out
directory does; the key function is exported for the same reason the anchor
carrier exports its own, so a substrate control reaches behind the API without
guessing the layout.

Fold state moved with it: the `state.<digest>` entries the anchor bucket used to
carry are `value.<digest>` entries in the catalog bucket now. The durability
ordering that matters is unchanged and was never atomic — the state is admitted
before the anchor that names it is written, in that order, across what were
already two separate KV calls.

G36 class line: the catalog as a store is class (b) per venue — a single-writer
CAS-append journal whose values are immutable once admitted. The
create-idempotent-by-comparison write is the append; there is no update path,
no delete path, and no arbitration.

**Load-bearing? yes**

### T8. The incarnation stamp is placed and its pin is deferred

Decided: the module law names where the incarnation stamp goes and argues the
carrier's position, and no pin is built.

The argument is the lattice carrier's, not the register's. The register pins its
incarnation because its fencing tokens ARE bucket revisions, so a token from a
reborn bucket must refuse instead of landing. Nothing here hands out a revision:
`put` returns a digest and `get` takes one, addresses are immutable and
identical across incarnations by construction, and no catalog revision crosses a
call boundary. There is no fence a reborn bucket could dishonor, and what a
destroyed bucket destroys is data, which no pin recovers. The three-bucket
incarnation conversion is what will rule whether that argument becomes a pin or
stays an exemption, and the reading point is the bucket status the shape gate
already takes. Building the pin ahead of that ruling would be machinery nothing
consumes.

**Load-bearing? no**

### T9. The restart arm needed a store the server does not own

Decided: `NatsServerOptions` gained an optional `storeDirectory`, additive and
defaulted off.

Every existing caller is unchanged: with the field omitted a server still mints
its own store under its own run directory and takes it away on stop, which is
the row isolation seam rule 7 binds. Supplying one asks the opposite question —
whether what a server admitted is still there once that server is gone — which
needs the store to outlive the process that wrote it. The RUN directory stays
per-server either way, deliberately: sharing it would leave a dead server's
ports file for the next one to read, and the restart arm would silently measure
the wrong server. The fold's two chaos gates ran unchanged afterwards, which is
the check that the additive edit was additive.

What that arm claims is stated where it runs: the value outlives the server that
admitted it. It is not a power-durability claim, which nothing in this estate
makes, and it is not the process-crash claim either — that one is the
substrate's own, proven where the substrate is, with the fold's chaos gates as
its runtime evidence.

**Load-bearing? no**

### T10. The type-universe pin was raised by hand

Decided: the `planes` ratchet pin moved from 68 to 69 for
`Catalog.DurableCatalogOptions`, edited by hand under the coordinator's
delegation for this ticket, and the ledger was regenerated on top of it.

The gate refuses to raise a pin from a regeneration on purpose, so debt growth
is always somebody's deliberate edit. This is that edit, and the row it admits
is the connection-bootstrap options interface the durable layer takes, carrying
the same `DEV-795` plane-declaration unification target its four neighbours in
the same module already carry.

**Load-bearing? no**

### T11. What this run deliberately did not touch

Federation, venue authority, blob payload migration, and the object store are
out of scope by the ticket and stay untouched: no venue is contacted, `Payloads`
still answers absence, and no blob moves.

The process-local layer remains `Catalog.layer` and remains the default,
including for every suite that does not name the durable one. The flip is a
deployment act and belongs to whoever makes it, not to this run.

The engine's seeded door-context replica is the durable store's largest
consumer, and rebuilding it after a restart is stated as the consumer's concern
in the restart arm rather than built here. The replica is a monotone lower bound
seeded at layer build; what re-seeds it, and when, is the engine's question.

Two standing reds are not this run's and were not touched: the `StatusPumpWall`
kill and reconnect arms fail on this platform before and after this change.

`internal/permissions.ts`'s `CarrierPermissionScope` still carries lane handles
and stream names as bare literal tokens — the finding the sorts sweep recorded —
and the new `catalog` role's inbox prefix joins them under the same reading.
Widening that boundary is still whoever tightens the security projection next.

**Load-bearing? no**
## Task: the wire vocabulary by transcription — five tables, two languages, one parity wall (estate-daemon, 2026-08-19)

### T1. The pinned vendors, by identity and version, as installed

Decided: the five tables draw on four pinned packages and each row names the one
whose own source declares that row's word. The Go modules are
`github.com/nats-io/nats-server/v2` at `v2.14.4` and `github.com/nats-io/nats.go`
at `v1.53.1`, both linked by the daemon and read out of the toolchain's module
cache. The node packages are `@nats-io/nats-core` and `@nats-io/kv`, both at
`3.4.0`, read out of the spine's own install; the wall checks the installed
version against the pin before digesting anything, so a checkout that installed
something else fails rather than digesting the wrong bytes.

The alternative was one pin for the whole vocabulary. It was refused because
half the surface is what a substrate writes and half is what a client writes,
and a table that pinned both to one package would be citing a package that does
not declare the row. **Load-bearing? yes** — a provenance pin that names the
wrong package is a provenance pin that cannot be checked.

### T2. A row's pin is the party that WRITES the word

Decided: where two pinned packages state a word, the row is pinned at the one
belonging to the party that writes it. The substrate declares what the substrate
sends — the liveness exchange, the acknowledgement, the protocol error, the
declaration block — and the client declares what the client sends — the connect
line, the publish and subscribe forms. The direction column and the pin then
agree by construction rather than by coincidence.

Alternative: pin everything at the substrate, since the daemon owns it. Refused:
the substrate does not state the client's publish or subscribe forms as protocol
constants at all, so half the table would have had no narrowest region.
**Load-bearing? yes.**

### T3. Two rows have no whole-literal declaration, and the choice is recorded

Decided: the message-delivery words are the one pair the pinned sources never
state as a whole literal. The substrate assembles both from a single route-form
constant by dropping or replacing its first byte, and both clients recognise them
character by character in a parse state machine. The narrowest region that states
either row is therefore that constant's own declaration block, and both rows are
pinned there with the derivation recorded in the shape column.

This is the one row-level ambiguity the transcription met. It was decidable, so
it was decided and written down rather than stopped on. **Load-bearing? no** —
the digest is checkable either way; what the record buys is that the next reader
does not re-litigate it.

### T4. Full adoption, with the closure rules stated so completeness is checkable

Decided: each group carries a stated closure rule, so a reader can check that
the table is complete rather than trust that it is.

The API subject group is every constant the pinned substrate declares in its
JetStream API source whose value begins with the API prefix, paired into one row
per operation where the vendor declares both a subscription spelling and a
format spelling — thirty-eight rows — plus the two key-value coordinates the
pinned key-value client declares, which the permission projection addresses and
the substrate declares only as a deny-all family. Forty rows.

The system event group is every constant the pinned substrate declares whose
value is a subject rooted at the system-account prefix followed by a token
separator — thirty-eight rows across three of its source files. The substrate's
own system-account NAME is declared elsewhere and is not a subject; that
exclusion is a stated closure and not an omission.

The lifecycle group is the ten entry points the estate's own lifecycle contract
names in its vocabulary sentence. The in-process health read appears in that
contract's phase table but not in its vocabulary sentence, so it is not a row: it
is the carriage the readiness row leans on, and a table that quietly grew an
eleventh row would be a table nobody declared. The readiness gate names it as
its own second gate word, spelled there and said so in place.

**Load-bearing? yes** — "transcribed in full" is only a claim if what "full"
means is written down.

### T5. Declared-but-unused is a column, never an omission

Decided: every row the single-server posture never reaches is transcribed and
marked declared-but-unused. Counted from the rendered bytes: seventy-four of the
hundred and eleven — one protocol verb, thirty-two of the forty API subjects,
all thirty-eight system-account subjects, two status events, and one lifecycle
entry. The stream and consumer administration requests, the cluster and account
requests, the auth-callout subject, the clustered assignment results, the
verbose acknowledgement, the cluster-update and force-reconnect statuses, and
the resource-plane enable the declared options value already carries.

Omission was the alternative and it is how a table starts lying: a table that
carried only the reachable rows would read, to the next posture, as a claim that
the others do not exist. **Load-bearing? yes.**

### T6. The provenance is a digest and the region is machinery

Decided: a rendered row carries the vendor package, its version, and the sha256
of the exact source region transcribed — and nothing else. The region's
coordinates live beside the row as the wall's own oracle input and never reach
the rendering, because a rendered surface carries no filesystem path: what a
reader of the table obtains is a name for some bytes, and a name for bytes is
checkable wherever the bytes are.

The digests themselves are DERIVED and committed, not typed: a hundred and ten
hand-copied digests are a hundred and ten chances to copy one wrong, and a vendor
whose declaration MOVED is exactly what a re-derivation catches and a hand-copy
hides. The wall re-derives all of them on every run and diffs against the
committed bytes.

The neighbouring option table renders a file-and-line site instead. That
difference is deliberate and this table is the stricter of the two.
**Load-bearing? yes.**

### T7. The spine's table is a pass-through, never a second reading

Decided: the Go tables are the normative home and the spine's module is EMITTED
from their canonical rendering — same rows, same order, same spelling. It reads
no vendor source of its own.

The alternative is what the option table does: transcribe twice, once per
language, and hold the two byte-equal. That is refused here because a second
reading is a second transcription, and two transcriptions sharing a mistake
agree perfectly — the byte comparison would then be measuring consensus rather
than correctness. With a pass-through, the byte comparison catches an edit and a
staleness, and the oracle for correctness is the vendor's own bytes, read once.
**Load-bearing? yes.**

### T8. Group four ABSORBS the status vocabulary rather than standing beside it

Decided: the eleven status event rows are stated once. The connection-status
module no longer declares them; it projects them out of the wire vocabulary's
status group and keeps the machine it builds over them.

Verdict on the absorption: BYTE-EQUAL. The transcription agrees with the module
that carried the rows before it in every column the module reads — event name,
vendor declaration, payload field names, sorts and optionality, and placement —
and the package's own transcription gate, which reads the pinned client's
declaration file directly and knows nothing about the wire vocabulary, passes
unchanged against the absorbed table while its five negative controls still
refute. No disagreement was found, so no finding is reported.

The alternative was to leave both tables standing and hold them byte-equal by a
wall. Refused: two statements of one table in one language is a twin however
carefully they are kept in step. **Load-bearing? yes.**

### T9. Consumers reach a row by the vendor's identifier, never by its word

Decided: every re-sourced consumer looks a row up by the pinned vendor's own
IDENTIFIER for the declaration — a name in the vendor's source, never a word on
the wire — so the word travels out of the table and never into the query. A
lookup keyed by the wire word would have restated the word to find it, which is
exactly the second statement the footprint sweep refuses.

The emitted spine module carries an index per group, holding references into the
same array rather than copies, so the lookups preserve the literal types a
consumer needs without restating a row. **Load-bearing? yes** — without this the
sweep and the re-sourcing are in direct contradiction.

### T10. The permission projection re-sourced, byte-identical

Decided: the projection reads its four subject coordinates from the table — the
account-information subject, the stream-information template, the
direct-get-last-by-subject template, and the two key-value prefixes — and fills
the vendor's own format spellings rather than writing subjects out with the
deployment's coordinates baked in. A template given the wrong number of
coordinates refuses rather than filling what it can.

The emitted subjects before and after are identical: a diff over the projection's
whole output for one fixed scope is empty. The requirement was that if
byte-identity could not be reached the re-sourcing would be dropped and reported;
it was reached, so it shipped. **Load-bearing? yes** — a changed grant is a
changed security posture, and this slice ruled nothing about grants.

### T11. The writ table stays hand-spelled, and that is an allowance with a reason

Decided: the substrate writ table keeps its own spellings. It is the INDEPENDENT
ORACLE the permission projection is checked against, and its rows are declared
values whose digests session facts already cite. Re-sourcing it from the same
table the projection now reads would make that check compare a value with itself,
and re-spelling its bytes would rename every writ the estate has ever declared.

Two declared allowances carry it, one per subject family it names.
**Load-bearing? yes** — this is the one place where re-sourcing would have made
the estate worse, and saying so is the difference between an allowance and a
convenience.

### T12. Every allowlisted sweep hit, by class

Decided: seventy-one further hits are declared, each as a file-and-word line
standing on one of three stated reason classes. No hit is skipped and an
allowance that stops matching anything fails the arm, so the list cannot rot into
a list of claims nobody checks.

Test oracles — sixty-seven lines across the Go daemon, journal and substrate
suites and the spine's connection, permission, payload, consumer, key-value,
heartbeat and session suites. A test states its own expectation; re-sourcing it
from the table under test would make the assertion agree with the table by
construction and delete the independent oracle the transcription is checked
against.

Homonyms — three lines, where the literal is an ordinary word the estate uses for
a purpose of its own (the schema library's excess-property setting, a diagnostic
severity) that happens to spell one of the eleven status discriminants. The
sweep reads text and cannot tell the two apart.

The connect-option name — one line, where the pinned client's own CONNECT option
happens to spell the reconnect status discriminant. The connect-option roster is
its own declared surface with its own provenance; reading it out of the status
group would name an option after an event.

Eight further paths are exempt wholesale as members of the transcription family
— the two tables, their tests, the wall and its controls, the spine's
pass-through, the connection machine built over the absorbed rows, and the
wall's TypeScript half. **Load-bearing? yes.**

### T13. Three consumers re-sourced in the daemon package

Decided: the greeting operation, the lame-duck event name, and the readiness
gate name are read from the tables instead of spelled again, and a test holds
each consumer to the row it now reads. Their own comments already said the words
were the vendor's and that the estate's table already transcribed them; now that
is true mechanically rather than by assertion.

**Load-bearing? no** individually; **yes** as a set, because the footprint arm is
only a wall if the estate passes it without exceptions written for its own
convenience.

### T14. What this slice does NOT do

The corpus grows no substrate-vocabulary emitter group. Every table here is
hand-carried transcription wearing the waiver that names the owed group by name:
the **substrate-vocabulary emitter group**, which the corpus provably does not
mint today — no generator emits a protocol verb, an API subject, a system event
subject, a status event type, or a lifecycle entry. Growing it is the second half
of this walk and belongs to whoever is dispatched for it. Until then the tables
are transcription with provenance, never a twin of one.

Three bounds of the footprint arm are stated where they bite rather than
discovered later: comments are not read, one literal reports one word, and the
arm reads text so it cannot distinguish the vendor's discriminant from an
ordinary word spelled the same — which is why the homonyms are declared
allowances rather than words narrowed out of the vocabulary for every file at
once.

The sweep's reach is stated too: the spine's sources, scripts and tests, and the
whole Go module. The tracer bullet's own protocol is outside it — its words are
its own closed list and its teardown move is not a connection status — and the
canonicalization seam speaks no substrate at all.

## Task: the daemon turns on — one command up, one down, one status (estate-daemon, 2026-08-19)

Placeholders `U1`–`U10` for this task; repository D-numbers are assigned at
merge. The specification is the estate-daemon spec's lifecycle contract and the
substrate-lifecycle ticket as amended by the coordinator on 2026-08-19. Most of
what lands is in the Go module — the lifecycle command and its two walls — and
the entries live here because the daemon track's earlier entries do. What lands
in this package is one declared value on the incarnation vocabulary's reference
side, the harness's readiness affordance, and the shutdown posture's wall.

Nothing below re-opens the round key (`T29`), the incarnation pin (`T39`), or
the closed-channel inventory: all three are consumed exactly as they were ruled.

### U1. Three verbs in one command, and its home is beside the walls

Decided: the lifecycle is one binary with three verbs — up, down, status — in
the Go module's command tree, beside the walls that already spawn substrates.
Go is the only language that can hold the server as a process value, so the
entrypoint has no other home; splitting the verbs into three binaries would
have split the coordination wiring they share three ways, and every one of them
opens the same lanes at the same substrate.

The alternative considered and refused: an entrypoint exported by the daemon
package for a host to embed. That is a library seam, not a command, and the
operator asked for a system that turns on. The package keeps exporting exactly
what it exported before; the command is a consumer of it and adds no verb to
the pinned vendor's lifecycle surface. **Load-bearing? no** — the home is a
choice the specification did not fix, and this entry is the record of taking it.

### U2. The register and the lanes live on a coordination substrate, named as an argument

Decided: every verb takes the address of the substrate the incarnation register
and the two lanes live on, and refuses without one.

This is the fence's own law rather than a deployment convenience. The fence
decides whether a server may exist over a store directory, so it cannot live on
the server whose existence it is deciding — a fence there would need the thing
it is deciding whether to start. The record has the second half of the same
reason: an incarnation's facts outlive the incarnation, and a lane inside the
substrate the lane is about goes away with it. Both walls that came before this
one already run this way, and the shipped command now runs the way the walls
measured.

Alternatives, priced. Bootstrapping a register on the substrate being started:
refused, it is the circularity above wearing a workaround. A file-based fence on
the store directory: refused — it is a second fence beside the one the estate
proved, with none of the register's revision discipline and none of its
incarnation pin. **Load-bearing? yes** — a reader who does not know this reads
the argument as an inconvenience and looks for a way around it.

### U3. The teardown disposition is a fact, and a signal is not

Decided: a running incarnation is asked to retire by a DISPOSITION landed on the
incarnation lane, naming the incarnation and the cause it is to retire under.
`down` lands it; the serving start holds an anchor on that lane and advances on
it, through the lame-duck consumer's own shape.

The alternative is a signal, and it is refused for the reason the estate refuses
every callback on this path: a signal reaches one process once, leaves no
record, cannot be replayed, and cannot be audited by a second reader. The
declared server-options value installs no signal handler and the command
installs none of its own; a process the operating system takes down therefore
lands NOTHING and reads as an unretired incarnation whose lanes went quiet,
which is the honest reading and the one the teardown differential already
measures. That is a consequence worth stating plainly: interrupting the command
at a terminal is the crash path, not the drain path.

The disposition is a separate row from the retirement because it is a separate
fact. A retirement is about an incarnation that has stopped; a disposition is
about the act that asked it to, and it stays true whether or not it was ever
read. Its cause is drawn from the RETIREMENT ROSTER rather than from a
vocabulary of its own, which is what makes asking for a crash unsayable in
exactly the way claiming one is: the roster has no row a crash could enter
under, and one roster walk admits both facts.

The value is declared on this package's side and TRANSCRIBED into the Go daemon,
like every other row of that vocabulary, and the parity wall now compares it —
together with the session-lane teardown fact, which crossed the language
boundary untested until this slice and which the wall now compares at both an
ordinary cause and the empty one. **Load-bearing? yes.**

### U4. The predecessor is read from the register's chain, never from the lane

Decided: a start walks the REGISTER from a store directory's first round to the
first round nobody has decided, and decides there.

Reading the predecessor off the incarnation lane is the obvious thing and it is
wrong, in a way that only bites after a failure. A start that wins its round and
then fails before it can land an established fact has SPENT that round: a landed
outcome never changes, and the lane carries nothing. A lane-derived predecessor
would send the next start back to that spent round and it would be refused
there for good — one failed start, and the store directory can never be started
again. The register walk steps past the spent round to the first one still open,
which is where a decide belongs.

The walk's depth is a stated bound rather than an implicit one: a chain grows by
one per start, and a walk that ran forever over a corrupted register would hang
a start instead of refusing it. **Load-bearing? yes.**

### U5. Readiness is both of the vendor's gates, and the gates are a parameter

Decided: the readiness probe performs the vendor's readiness gate and then the
vendor's in-process health read with JetStream enablement requested, lands one
observation per gate whichever way each went, and admits only on both. A bound
port is not readiness and is never read as one.

The pair of gates is an INTERFACE for the same reason the closed-channel
inventory is a parameter: a gate that cannot be executed against an unready
substrate is a gate nobody has measured. The committed refutation drives the
same probe over a real vendor server whose JetStream has been taken down by the
vendor's own verb — the shipped probe refuses it, the mutant reading (a bound
listener, which is exactly what a ports-file wait observes) admits it, and a
JetStream round trip taken once with no retry answers on the healthy substrate
and fails on the other.

**A bound of the vendor's probe, found while measuring it and stated here rather
than discovered later.** With JetStream enablement requested, the health read
returns healthy when the server's options never asked for JetStream at all: the
vendor stops before the JetStream check when the option is off. So the probe
says "JetStream is up if this server was configured for it", not "JetStream is
up". The estate's declared value asks for it, and the option is a declared row
the citation pins, so the gap is closed by the declaration rather than by the
probe — but a caller that read this probe over an arbitrary server would be
reading a weaker sentence than it looks like. **Load-bearing? yes.**

### U6. The status read probes nothing, says no liveness word, and reports staleness as a number

Decided: status folds the incarnation lane and reports established-at-position,
retired-with-cause, and one positional staleness number. It opens no connection
to any substrate but the coordination one it reads from.

The staleness is the lane's head minus the greatest position at which the lane
names an incarnation — how many positions have landed since it last appeared —
and it is handed over as a number with no tolerance applied and no verdict
attached. An incarnation the lane never names has NO reading rather than a
reading of zero, which is the same distinction the presence read already makes:
the absence of a reading is not a reading of zero.

The succession wall reads the shipped report back for the words a fold cannot
say — live, alive, running, healthy — and fails on any of them, so the surface
cannot grow a liveness answer behind the fold's back. **Load-bearing? yes.**

### U7. The shutdown posture is RULED: the close stays, and its two premises are walled

Decided: the scope-owned connection is released by a CLOSE, not a drain, and
that is now a ruling with a wall rather than a safety by consequence. The two
premises the ruling rests on, named:

**The awaited-request premise.** Every publish and every key-value write on
these paths is a request whose acknowledgement the write's own Effect yields,
so at the instant a scope closes there is no write in flight whose outcome a
caller has been told. The wall executes it at the seam: twelve emissions inside
one scope, the scope closed the instant the last one returned, and a second
party on a connection the closed one never had finds every position an emit
returned carrying the bytes that emit named — and finds nothing beyond the last
one. Beside it, the refutation on the same seam: one write NOT awaited and the
same close, whose acknowledgement the caller never receives.

**The anchor-before-ack premise.** An acknowledgement follows the covering
anchor CAS, so an acknowledgement lost in an undrained close costs a redelivery
the pump absorbs as stale. The wall interrupts a running pump MID-TRANCHE by
closing its own scope and pins both halves from a fresh connection: the
consumer's acknowledgement floor is at or below the anchor floor on every
partition — no unanchored position is acknowledged — and a resumed pump reaches
the state digests an uninterrupted run reaches — no anchored position is lost.
That second premise's committed refutation is the ack-before-anchor mutant the
chaos suite already executes against its own trace: it acknowledges a position
it never anchored and loses it.

The drain was the alternative and it is priced. A drain unsubscribes, waits for
in-flight work, flushes, and only then closes; the release path it would sit on
is a finalizer that must not fail and must not hang, and a drain against a
wedged substrate is an unbounded wait at every scope teardown in the package.
The status pump's source is a generator parked on the connection's own
teardown, so the release ordering that ends it is delicate already and a drain
would put a second wait inside it. The close is bounded, the premises hold, and
they now hold measurably.

**A bound, stated.** These arms take the shutdown at the SCOPE, not at the
process. That is deliberately weaker than the chaos suite's signal 9 — a hard
kill is an undrained close plus everything else the process was holding — so
the two arms measure the close on its own terms rather than inheriting the
kill's evidence. **Load-bearing? yes.**

### U8. The stock-binary harness gains a monitoring listener; the daemon still needs none

Decided: the test harness starts its spawned server with a monitoring listener
on an operating-system-assigned port, reads that address out of the ports file
beside the client address, and waits on the vendor's own health probe with
JetStream enablement requested BEFORE it hands back a URL.

The ports file stays where it was and is not the readiness signal any more: it
is how a spawned binary reports the two addresses it bound, and binding is not
readiness. A caller that receives the URL now receives a substrate whose
JetStream the vendor's own probe has admitted, so nothing downstream races the
JetStream API at startup.

The listener is opened in the harness and NOWHERE else. The estate's daemon
takes the same read in process and opens no monitoring socket at all; the
closed-channel inventory keeps the HTTPS monitoring listener and the profiling
listener shut in both, and neither of those rows moves here. The harness needs
the socket only because the JavaScript client ecosystem is client-only and a
spawned binary offers no in-process surface to read health on. **Load-bearing?
yes** — a reader who finds a monitoring port in the harness and not in the
daemon should find the reason here rather than infer an inconsistency.

### U9. What the daemon's own connection reports when its substrate stops

Decided: the session-ended fact for the daemon's own connection cites the pinned
client's own word for the state that connection had reached when its owner
closed it, read after the stop completed and before the close. Under both
teardowns that word is the client's reconnecting state, because the daemon's
connection carries the client's own reconnect posture and its substrate went
away underneath it.

It is an honest reading and it is not the tidy one. The alternative — closing
the connection first and citing the state closing puts every connection in —
would report the same word for every teardown and for every cause, which is
exactly the distinguishability the ended fact's cause field exists to carry.
Giving the daemon's own connection a no-reconnect posture would change the word,
and it would also change the connect-options declaration the session fact pins,
which is a wider act than this slice has a ruling for. **Load-bearing? no** —
recorded so the word in the record is not read as a defect.

### U10. What this slice does NOT do

The double-start hazard is FENCED for concurrency and not for liveness, and that
was already the bound. Two starts racing at one open round are decided by the
register and exactly one proceeds. A start run while an earlier incarnation is
still serving walks past that incarnation's landed round to the next open one
and wins it, because the record cannot tell a serving incarnation from a dead
one — crash is not a fact, and refusing to succeed an unretired incarnation
would make recovery after a crash impossible without forging one. What stops the
second server is carriage: it fails to bind the address the declared value
names. The register walk keeps that failure from wedging the chain, because the
spent round is walked past; it does not make the second start impossible, and
nothing here claims it does.

Neither wall claims a bound on how long a drain takes. The vendor spreads client
closes over its own duration, that duration is a declared option nobody has
ruled, and the succession arm measures a chain rather than a schedule.

The corpus grows no substrate-vocabulary emitter group. The disposition joins
the same hand-carried transcription the rest of the incarnation vocabulary
wears, under the same waiver naming the same owed group.

## Task: the connection machine becomes observable — per-session state as a fold, served live (2026-08-19)

### T0. The fold lives beside presence, and grew no public face

Decided: `src/internal/connectionfold.ts`, plane `internal`, seam `planes`, with
no barrel export and no entry in the package's exports map.

The seam tag is the rank the module actually holds: it reaches the
positioned-carrier vocabulary the plane's readers speak and mints nothing below
it, which is exactly where `presence.ts` sits and for the same reason.
Alternatives: a public plane module beside `Session.ts`, or a truth-seam module.
The truth seam is unavailable — the positioned carrier ranks at the plane seam
and a truth-seam module importing it would invert the ladder. The public face
was refused for now on the evidence rather than on taste: presence and staleness
are the two sibling reads over these same lanes, both have lived entirely under
`internal/` since they landed, and no consumer outside this package exists for
any of the three. Growing the public type universe ahead of a consumer would
raise a ratchet pin for a surface nobody imports; the signature manifest was
regenerated and did not move, which is the mechanical statement of that.
**Load-bearing? yes** — where a read lives decides who may depend on it, and
adding the face later is an ordinary export whereas removing one is a public
break.

### T1. The initial state is the absence this runtime already spells, never the model's word for it

Decided: the fold's initial position is `null`, and the correspondence to the
substrate model's initial state is stated in prose rather than transcribed as a
name.

The model names its initial state because an inductive type has to name its
constructors; the runtime does not, and the transcription discipline forbids a
state carrying a word the substrate never said. `null` is already this package's
spelling for "established, and no transition observed yet" — the machine table's
own predecessor column uses it, the transition fact's `from` field carries it,
and the pump's position starts there. Alternatives: mint the model's word as a
twelfth name, or add a row to the machine table for it. Both would put a state
into the runtime vocabulary that no transcribed transition enters, which the
vocabulary gate refuses by clause. **Load-bearing? yes** — this is the one place
the model and the runtime disagree about spelling, and writing the
correspondence down is what keeps the disagreement from reading as drift.

### T2. The teardown fact is read back through the row that emits it

Decided: on a session-ended fact the fold takes the word of the machine row
whose emission column names that form, then walks the table with it like any
other word.

The pump lands teardown as the session-ended fact rather than as a transition
fact, because the record already had a form for "this connection is over". A
fold that did not read that fact back through the table would never reach the
terminal from the lane at all. Alternatives: land the terminal state directly
off the absorbing row with no word, or treat the ended fact as no symbol. The
first skips the alphabet check the model's own step performs; the second would
leave every closed connection reading as whatever it was before it closed. A
table placing no such emission is refused rather than assumed, on the same
refusal as an unplaced word. **Load-bearing? yes** — this is the only path from
the lane to the terminal state.

### T3. The drain-disposition fact hands the machine nothing

Decided: the incarnation lame-duck fact contributes no symbol to the connection
machine, and the fold's arm for it says so beside the union's other arms.

That fact is the daemon's report about a server incarnation, minted by the side
that runs the server; it rides the session lane because it cites a session, not
because it is a reading taken from that connection's status source. The client's
own status source reports the same disposition through its own transcribed row,
which the pump already lands as a transition. Alternative: consume it as the
word it carries. That would move one disposition twice — once when the server
said it and once when the client heard it — and the second move would come from
a party that is not the connection. **Load-bearing? yes** — it decides whether a
daemon-side fact can move a client-side machine.

### T4. The twelfth symbol refuses on an existing kind, and the runner-up is named

Decided: an event word the transcription places nowhere refuses with the
existing kind `malformed-value`. No kind was minted.

Its standing meaning is the closest of the forty-five: presented input does not
decode as its declared schema or as one wire value at all, and a decoder that
repairs its input names a different value, so a near miss is refused rather than
coerced. That is exactly this fact — the fold is the decoder from a fact to a
machine symbol, and a fold that held the state on an unknown word would be
repairing its input into a different answer. The runner-up was
`lane-evidence-mismatch`, whose second sentence fits well ("refused rather than
folded into a state that could no longer be attributed") and whose first does
not: it names lane and partition-key addressing, and nothing here is
mis-addressed. Both mint sites — an unplaced word, and a table placing no
terminal emission — go through one object literal, so the teaching is pinned
once. **Load-bearing? yes** — a refusal's kind is persisted evidence and the
wrong one teaches the wrong repair.

### T5. The wall's oracle is the table's own columns, and the bound is stated

Decided: expectations are read off the matched row — the state column, the
placement column, the absorbing column — and never written as names. The three
clause arms (the terminal absorbs, a reading holds, a transition lands where its
own event names) are checked across every position-and-symbol pair, with a
fourth arm proving the three partition that space rather than overlapping on it.

The sequences the fold walks are minted by the pump's own transducer from
constructed status values, so what is folded is the pump's output rather than a
fixture that agrees with it. Stated bound: this is NOT lockstep against the
substrate model's own run function over a generated corpus. What holds the table
itself honest stays where it already is — the transcription gate against the
pinned client's declaration bytes, and the model gate's alphabet arm against the
transcription's canonical rendering. **Load-bearing? yes** — a wall that claimed
the model oracle without executing it would be the overclaim the ledger exists
to prevent.

### T6. No gate was widened; the sweep that already existed is the wall for the no-spelling rule

Decided: the status-vocabulary gate's consumer clause still reads exactly the
pump's source, and the new module and its suite were NOT added to it.

The wire vocabulary's own footprint sweep already reads every TypeScript file
under this package's source, script and test trees and refuses a bare literal
equal to any transcribed word — and since a state is named by the transition
that enters it, the seven state names are seven of the eleven words that sweep
already looks for. Adding a second scan over the same files would be a second
statement of one rule. The suite carries its own arm over both sources anyway,
with a planted spelling proving the arm can go red, and neither file needed an
allowance, which the sweep reports as zero unlawful hits. **Load-bearing? no**
individually; **yes** as a rule, because a discipline with two walls drifts at
whichever one is edited first.

### T7. Positions are per-partition, so the fold never sorts and never compares across sessions

Decided: the walk takes the delivered facts in the order the caller read them
and reports each session's own last position; nothing is sorted.

The session lane partitions by the session digest, so one session's facts are
one dense sequence and the order a reader read them in IS oldest-first. Two
sessions' positions come from two sequences and are not comparable at all.
Alternative: sort the input by position for safety. That would interleave up to
eight independent sequences into an order no reader ever saw, and would answer
about a sequence that never existed. **Load-bearing? yes** — it is the reason
the snapshot is keyed by session rather than reduced over one timeline.

### T8. What this slice does NOT do

No public export, no service, no layer, and no arbitration: nothing here
retries, emits, evicts, or decides, and the estate gains no new sentence for
acting on a connection state. No liveness — the answer is the last state the
facts support and carries no age, and the staleness read stays the heartbeat
lane's. No corpus growth: the machine tables remain hand-carried transcription
under the standing staged-debt waiver, and this slice mints no generated
artifact. No lockstep model oracle, and no refinement map between this fold and
the substrate model's run function — the model gate proves the machine, this
suite executes a walk over it, and neither is claimed to be the other.

## Task: three findings from the connection-fold landing — the presence fold, the emission singleton, and the lame-duck twin (2026-08-19)

Three small findings raised by the connection-fold landing (DEV-890, DEV-891,
DEV-892), worked as one batch. All three preserve behaviour: no refusal kind
moved, no law text moved, and no served byte moved. That the presence fold and
the ternary chain it replaced agree was MEASURED rather than argued — run side
by side over one fact of every variant the lane declares, the two produce
identical values in all fifteen cases.

Exactly two gate lines moved across the two pure batteries, and both are named
below: the status-vocabulary control count in the type battery, which the one
new planted control raises from five to six, and the layering edge count in the
fast battery, which the one new import raises from 320 to 321. Every other gate
line in both, the four presence controls included, is byte-identical before and
after, and the fast suite reports the same 575 tests passing — the only other
tally that moved is its assertion count, by the two the promoted arm no longer
writes out by hand.

The wall battery is not byte-comparable and was not treated as if it were. Its
measurement lines carry counts a wall clock decides and digests a freshly named
server feeds: two runs of the presence wall over one unchanged tree report two
different state digests, and the chaos and shutdown rows move their counts every
run. What is compared there is the verdict — ninety-two passing, with the two
kill-and-reconnect arms of the status-pump wall failing on this platform before
and after, the same two.

### T0. The presence contribution folds through the pin's discriminator matcher

Decided: `internal/presence.ts`'s `presenceContribution.apply` is
`Match.type<SessionFact>()` piped through `Match.withReturnType<PresenceState>()`
and `Match.discriminatorsExhaustive("kind")`, one arm per declared variant, with
no default and no fallthrough. Alternatives: leave the ternary chain; use a
mapped arm record keyed by the kind literal.

Why the discriminator matcher and not the arm record: the scoped law splits the
two by the shape of the union. `SessionFact` is a union of tagged OBJECT types,
which is where the pin's matcher belongs and where the sibling connection fold
already uses it; the arm record is for one type whose field carries many
literals, and the matcher would narrow every arm of such a union to the empty
type. Same discipline, two shapes, two spellings.

`withReturnType` is what makes the arms load-bearing rather than merely present.
Without it the arms infer `v: number` and `kind: string` and the shape is caught
only at the assignment to `Contribution<SessionFact, PresenceState>`, which names
the record and not the arm; with it, each arm is contextually typed by the state
and a wrong shape is reported where it was written.

**Load-bearing? no** for behaviour — the ternary and the fold agree on every
variant, and the four presence controls print the same four lines before and
after. **Yes** for what it exposed: the ternary's trailing branch was silently
absorbing the fifth variant, and the module's own prose still said "two of the
four session facts" over a five-variant union. The fold turns the fifth into an
arm, and the prose now says five.

### T1. No compile-time control is owed for this fold, and the absence was executed rather than argued

Decided: `check:matcher-control` gains no arm for the presence contribution.

The scoped law owes a compile-time control only where a union can GROW WITHOUT
ANYONE TOUCHING THE FOLD — the corpus-projected vocabularies — because only
there can a variant arrive in a regeneration that edits no call site.
`SessionFact` is a hand-written union declared one module away, so a variant
appended to it is a missing arm the compiler reports at this call site in the
same edit that grew it. The claim was measured rather than asserted: deleting
the drain-disposition arm and running the package typecheck refuses with the
missing key named, and the arm was restored from a byte copy rather than
retyped. **Load-bearing? no** — it records why the absence of a control is
lawful here and would not be lawful over a generated vocabulary.

### T2. The emission singleton becomes gate clause 6, appended rather than inserted

Decided: `checkTerminalEmission` is the status-vocabulary gate's sixth clause
and runs sixth, after the pump clause, rather than being inserted beside clause
4 where it belongs by subject. Alternative: insert it as clause 5 and renumber
the pump clause to 6.

Why appended: the clause numbers are CITED — by the gate's own prose, by the
ticket that raised this, and by this log — and renumbering a clause that did not
change would rot every one of those references to buy an ordering that is a
matter of taste. The run order follows the numbering, so "runs every clause in
order and reports the first that refuses" stays literally true of the code.

What the clause holds: exactly one machine row emits the ended fact, and that
row is the one the machine declares absorbing. Clause 4 already pins the
absorbing row's uniqueness; this clause pins that the row which ENDS is that
row. Both halves are one law — the read side's only path from the lane to the
terminal state. Teardown lands as the session-ended form rather than as a
transition fact, because the record already had a form for "this connection is
over", so a fold walking the lane reaches the terminal only by reading that fact
back through the word of the row whose emission column names it.

**Load-bearing? yes** — the connection fold takes its terminal word out of this
column and refuses when the column does not name exactly one row. Before this
clause, a table edit could have taken the lane's only path to the terminal away
with every gate still green.

### T3. The control plants the singleton half; the other two mutations were measured, not shipped

Decided: the self-test plants one arm — a second row emitting the terminal fact
— which moves the gate's control line from five refuted to six. That line moving
is the whole of this gate's output change; the transcription PASS line is
unmoved, because no count it reports changed.

Two further mutations were executed against the clause before the plant was
chosen, so what the clause refuses is measured rather than argued: zero emitting
rows refuse on the same reason with the count reading zero, and an emission
moved off the absorbing row onto a row that is not absorbing refuses on the
clause's second reason, naming that row. Only the singleton arm is committed,
because the gate's anatomy is one plant per clause and a clause carrying two
plants would read as two clauses. **Load-bearing? no** — it records which half
of the clause the committed control exercises, and that the other half's refusal
was executed rather than assumed.

### T4. The suite arm executes the clause instead of restating it

Decided: the connection-fold suite keeps its arm and its name, and the arm now
runs `checkTerminalEmission` over the shipped table and over a planted one
instead of writing the four assertions out by hand.

That is the shape the same file's no-spelling arm already has: it runs the
gate's consumer clause over the fold's source and over a planted source. A suite
that wrote the property out a second time beside the gate would be the twin the
vocabulary discipline refuses, and the second statement would agree perfectly
with the first on the day the first was wrong. The arm keeps its red-on-plant
half, so the pass is evidence rather than a call to a function that might always
answer yes. The suite's test count does not move and its expect count falls by
two. **Load-bearing? no** individually; **yes** as a rule — one statement,
consumed where it is depended on.

### T5. The lame-duck fact's declaration is the schema, and the interface beside it retires

Decided: `IncarnationLameDuck` is declared once, as the `Schema.Struct` in
`internal/sessionfacts.ts`; the structurally identical interface in
`internal/incarnations.ts` is deleted and `lameDuckFact` is typed by the
schema's own `.Type`. Alternative: keep the interface and delete the schema
variant; alternative: keep both and wall them against each other.

Why the schema wins: it is the DECODER, and a decoder is the declaration a
reader is actually held to. It is also the session lane's declared event-form
variant, so the union a fold walks already carries this shape — an interface
beside it could only ever be a second spelling of a shape something else
enforces. Walling the two against each other was the worse of the three: two
statements that agree are still two statements, and the day one is wrong they
agree perfectly.

Nothing about the minted value moved. The function body is untouched, key
insertion order included, so no path — canonical or otherwise — sees different
bytes; the Go-side parity wall mints the same fourteen declared values and
reports every one byte-equal across the language boundary.

One narrowing was given up and is recorded rather than smuggled: the retired
interface typed `event` as the pinned vendor's own literal, and the schema types
it as a string. Narrowing the schema to that literal was refused because it
would move a REFUSAL — a lane fact carrying any other word would start failing
to decode — and this task moves no refusal. The literal still reaches the value
through `LAME_DUCK_EVENT`, which is where the vendor's word travels out of the
transcribed table, and the suite still measures the minted fact's own event
field. **Load-bearing? yes** — one shape, one declaration, one owner is the rule
the vocabulary discipline is made of; the narrowing note is what keeps the
retirement from being reported as free.

### T6. The staged-debt waiver stays; one sentence of it was discharged and says so

Decided: the module's staged-debt note keeps its standing waiver — these
lifecycle declarations are hand-carried and owe the corpus's
substrate-vocabulary group, which the emitter does not yet mint — and loses the
clause that said the lame-duck fact "is not yet a variant of the session lane's
declared event form, so a reader decoding that lane under that form refuses it."

That clause was true when it was written and is not true now: the variant landed
when the session event form learned the fact, and the union the folds walk
carries it. A note describing owed work that is done is worse than no note,
because it sends the next reader to do it again. What replaces it says where the
shape is declared and that this module mints rather than restates it.
**Load-bearing? no** — but a stale waiver is how a discharged debt gets paid
twice.

### T7. The layering edge count moves by one, and that is the change being made

Decided: `internal/incarnations.ts` now imports the fact type from
`internal/sessionfacts.ts`, which the layering gate counts — its pass line reads
321 edges where it read 320.

The edge is lawful in the direction the ladder requires: incarnations carries the
`planes` seam tag and session facts the `truth` tag, so the import points deeper,
and the same edge already exists from the connection fold. Nothing else in either
battery moved: refusal payloads stay at 85 pinned texts, the public effect gate
at 109 emitted signatures, and the type universe at 191 classified types with its
four ratchet pins unchanged — internal modules are not public surface, so
retiring one of their exported types costs the manifest nothing. **Load-bearing?
no** — it records the one count that moved and why, so a reader does not go
looking for a regression.
## Task: first contact — one command mints the opening coordination (estate-daemon stage 2, 2026-08-19)

### T0. The set is content-addressed, and exactly one file carries an ambient name

Decided: each declared value is written at `<project>/.plait/values/<digest>.json`
— the file name IS the SHA-256 of the bytes inside it — and one root,
`<project>/.plait/opening.json`, names the four by digest.

Idempotence then stops being a comparison and becomes a construction: writing the
same value twice writes the same bytes at the same name, and a value whose bytes
moved would land at a name nothing refers to. It is also the estate's own
addressing discipline applied to a directory — a plait item refers to another by
digest, and a walk starts from an explicitly named root. Alternatives: one file
holding the whole set (a value whose bytes change whenever any member changes, so
the set has no stable name for any of its parts), or a set of nickname-named
files (`store.json`, `writ.json`, which is the ambient naming the algebra
refuses). The root has to carry an ambient name because a walk has to start
somewhere; that it is the ONLY one is the property. **Load-bearing? yes** — it is
why "say these sentences again" is safe, and the wall executes it rather than
asserting it.

### T1. The writ minted here is a third writ shape, and that is not a twin

Decided: `AgentWrit` — `{v, kind: "agent-writ", holder, views, tools}` — is a new
declared value, and neither `Session.WritDeclaration` nor `internal/writs.ts`'s
`SubstrateWrit` was changed.

The estate already carries two things called writs because they fence two
different things: the read plane's scopes what a session may image, and the
substrate's records what a connection may do at the substrate. What a party
grants their agent at the LANGUAGE DOOR is a third fence, and it is the value the
door's pinned universe carries as a policy referent — one digest, named in one
registration argument, seeding one catalog. Alternatives considered and refused:
(a) growing `Session.WritDeclaration` with a `tools` field, which moves the
canonical bytes of every writ the read plane has ever minted — a wire change on a
shipped seam, which wants its own ruled ticket; (b) minting the toolset as a
second value beside the read-plane writ, which would make the agent act under two
digests and force the stage-4 guard to look in two places. The views field is the
read plane's own coordinate vocabulary, so a view granted here is the same thing
that seam judges. **Load-bearing? yes** — it decides what the guards slice
enforces against, and it is the one value the registration names.

### T2. The toolset is the served artifact's rows, read through the face that serves them

Decided: the granted toolset is read from `surface/mcp.ts`'s own `servedTools()`,
which parses the committed tool-schema artifact; no tool name is spelled in the
bootstrap, and an empty grant means every served row.

A hand-spelled name would be a twin of the model's emission with nothing holding
the two together — and the twin would be silent, because a writ naming a tool
nobody serves refuses nothing at all. Reading through the serving face rather
than re-parsing the artifact keeps one reader. The empty-grant default is what
makes `plait init --holder <name>` a complete sentence: a party meeting this
estate should not have to enumerate a language to be heard. Tool names stay BARE
strings, joining the list this file already keeps: they are the artifact's own
rows and the artifact is the enumeration, so a brand would be a second statement
of it. **Load-bearing? yes** — served-equals-derived reaches the writ through
this, and the wall compares the writ's tools against the artifact's rows.

### T3. No refusal kind was minted; two existing kinds carry every arm

Decided: a malformed holder, an unserved tool name, a malformed view, an
undialable port and an unreadable registration all refuse with `malformed-value`;
an absent substrate refuses with the spine's own `transport-unavailable`
absence.

`malformed-value`'s standing meaning is "presented bytes do not decode as their
declared schema, or do not decode as one wire value at all", and every structural
arm above is exactly that: the holder sort, the digest sort, the served
enumeration and the dialable-port range are each a declared schema the presented
value failed. The runner-up for the holder was `invalid-session-declaration`,
whose meaning names a SESSION declaration specifically and would have taught a
reader about a seam a first contact has not met. For the absent substrate the
sort matters more than the spelling: it is an ABSENCE, head-relative and
repealable by later evidence, which is what makes "bring one up and say these
sentences again" the honest repair rather than a retry over a permanent fault. A
per-adapter kind (`bootstrap-transport-unavailable`, following the ten that
exist) was the alternative and was refused: the transport module's own design
puts the LAW, the expectation and the repair in per-adapter data, and the estate
gains nothing from an eleventh word for one substrate not answering.
**Load-bearing? yes** — a refusal's kind is persisted evidence, and the wrong one
teaches the wrong repair.

### T4. A filesystem that will not carry the write is a defect, not a refusal

Decided: `makeDirectory` and `writeFile` failures die; only meaning refuses.

The estate ruled it in these words: defects are defects and are not part of the
estate domain language. An unwritable directory is not a sentence about meaning,
there is no ratified kind whose meaning covers it, and minting one would be
exactly the hand-minted kind the vocabulary gate refuses. The common case — a
project directory that does not exist — is refused one layer earlier and by the
right authority: the flag is declared `Flag.directory(..., { mustExist: true })`,
so the CLI library's own parser answers it as the usage error it is. That keeps
the division this surface already holds: the library refuses syntax, the taught
vocabulary refuses law. **Load-bearing? yes** — dressing an environment failure
as a refusal would teach a repair this estate cannot perform.

### T5. The declarations are written before the substrate is probed

Decided: `bootstrap` mints and writes the whole set and the registration, and the
probe runs after; an unanswered substrate then refuses with exit 2 and the
standing line is not printed.

A declaration is a sentence about what a party declares and does not need a
server to be true, so refusing to write it would make the repair loop require
retyping. And the standing line CLAIMS a serving substrate — "your agent can now
speak" — so printing it against nothing would be the warning-dressed-as-a-report
the teaching register exists to avoid. The two halves fit because of T0: the
second run writes the same bytes, so the taught repair can honestly say "say
these sentences again". Alternative: print the digests, then warn. That is a
warning, and the ticket's own words rule it out. **Load-bearing? yes** — it is
the shape of the first failure a practitioner will meet.

### T6. `plait mcp` grew one optional flag, and the seed is the digest alone

Decided: `--writ <digest>`, optional, decoded by the estate's digest schema; when
present the engine layer is seeded with that digest as an already-admitted
`policy` referent, and nothing else about the subcommand moved.

That is the smallest change that makes the registration mean something: the
door's pinned universe is what a declaration's writ is checked against, so a
server started without one can admit no sentence at all. Optional rather than
required because no existing invocation named it and a required flag would break
them; the honest reading of its absence is already the right one, since an
unseeded engine refuses every declare as a forward reference. The seed is the
DIGEST and nothing else — this surface reads no writ file and resolves no writ
value, because a plait item refers to another by digest. **Load-bearing? yes** —
without it the registration points at a server that refuses everything.

### T7. The registration names the program the party just ran

Decided: the `.mcp.json` entry's `command` is the runtime executing this command
and its first argument is this command's own module; everything after is the
product's verb and the digests the opening declared. The file is written through
the one canonicalizer, and exactly one entry is replaced.

A spawn recipe has to name an executable, so one coordinate in this file is
unavoidably a location. Making it the invocation's own is what keeps it from
being a location this surface invented, and it is stable across runs from one
checkout, which is what keeps the registration byte-identical on a second
bootstrap. Canonical JSON is valid JSON, so writing through the estate's one
encoder costs the agent client nothing and buys byte-identity by construction.
Replacing the whole file was refused: a party may have registered other servers,
and taking that decision for them is not this command's to take — an existing
file whose bytes cannot be read at all refuses rather than being overwritten.
**Load-bearing? yes** — it is the only file another program consumes.

### T8. The port is declared, and the dial address is derived from it

Decided: `--addr` and `--port` default to `127.0.0.1` and `4222`, the registered
URL is `nats://<addr>:<port>`, and a port outside 1–65535 refuses.

The bootstrap declares the address it registers, so the two cannot disagree — and
that is why the vendor's own random-port sentinel, which the daemon defaults to,
is not this command's default: a substrate on a port nobody knows yet is a
substrate no registration can point at. Stating the pair once and deriving the
URL is one coordinate instead of two that can drift. **Load-bearing? yes** — the
gate starts a real daemon on the declared port and connects an agent client to
the derived URL.

### T9. The daemon's start posture is transcribed, and the wall is executed

Decided: the posture rows the shipped lifecycle command starts a substrate under
are transcribed in `surface/init.ts`, and the bootstrap gate compares the options
digest and the store digest the bootstrap declared against the ones the real
daemon prints before it binds anything.

The options value must be COMPLETE to have a digest, and the digest is only worth
printing if it names the value the substrate will actually run under — a value
that merely resembled it would be a wrong declaration, which is the failure the
declared-value discipline exists to prevent. A transcription held honest by
inspection would drift; this one is held by an independent oracle in the other
language, running the shipped binary. Measured while writing this: the two
digests agree exactly. **Load-bearing? yes** — it is the difference between a
digest that names the running substrate and a digest that names a guess.

### T10. The probe is a spine acquire site, holding the least writ, named by a literal

Decided: readiness is `acquireConnection` under a new writ-table row whose roles
and families are empty, and the layer name is written at the acquire site as a
string literal.

Every connection this package opens goes through one seam and acts under a
declared writ; a probe is not an exception, and the writ it holds is the honest
one — it publishes nothing and subscribes to nothing, so the estate has declared
no substrate authority for it, and inventing a role would put a word in the
security projection's mouth. The literal is not style: the wall that keeps every
acquire site under a declared writ reads source bytes and matches a QUOTED second
argument, so a name reached through a constant would be a site that fence never
sees. Its two counts moved from nine to ten in the same edit. **Load-bearing?
yes** — a fence with a hole in it is not a fence.

### T11. The bootstrap is not exported from the barrel

Decided: no entry in `src/index.ts` and none in the package exports map; the
signature manifest was regenerated and did not move.

`init.ts` is a CLI verb's implementation, like `cli.ts` itself, and no consumer
outside this package exists for it. Growing the public type universe ahead of a
consumer would raise a ratchet pin for a surface nobody imports, and adding an
export later is ordinary whereas removing one is a public break. **Load-bearing?
no** individually; **yes** as a rule, because the public surface is the one thing
that cannot be quietly narrowed.

### T12. What this slice does NOT do

No authentication and no identity: the holder is attribution, the writ grants
nothing that anything checks, and the printed report says so in one clause rather
than leaving a reader to assume otherwise. No enforcement: nothing refuses a tool
call or a view for being outside the writ, and the guards slice is where that
arrives. One registration format, and it is the project-scoped one; other agent
clients are a stated follow-on row and no shape for them is guessed at here. No
daemon change: the lifecycle command is consumed exactly as it ships, including
its ruling that the incarnation fence lives on a coordination substrate the party
names. No liveness claim: the probe says a substrate answered once, at one
moment, and the standing line says nothing about now.
## Task: the read-side API — the planes served over HTTP, writes stay at the door (2026-08-19)

### T0. The home is `plait api` on the transport spine, not the substrate daemon

Decided: the read face is a subcommand of the `plait` command tree, beside
`plait mcp`, and the substrate daemon does not host it.

Re-derived from the tree rather than assumed. The daemon that landed today is a
Go binary and what it owns is the substrate PROCESS — one server over one store
directory, fenced at the incarnation register. What this face serves is the
PLANES, and every one of those reads is a TypeScript carrier in this package:
the register observe, the cell read, the bounded lane tail, the connection fold.
A read face inside the daemon would have to restate all of them in the daemon's
language, which is the second spelling of a read the estate refuses; a read face
on the spine reaches them by calling them. The spine already carries the
precedent one verb over: `plait mcp` builds its carriers from `--nats` and
launches a served face, and `plait api` is that shape with an HTTP transport
instead of stdio. Alternatives: host it in the daemon (rejected above); ship it
as its own binary (a third entry point for one more face, and the CLI's growth
rule is that a face is a `Command` value appended to the root).
**Load-bearing? yes** — it decides which language the read surface is written in
for every consumer after this one.

### T1. The router, not the schema-first API family, and the reason is law 3

Decided: the face is built on `HttpRouter` from the pinned release's own HTTP
family, and NOT on `HttpApi`/`HttpApiBuilder`.

`HttpApi` is schema-first: an endpoint declares its success SCHEMA, and the
builder encodes the handler's value through that schema and serializes the
result. For this face that would mean writing a second statement of every
payload shape — a `Schema.Struct` twin of the connection reading, the cell
state, the register state, the landed fact — beside the plane values those reads
already return. That is exactly the hand-authored twin standing law 3 refuses
and the extra hand-written public types standing law 1 counts as debt, and it
would buy nothing this face needs: the served bytes must be the estate's RFC
8785 canonical bytes, and a schema-driven JSON serializer does not produce them
(key order alone is not canonical). Routing, path parameters, middleware, the
server, and the streaming response are all the pinned release's, so nothing is
hand-rolled — `HttpApiBuilder` itself compiles down to the same `HttpRouter`
routes this face registers. What the choice gives up is stated: no generated
OpenAPI document and no generated typed client. When a client generator is
wanted, the honest shape is to project it from the same route table this module
already declares as data, not to re-declare the payloads as schemas.
**Load-bearing? yes** — it is the reason the served bytes can be canonical at
all.

### T2. One answer shape: coordinates, and exactly one member carrying the plane read

Decided: every read answers `{ v, kind, <coordinates>, <one member> }`, where
the member holds the plane read's own value verbatim and nothing re-shapes it.

The alternative that looks simpler — answer the plane value alone, with no
envelope — loses the two things a bounded read must say: which bound it was
taken under, and what it is. A reader that cannot tell a short answer from a
clipped one has to guess, and a payload that names itself is the estate's own
idiom for a value that travels (every declared value in this package carries `v`
and `kind`, and the chaos scoreboard on the CLI already renders that way). The
member is verbatim on purpose: the wall compares the member's canonical bytes
against the canonical bytes of the plane read taken directly, so a flattened or
renamed projection reddens. **Load-bearing? yes** — it is what makes
served-equals-derived checkable per endpoint rather than per field.

### T3. A refusal's status is a fold over the two sorts; the router's own misses are a separate clause

Decided: structural → 422, absence → 503. A request the route table does not
carry answers 404 when it names no declared read and 405 when its verb is not a
read, and both still carry a taught structural refusal payload.

The ticket suggested the triple structural=422 / absence=404 / transport=503,
and the estate has no transport SORT — a transport failure is an
`AbsenceRefusal`, which is also what a head-relative absence is — so the triple
collapses to two arms over the two sorts, folded through `Refusal.match` so a
third sort would be a third arm the compiler demands. Which of 404 and 503 the
absence arm takes is the whole decision: 404 says the thing does not exist,
which is a claim about the world an absence refusal explicitly does not make
("absence is head-relative"), while 503 is the one status whose meaning is
"this may succeed later", which is precisely what makes absence the only
retryable class. The router's misses reach no plane read, so their status is not
a sort's projection and says instead why the request was not carried; answering
422 there would tell a caller its request was unprocessable when the truth is
that nothing here answers it. **Load-bearing? yes** — a status is what a UI
branches on before it reads a byte.

### T4. The refusal is rendered by encoding it through its own schema, as the CLI does

Decided: a refusal on this wire is `Refusal`-schema-encoded and then
canonicalized — the CLI's rendering — rather than the seven hand-listed fields
the MCP face writes.

The two faces differ because their wires differ, and the difference is worth
stating rather than smoothing. The MCP face's results travel through the
protocol's own JSON serializer as tool-result objects, so it names the fields it
puts in one; this face's body IS bytes, so it renders the value itself and names
no field at all — which is the stronger form of the same discipline, because a
field added to the refusal vocabulary tomorrow reaches this wire without an edit
here. The rendered fields are a superset by exactly the schema's own `_tag`.
Both derive from the one `Refusal` union, so there is one statement of what a
refusal is and two renderings of it. A fallback rendering exists for the refusal
whose own payload will not canonicalize, for the reason the CLI states: a total
function may not fail, and a rendering that refused to render would lose the
only evidence there is. **Load-bearing? maybe** — the shape is checked by the
canonical round-trip arm, so a drift is caught either way.

### T5. The connection fold needs no plane-level face, and no pin was raised for it

Decided: `surface/api.ts` imports `internal/connectionfold.ts` directly, and
nothing else was built to make that lawful.

Re-derived from the layering wall rather than from the ticket's caution. An
`internal/` module is a plane member by its `Seam:` tag, and the connection fold
declares `Seam: planes`; the one layering rule is that an edge must point at a
plane at or deeper than the importer's own, and surface is the shallowest. So
the edge is lawful as it stands — `check:layering` reports it among 342 edges
all pointing deeper or level. The truth-edge pin binds only truth-plane edges
into `internal/`, so no pin row was owed and none was written. A thin
plane-level face over the fold would have been new public surface, a Law 1
waiver, and a hand-raised type-universe pin bought to satisfy a rule that does
not apply. The fold's own ruling — that it has no public face — is unmoved: it
still has none, and the face that reads it is not a public export of it.
**Load-bearing? yes** — it is the precedent for every later surface that wants
an internal read.

### T6. The lane read is its own service on its own connection, not a verb on `Lanes`

Decided: `LaneReads` is a second service beside `Lanes`, with its own layer and
its own connection, rather than two more methods on the emit service.

The read face must not be able to write, and "must not" is worth spending a
connection on: `Lanes`'s whole surface is `emit`, and its writ grants
`flb.fab.ev.{lane}.*`, so a read that shared that service would carry the emit
right in its context and the publish grant on its connection. Two services means
the API's requirements name three READ services and nothing else, which is the
one-door law read off a signature rather than promised in prose. The cost is one
more connection per process and one more acquire site, and the acquire site is
what forced T10. Alternative: add `tail`/`follow` to `LaneService` (rejected:
it puts the emit door in every reader's context, and it would have broken three
fixture layers into carrying stubs for verbs they never call).
**Load-bearing? yes.**

### T7. The tail's bound is per partition, and a tail never interleaves

Decided: `limit` bounds each partition's own span, and rows come back grouped by
partition, each group in its own position order.

This is the connection fold's ruling read from the other end. Positions are
per-partition coordinates: a declared `(lane, partition)` owns one exact stream
and its dense sequence is the position, so two partitions' positions come from
two sequences and are not comparable at all. A lane-wide limit would have to
divide across those sequences and whichever division it chose would be
arbitrary; a tail sorted by position across partitions would be interleaving
independent sequences into an order no reader ever saw. Every row carries its
partition, so the grouping is legible in the value rather than remembered by the
caller. Bounds: 32 positions by default, 256 at most, per partition.
**Load-bearing? yes** — it is the difference between a coordinate and a number.

### T8. A read acknowledges nothing, checkpoints nothing, and creates nothing durable

Decided: both read faces run on EPHEMERAL ORDERED consumers — ack-none, expiring
on their own inactivity — and neither commits an anchor nor acknowledges a
message.

That is what lets a reader attach beside a deployed fold. The fold's pump owns a
DURABLE consumer, an anchor, and an explicit acknowledgement discipline; a
reader that acquired any of the three would be advancing a frontier some other
party depends on, which is the second write path wearing a read's clothes. The
live face's backpressure is the consumer's own in-flight window: the client asks
for at most that many messages ahead, so a reader that stops pulling stops the
request from being renewed rather than filling memory. **Load-bearing? yes.**

### T9. The incarnation chain is discovered at the fence and walked by the one walk

Decided: `walkChain` was factored into `walkPredecessors` — the walk over the
predecessor relation, which is the only field a chain step reads — and
`chainOf(store)` discovers the relation by reading the incarnation register
forward from the store's first round, then hands it to that same walk.

The alternative was a second walk beside the first, and two walks agreeing about
acyclicity by inspection is exactly the drift the estate refuses; the projection
from a history of whole values onto the predecessor relation is one line, so
`walkChain` keeps its signature and its refusals unchanged and both callers
share one implementation. What is NOT claimed, and it is a real bound: this
reads the chain THE FENCE DECIDED, not the whole incarnation values. A landed
outcome is an incarnation's name, and an incarnation value also carries an
options digest that no register outcome holds, so a history of values cannot be
rebuilt from the register alone — and rebuilding one with a fabricated options
field would be a value whose digest does not match its key, which is a forgery
and not a shortcut. The daemon's own establishment facts DO carry the values,
and they land on the Go-side journal lane rather than on a plait lane, so this
package cannot reach them today; that gap is reported as a finding rather than
papered over. The walk is bounded at 256 chain positions and REFUSES past it
rather than truncating, because a truncated chain read as a whole one would say
a store had fewer incarnations than it has. **Load-bearing? yes.**

### T10. The lane-read layer's writ is the LEAST writ, and the evidence-reader role is owed

Decided: `foldlab-plait-lane-reads` is declared in the substrate writ table with
no roles, no publish families, and no subscribe families.

The writ table is total over the spine's acquire sites, and this slice adds one,
so a row was mandatory — the wall that walks acquire sites out of the source is
what said so, and its site count moved from nine to ten. What the row may NOT do
is borrow the publisher's roles: `evidence-publisher` grants
`flb.fab.ev.{lane}.*`, which is the emit right this whole seam was split to keep
out of a reader's hands. What it SHOULD carry — the evidence streams' info and
the ephemeral ordered consumers a read runs on — is a carrier role the
permission projection does not declare, and minting one here would be an
un-grilled permission vocabulary landing inside an API ticket, touching the
projection, its schema literals, and its daemon-side parity twin. So the row is
the least writ, which the table already carries for two other layers, and it
fails CLOSED: under a credentialed deployment this layer is granted nothing.
Owed work, reported: the evidence-reader role, on its own ruled ticket.
**Load-bearing? yes** — it is a stated hole in the credentialed story, and
naming it is the difference between a bound and a bug.

### T11. Law 10 is walled over the bytes this face actually serves

Decided: the law-10 arm drives every endpoint, collects the payloads it really
put on the wire — answers, both refusal registers, and the change stream's
frames — and runs the estate's own tracking-artifact classes over them, with a
planted id, path, and generation command that must redden it.

The existing sweep reads the committed bytes of four rendered documents, and
this face renders none: its strings become bytes only when a request is
answered. A roster of served strings kept beside the module would have been a
hand-maintained twin of what the handlers actually say — the drift the law is
about. Sweeping the module's own source is not available either: an import
specifier is a filesystem path by that sweep's own definition, so every module
in the tree would fail it. Driving the face and sweeping the output is the read
that matches the law's words: an OFFICIAL SURFACE is what a reader receives. No
by-name exclusion is live on this surface, so none is passed — excusing a token
nothing serves would be a standing licence nothing relies on.

Its bound is stated rather than discovered later: the sweep covers the strings
this face COMPOSES. A route miss quotes the caller's own presented request line
as `got`, exactly as `got` quotes presented input everywhere else in this estate,
and a caller may present whatever it likes. What the estate ITSELF renders there
was narrowed instead — the quoted line carries the path and NOT the origin it was
asked at, because a host and a port are one deployment's coordinates and would be
an ambient reference the estate had rendered rather than quoted.
**Load-bearing? yes.**

### T12. The type-universe pin was raised by hand

Recorded: the `planes` ratchet pin moved from 69 to 75, by hand, under the
coordinator's dispatch of this ticket. The six rows are the read seam's —
`LandedFact`, `TailOptions`, `FollowOptions`, `LaneReadOptions`,
`LaneReadService`, `LaneReads` — each a Law 1 waiver citing the standing plane
unification ticket, exactly as the rest of that module's types do. The
`carriage` pin did not move: the read face exports three values and no type at
all, so the surface plane grew no public type.

### T13. What this slice does NOT do

No authentication and no authorization: the holder ruling stands — attribution
is never authority — and this face has no identity story of any kind. Whoever
reaches the listener takes every read on it, which is why the CLI binds loopback
by default and says so. No resume on the change stream, no Last-Event-Id, and no
keepalive frame: the live read is a tail, and a reader that needs history reads
the tail endpoint. No federation, no UI, and no write of any kind.

The walls come in two halves and the split is deliberate. The FACE's laws are
held over fixtures, because a fixture is the only oracle that lets a wall
compare a served payload against the plane read it projects: that the bytes are
the value's own, that a collection is bounded, that the live read is transport
rather than accumulation, that a write verb refuses, and that no served string
carries a tracking artifact. The ADAPTERS' behaviour is held over a real server
instead, because a fixture answers whatever it was given: facts are landed
through the emit path, read back through the bounded tail with their emit
acknowledgement as the oracle, followed live so that a landing after the read
started reaches the reader, and then served through the face over the same
server. A read that agreed with the acknowledgement but disagreed with the
stream fails one arm and passes the other, which is what makes the pair evidence
rather than a round trip through one implementation.

What is still NOT claimed: no performance number, no concurrency envelope, and
no behaviour under a substrate that is reconnecting or draining underneath a
live read — the follow arm measures arrival, not resumption, and the ordered
consumer's own recreate-on-gap is the pinned client's and is not walled here.

### T14. A lane nobody has spoken on reads empty, and the artifact is what said so

Decided: a partition whose stream does not exist answers the empty tail, not a
transport absence.

Found by RUNNING the shipped command against a real substrate rather than by
reading the code: `plait api` on a fresh estate answered `/sessions` with 503 and
`lane-read-transport-unavailable`, because the read asked for a stream the emit
path had not yet declared and the client's stream-not-found error fell into the
adapter's transport classification. The reading was wrong in the way that
matters: it told a reader the substrate was unavailable when what was true is
that nothing had been said yet, so a face serving a fresh estate read as a broken
one on its first request. The emit path is what declares a lane's partition
streams and a READ declares nothing, so the absence of the stream IS the absence
of facts — the same empty tail an empty stream already answered. The arm that
holds it emits nothing at all and asserts a 200 with an empty snapshot, which is
the exact state the run found. **Load-bearing? yes** — it is the difference
between an empty estate and a broken one, on the first request a practitioner
ever makes.

## Task: the run steps land as one fact — the engine's execution log on a lane (2026-08-19)

### T0. The landing is a WRAPPING COMBINATOR, not an option on `Engine.run`

Decided: `RunTrace.runTraced(program, options)` runs the program through the
engine's own `run` and then lands the trace through the engine's own `emit`.
`Engine.ts` is untouched: no new option on `RunOptions`, no new member on
`RunOutcome`, no new method on `EngineService`.

Alternatives: an opt-in `land` option on `run`, which the dispatch offered first;
a `run` variant inside the engine service.

Why the combinator is the least. An option on `run` has to answer for what
happens when the trace's own emit is refused, and both answers are worse than
this one. Failing on the error channel would destroy the run's outcome — the
thing the caller asked for — because a record could not be written, which
inverts what a record is for. Reporting it in the value means growing
`RunOutcome`, and `RunOutcome` is the type the replay wall folds and the type
three arms of the corpus are compared through; every member added there is a
member every existing arm carries. The combinator needs neither: the run's
outcome comes back exactly as the engine answered it, the trace comes back
beside it, and what became of the landing comes back beside both. It is also
the shape the ticket's own words name — a pure consumer, no new vocabulary —
and it leaves the engine's walls green by construction rather than by
re-running them and hoping.

The one thing the combinator gives up is that a caller who wants a trace has to
ask for one. That is the right default: a trace is a fact that costs a judged
emit and a stored message, and a runtime that wrote one for every run whether
or not anybody wanted it would be charging every caller for a record most of
them do not read. **Load-bearing? yes.**

### T1. The vocabulary lives in `internal/`, and the tree decided it

Decided: the declared event form, the fact schema, and the lane declaration are
`src/internal/runtraces.ts` (seam: planes); the projection, the combinator, the
fold, and the read are `src/carriage/RunTrace.ts`.

Re-derived rather than chosen. The read face has to serve this lane — that is
where the read comes from for free — and `Api.test.ts` holds a wall over
`src/surface/api.ts`'s own import specifiers: not one of them may contain
`/carriage/` or name the door. So a lane declaration the face can reach cannot
live in carriage, and the split follows the two lane vocabularies already in
the tree, whose carriage half and vocabulary half are held apart for their own
reasons. What stays in carriage is what needs the engine's own types: the
projection reads `RunOutcome`, so it belongs beside it.

The direction of the edge matters as much as the placement. `runtraces.ts`
reaches nothing in carriage, so the trace module imports it and the read face
imports it and neither imports the other — which is what keeps the write door
out of the read face's graph while both speak about the same lane.
**Load-bearing? yes.**

### T2. ONE fact per run, never one per step

Decided: a run lands exactly one trace fact, whatever its node count.

Why: the live per-step story already exists and is a different register. Every
judgment the engine issues is published on its verdict stream as it happens —
in process, unaddressed, gone when nobody is listening — and that is FLUX,
which the epic's law says is transport. A fact per judgment would put that flux
onto a lane, where the digest of any one row would name a keystroke rather than
a run, and a reader wanting "what did this run do" would have to reassemble it
from rows nothing groups. One fact per run is the meaning half of the same law:
the run as one value, with one digest, reachable by that digest, foldable
whole. Alternatives: a fact per step (rejected above); a fact per step plus a
summary fact (two spellings of one run, and the summary would be a twin).
**Load-bearing? yes.**

### T3. Every unbounded integer travels as its exact decimal, as text

Decided: node names, identity labels, and every atom of an admitted sentence's
canonical encoding are written into the fact as minimal decimal strings.

Why: they are unbounded naturals, and at this runtime an identity label is a
256-bit content address read as an integer. A JSON number holds 2^53 exactly
and no more, so a number would round an identity into a different identity —
silently, and in the one artifact whose whole purpose is to be quotable. The
served tool face already renders the same values the same way for the same
reason, and its comment states it: doubles lose identities. This is a rendering
and not a second canonical form: the fact's own bytes are RFC 8785 over the
rendered value, produced by the one canonicalizer like every other fact.
**Load-bearing? yes.**

### T4. The trace does NOT name the program, and that is a deviation with a reason

Decided: the fact carries the writ, the arm, the stopping node, and the steps.
It does not carry a program digest, which the dispatch's recommended shape
named.

Why, and this is a finding rather than a shortcut. The corpus states in the
declaration's own annotation that a program declaration's canonical bytes ARE
the program's identity, and the committed program vectors show what those bytes
are: identity labels written as JSON NUMBERS. At the model's scale that is
exact, because its labels are small naturals it chose. At this runtime the same
labels are content addresses, and the number that would carry one does not
exist. So the model's identity form is not computable here without loss, and
the only way to name the program in this fact would be to render the
declaration a SECOND way — exact decimals, as the steps are rendered — and
digest that. That would be a second identity for a concept the corpus already
names, which is the first standing law's defect exactly, and it would be a
particularly bad one: two digests would circulate for one program, and a reader
could not tell which one a field held.

What is lost is grouping: a reader cannot ask "every run of this program"
without reading the steps. What is kept is that no field of this fact means two
things. The follow-on is named rather than forgotten — when the two identity
scales get their stated map for declarations, the trace gains the name in that
edit and its route moves visibly, because the route is the digest of the
declared form. Alternatives: render a second form and digest it (rejected
above); carry a caller-supplied program address, which would be attribution a
caller can make say anything, on a field readers would take for identity.
**Load-bearing? yes.**

### T5. Three arms, one `kind`, discriminated by the outcome word

Decided: the fact is a union of three structs that all carry
`kind: "engine-run-trace"` and differ in `outcome`, each with the members its
own arm has: the landed arm's terminal landing, the refused arm's node and
taught row, the unspeakable arm's node, slot and detail.

Why: it is the model's own spelling of the same thing. `KernelRunOutcome` is a
union discriminated by an `outcome` literal with per-arm members, and mirroring
it means a reader who knows one knows the other. It also keeps every arm's key
set honest — a landed run has no node to name and no row to carry, and a struct
with five nullable members would let a producer emit an arm shaped like another
one. The declared event form carries the three field lists, and a wall compares
each landed arm's key set against them, so a member added to the projection
without moving the route reddens.

The field is `outcome` and not `verdict`, deliberately: the door's containment
wall reads source bytes for a `verdict` property assigned a string literal,
because that is what constructing an admission verdict outside the one door
looks like. This fact reports which arm a run ended on and constructs no
verdict; using the model's own word for the arm keeps it that way in the bytes
as well as in the meaning. **Load-bearing? yes.**

### T6. What became of the landing is its own three-armed fold, over two registers

Decided: `TracedRun` carries the outcome, the trace, and a `TraceLanding` with
three arms — `carried` with the emission acknowledgement, `refused` with the
door's taught row, and `unlanded` with the estate refusal.

Why three rather than two. The door refusing a sentence and a seam refusing a
carriage are different facts with different repairs, and the served tool face
already rules that the two registers never dress as each other. Merging them
would leave a reader unable to tell "the language says no to this emit" from
"the substrate is not answering". Why the seam refusal is caught at all: a
trace is ancillary evidence, and losing a run's own answer because the record
could not be written would be the tail wagging the dog — the run happened, and
the caller asked about the run.

The fold is `Match.tagsExhaustive`, which is the pin's matcher and the right
one here because this is a union of tagged object types. It is owed no
compile-time control by the estate's own rule: a control is owed where a union
can grow without anyone touching the fold, which is the corpus-projected
vocabularies, and this union is declared in the module that folds it — the
compiler reports every call site in the same edit that grows it. The three arm
types are private `Extract`s of the union, exactly as the engine's own outcome
arms are, so the fold's signature names them without three more public types.
**Load-bearing? yes.**

### T7. The lane is keyed by the writ, at eight partitions

Decided: `partitionKey: { path: ["writ"] }`, eight declared partitions.

Why the writ: it is the coordinate a run acts under and the one a reader groups
by, and a partition is the unit that has an order — so keying by the writ means
one policy's runs land in one sequence and their positions are comparable,
while two writs' positions come from two sequences and are not. Keying by the
run would put every run in its own partition-of-one and make the lane's order
meaningless. Why eight rather than one: one partition would serialize every
writ's traces into one stream for an ordering nobody asked for, and eight is
the declared fan-out the estate's other keyed lane already uses. The number
never affects a single writ's order — its traces share a partition however many
there are — so it is a spread choice and nothing else. The substrate wall
measures the claim rather than restating it: two runs under one writ land on
one partition at consecutive positions. **Load-bearing? yes.**

### T8. The read is the lane read seam's, and `/runs/:writ` is the follow-on

Decided: `RunTrace.traces` is a bounded tail through `LaneReads` and nothing
else, and the run-trace lane joins the read face's served lane roster so
`/lanes/:handle` answers it. No new endpoint ships.

Why no second read dialect: the bounded ack-none tail already exists, is
walled, and is the only read on a lane the estate has. Adding one here would be
the pump built beside itself.

Why no `/runs/:writ`. The face's own law is that a bounded collection REPORTS
the bound it was admitted under, so a reader can tell a short answer from a
clipped one. A writ-scoped endpoint would have to read a partition and then
filter it, and the bound it could report would name positions READ rather than
rows ANSWERED — a number that means something different from the same field on
every other endpoint. Making it honest needs a partition selected from the writ
without deriving one, and the only site that turns a key into a partition is
the lane's own, pinned as routing. So the honest cheap thing is what shipped:
the lane joins the roster, `/lanes/:handle` serves its bounded tail with the
same discipline as every other lane, and a reader that wants one writ selects
it from a bounded answer whose bound means what it says. The follow-on is a
partition read whose bound is stated in the writ's own terms.
**Load-bearing? yes.**

### T9. The corpus staging moved to a harness, and the replay wall was not touched

Decided: `test/EngineRun.harness.ts` carries the fixture carriers, the corpus
staging, the relabelling, and the supply translation. `test/EngineReplay.test.ts`
keeps its own copy and was not edited.

Why: the trace wall executes the same five run vectors the replay wall does,
and both need every referent a vector's door names declared as a real carrier.
Sharing the staging is right; editing a green wall to get there is not — the
replay wall is the fold/replay claim this slice is required to leave standing,
and a mechanical extraction that goes wrong there costs more than the
duplication saves. The duplication is a stated finding, not an accident: folding
the replay wall onto this harness is a follow-on edit whose whole diff is
imports, and it belongs in a change that is allowed to touch it.
**Load-bearing? no** — it is a test-tree arrangement.

### T10. The type-universe pin was raised by hand

Recorded: the `carriage` ratchet pin moved from 30 to 37, by hand, under the
coordinator's dispatch of this ticket. The seven rows are this slice's:
`RunTraceFact`, `RunTraceLanding`, `RunTraceRow` and `RunTraceStep` from the
vocabulary module, and `TraceLanding`, `TraceOptions` and `TracedRun` from the
carriage module — each a Law 1 waiver citing the standing candidate-form
unification ticket, exactly as the rest of that plane's types do. The three arm
types of the landing fold are private `Extract`s and cost no row. The `planes`,
`kernel` and `truth` pins did not move.

### T11. What this slice does NOT do

No trace for a run that refuses on the SEAM. The three arms are the OUTCOME's,
and a run whose error channel fires never produced one — there is nothing to
project. That refusal reaches the caller unchanged, and with it goes the prefix
the outcome arms would have kept: the engine discards steps when it fails on
the error channel, which is the same divergence the unspeakable arm closed for
completions and has not been closed for carriage. It is stated here as a
finding rather than repaired, because changing what the engine's error channel
carries is an engine ruling with its own ticket.

No trace for a run that dies mid-walk. The fact is written after the walk
reaches an outcome, so a process that is killed halfway leaves nothing on the
lane. What exists for a run in progress is the verdict stream, which is flux
and is not durable — a durable in-progress journal would be the per-step
landing this slice's own law refuses.

No bound on trace size beyond the carrier's. A run with enough nodes to exceed
the inline payload budget refuses at the emit and is reported on the seam arm;
nothing truncates a trace, because a truncated trace read as a whole one would
understate a run exactly as a truncated chain understates a history.

No writ-scoped read, no program name, and no replay executor. The first two are
T8 and T4. The third is the doctrine's other half stated but not built: the
fact carries every admitted sentence's encoding and every landing's identity,
which is what a replay needs, and the reader that walks one is its own slice.
