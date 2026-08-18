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
