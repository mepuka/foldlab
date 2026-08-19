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
