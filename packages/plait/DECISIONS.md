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

### T18. Derive fold steps and run generated ACI cases before branding

Decided: `Fold.declare` accepts only a per-event contribution and derives
`step(state,event) = algebra.combine(state, contribution.apply(event))`.
`Algebra.commutative` is an Effect operation that requires at least 32 generated
triples and runs left identity, right identity, associativity, and commutativity
before attaching its private runtime witness. `Fold.declare` requires that
witness at the type door and checks it again at runtime when partitions exceed
one. Alternatives: accept an independent step and property-test compatibility;
expose an assertion-style brand; rely on TypeScript alone. Why: derivation makes
the step/algebra bridge hold by construction, while the runtime witness refuses
casts and failed law suites. **Load-bearing? yes** — this is the F4 license and
its compatibility bridge.

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

**Load-bearing? yes** — these are the mandatory substrate-level F3/F2b walls.

### T22. Consume the eleven E4 rows by exact family name

Decided: the runtime wall pins the seven original E4 rows plus
`resume-then-redeliver`, `ahead-of-ceiling-arrival`, `multi-gap-window`, and
`redeliver-everything-twice-shuffled`. It fixes each finite F2b window count,
replays the TypeScript successor machine, compares the emitted terminal state,
and requires zero missing or skipped rows. It names four exclusions and their
ruled homes: F1/Cell, alphabet admission/slice 0, and both F9/action-plane rows.
Alternatives: select by kind only; silently consume whatever rows exist; copy
the model into TypeScript. Why: exact names and total counts make a model
emission change red at the consumer seam, while exclusions remain sequencing
facts rather than narrowed laws. **Load-bearing? yes** — this is the R0/R1 wall
between the proved model and the unproved runtime.

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
