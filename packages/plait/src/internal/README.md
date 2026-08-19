# internal — private adapters

Private adapters serve any layer and reach back only to their own public seam.
This is the machinery no consumer may name: the NATS connection, the exact
stream shape, ordered and durable consumers, the positioned pump with its
bounded successor buffer and explicit ack order, the KV adapters, the one
lattice write path (`cas.ts`'s `casJoinLoop`, shared by every class-(a)
writer), the schema-issue bridge, and the chaos schedules. NATS types stay here;
a `SchemaIssue`-typed signature that escapes diverges the public type walk.

Nothing here is machine-generated, and nothing restates a corpus concept:
`digests.ts` and `refusals.ts` delegate to `truth`, so no first-law debt is due.

Two transcriptions live here and both are DATA with provenance, wearing the
same staged-debt waiver: `substrate.ts` carries the field roster and the connect
options, and `statusvocabulary.ts` carries the connection status vocabulary and
the machine it induces. Neither is a switch statement and neither is a
hand-written union — a table can be byte-compared against the pinned client's
own declaration, and `bun run check:status-vocabulary` does exactly that, with
`check:status-vocabulary-control` planting the five mutations that must redden
it. `statuspump.ts` is the one consumer of one connection's status source,
attached where connections are established, and it branches on no event name;
`sessionfacts.ts` carries the facts it mints and `sessionlanes.ts` the one emit
that lands them.

Three more modules answer the questions those facts make askable.
`heartbeat.ts` declares the schedule as data, mints the tick fact whose
occurrence key is `(session, schedule, firing)`, and holds the seat that turns
firings into facts — every field of a tick is arithmetic over the declaration,
so two emitters of one occurrence mint byte-identical bodies and the second
landing is absorbed rather than counted. `heartbeatlane.ts` is its carriage,
declared at ONE partition because the staleness read is positional and a
positioned read needs a carrier that keeps order. `presence.ts` carries the two
reads: presence as a declared reduction over the session lane, read at the
reader's anchor with head-minus-anchor as the read's own honest staleness, and
staleness as the heartbeat lane's head minus the greatest firing citing one
session. Neither read consults a clock, neither asks the broker anything, and
neither decides: silence is reported as a number, and acting on it is a fenced
decide that lives nowhere in this package. Walls:
`../../test/Heartbeat.test.ts` over constructed facts, with the four planted
controls traced into `../../negative-controls/Presence.*.trace.txt`, and
`../../test/PresenceWall.test.ts` over a real substrate with one holder taken
away by signal 9.

`connectionfold.ts` is the read over the machine those same status facts
describe: per session, walk that session's facts oldest-first through the
transcribed tables and answer with the state they support and the position of
the last one consumed. The transition rule is the substrate model's own —
alphabet first, so a word the table places nowhere refuses instead of being
guessed at; then the terminal absorbs, a reading holds, and a transition lands
in the state its own event names — and no event word or state name is written by
hand here or in the suite, which the wire vocabulary's footprint sweep holds
mechanically. Three faces over one walk: a per-session read, a snapshot of every
session the facts cite, and a stream of the fold's steps with a transitions-only
filter beside it. It reports the last state the facts support and never what is
running now, and it consults no clock at all — the staleness question is
`presence.ts`'s and stays there. Walls: `../../test/ConnectionFold.test.ts`
over sequences the pump's own transducer minted, with the promoted-reading
mutant traced into
`../../negative-controls/ConnectionFold.reading-promoted.trace.txt`, and the
readings arm of `../../test/StatusPumpWall.test.ts` folding a sequence a real
substrate produced.

`incarnations.ts` is the REFERENCE side of the substrate's own lifecycle
vocabulary — the store, the incarnation, the round a start competes at, and the
facts a run leaves: established, lame-duck, retired, and the teardown
disposition an operator lands to ask a running incarnation to retire. The Go
daemon transcribes every one of them and a byte-parity wall across the language
boundary is what makes the transcription honest; this side is the reference, so
a divergence is a defect there. Two of its shapes are load-bearing: the
retirement causes are a two-row roster with no row a crash could enter under, so
a forged retirement and a forged disposition are both unsayable, and the chain
walk refuses a step the history does not carry rather than ending early.

Wall: two of them, and which one runs a suite is derived rather than chosen —
`../../scripts/run-test-group.ts` puts a file in the wall group exactly when it
imports `./NatsHarness.js`. `bun run test:walls` brings up a `nats-server` and
pins what the broker really does (ordered consumers, KV watch semantics, the
object store), with `bun run check:parity-control` refuting a planted field-drop
mutant on `../../negative-controls/SubstrateParity.field-drop.trace.txt`. That
harness hands back a URL only after the pinned vendor's own health probe admits
the substrate with JetStream enablement requested — the ports file says a
listener is bound and says nothing about JetStream — and
`../../test/ShutdownPosture.test.ts` is where the release side of the same
connection is ruled: the scope-owned connection closes undrained, and the two
premises that makes lawful are executed at the seam. The brokerless suites ride
`bun run test:fast` instead, pinning adapter behaviour against constructed
client values: transport defects and pump backpressure.

One level deeper: each module's `@module` header; `../../CONTEXT.md` for the
terms these adapters implement; `../planes/README.md` for the public seams they
serve, which is also the way down to the kernel corpus.
