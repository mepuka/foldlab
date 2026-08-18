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

### T2. Containment has a runtime gate and a planted spelling

Decided: `check:refusal-vocabulary` requires the runtime schema tuple to be the
generated projection, requires every runtime kind to occur in the generated
vocabulary, and checks every staged row's `DEV-804` owner. Its committed
negative control appends `hand-minted-refusal` and must fail for the named
missing-generated-row reason. Alternatives: rely on TypeScript assignment
alone (does not prove the subset at runtime and cannot demonstrate the wall
failing); compare only counts (equal cardinality admits a substituted kind).
Why: member-wise containment is the stated invariant, and a planted outsider
proves the gate watches that invariant. **Load-bearing? yes** — the generated
table is only authoritative if a runtime spelling outside it is refused.
