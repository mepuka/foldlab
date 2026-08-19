# Duplex and liveness — the coalgebra side

Cut from `scratch/research/2026-08-18-algebra-engine-architecture.md`
(§5, §4.6). Use during probes 5–6 (outflows, liveness) and whenever
sessions, subscriptions, views, or "the system must be running" come
up.

## The duality

Ingestion is algebra: folds (catamorphisms) consume the journal, the
door admits, state accretes. This side is proved.

Emission is coalgebra: a consumer is a state plus a step function
producing an observation and a next state; streams are final
coalgebras; subscriptions, watches, views, MCP responses, and UI
projections are all unfolds. JetStream consumers are literally this —
ack floor as coalgebra state.

A live behavior (an agent, a daemon, a view server) pairs the two: it
observes by coalgebra and writes by algebra, and its whole I/O
boundary is typed by those two faces. This is the formal home of
"duplex": streaming in and out, meaning and material — facts in
(door) and bytes in (carrier ingest); views out (folds) and verified
bytes out (serving reads). Both directions are meterable by
measurement folds.

## Sessions

A session is read-plane state: a consumer's position in a stream plus
a writ scoping what it may resolve. Sessions never touch truth — they
are where the coalgebra keeps its place. That is why holding the
transport first-class is safe: it supplies positions and sessions
(read plane) while the CAS supplies equality (truth plane), and
neither can corrupt the other.

## Liveness is observed, never promised

The truth plane needs no liveness — a set is not alive. The system is
alive iff its coalgebras are productive, and aliveness itself obeys
house discipline: heartbeats are emitted facts, so "alive" is a
READER'S fold over recent positions with the reader's own staleness
tolerance. There is no "alive now" sentence, only "productive through
position p."

Interview move: rewrite every liveness claim the user makes into this
form. "The worker must be running" becomes "worker heartbeat facts
advance past position p; consumers of the worker's lane run
staleness-tolerant folds; a stalled position is a trigger condition
(head advances past p is a monotone production), and acting on
prolonged silence is the deadline authority's fenced act." What
cannot be rewritten this way — scheduling fairness, retry pacing,
backpressure — is host engineering: record it in honest bounds.

## The two pipelines, priced per stage

    INGRESS  candidate ─T0 admit─▶ T2 append fact ─▶ [large payload: T3 carrier put + T2 placement fact]
             door-relative checks add one T2 read; indexes maintain themselves at T2 in the background

    EGRESS   query ─T2 resolve name (cacheable)─▶ T1 eval on maintained fold ─▶ T1 verify + serve
             cold path: T3 replay; subscriptions push deltas at T2

## The egress law (pre-registered candidate, stated-only)

The door gives ingress totality: every state change is the image of
an admitted act. The duplex closure is its dual:

> Every outbound byte is the image of an anchored read under a
> declared, writ-scoped fold.

No unlogged output; no view that is not a declaration; no read
outside a writ. A view that would reveal beyond its writ becomes a
refusal, not a breach. One carve-out keeps it honest: host-internal
debug exhaust is carrier plane, non-semantic, and must never be read
by folds — anything semantic must be emitted as facts or it does not
exist. During interviews, an outflow nobody declared is this law's
counterexample: name it in the mapping.
