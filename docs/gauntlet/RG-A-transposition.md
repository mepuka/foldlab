# RG-A — The Transposition Demo

COORDINATOR-OWNED. Spec and verifier (`go/gauntlet/transposition.go`,
`go/cmd/transposeverify/`) are frozen: climbers build the fleet that
survives this page, they do not edit it.

## The claim under test

N worker processes over a real out-of-process JetStream explore ONE
search space with massive path reconvergence, using the effector as a
distributed transposition table — and the verifier proves from the
exported bundle that the fleet expanded every distinct state EXACTLY
once (zero surplus, zero missing), discovered them in dependency order,
and left a chained, replayable search record. Content addressing turns
the exponential path tree into the small state DAG; the effector makes
that collapse race-safe fleet-wide; the journal makes the whole search
auditable by recomputation. This is the "expansions = |distinct nodes|,
not |paths|" headline from the AI-inference map (RG-A), demonstrated
rather than asserted.

## Pinned search space (what makes verification exact)

The lattice L(n): states (x, y) with 0 <= x, y <= n; start (0, 0);
moves R -> (x+1, y) and D -> (x, y+1) while in bounds. Every state is
reachable; distinct states = (n+1)^2. The naive path TREE (what a
search without a transposition table walks) has
sum over states of C(x+y, x) nodes — the verifier computes this with
big integers and reports the collapse factor:

    factor = (path-tree nodes) / (physical expansions)

At n = 40 the tree has on the order of 10^23 nodes; the fleet expands
1,681. Honesty: nobody would actually walk the full tree — the factor
quantifies the sharing that content addressing finds automatically; it
is the transposition-table pitch from game search, stated exactly.

Pinned derivations (H = SHA-256 hex of RFC 8785 bytes, as in G1):

    d(x,y) = H({"salt": salt, "x": x, "y": y})    -- the work digest
    r(x,y) = H({"do": d(x,y)})                    -- the expansion result
    payload(x,y) = canonical bytes of
        {"result": r, "state": {"x": x, "y": y}, "worker": w}

An expansion is an effector `Do` on d(x,y): the effect body appends its
ledger line (own file, unique nonce, claim fence) BEFORE returning, as
in G1. The expanding worker then appends the state's payload to the ONE
shared journal (position-CAS; every worker races the same subject —
throughput under contention is part of the hill).

State fold: the map { "x,y": r(x,y) } over all states, digest = H(map).

## The bundle

    manifest.json        canonical, exactly:
                         {"expansions":e,"n":n,"salt":s,
                          "state_digest":h,"workers":w}
    journal.ndjson       wire bytes, verbatim, in order
    registers.ndjson     {"digest":d,"fence":f,"result":r}, digest-sorted
    ledger/<owner>.ndjson one per worker, as in G1
    viz/                 at least one SVG rendering of the state DAG
                         colored by expanding worker (attested, not
                         law-checked; derived from the bundle only)

## Verifier laws (TV1–TV8, enforced by `transposeverify`)

- **TV1 chain**: canonical bytes, contiguous seq, prev-links from
  genesis (as G1's GV1).
- **TV2 semantics**: payloads canonical; states in bounds; d and r
  match the pinned derivations; worker names valid.
- **TV3 completeness**: the journal's states are EXACTLY the (n+1)^2
  lattice states — no repeats, none missing. The search finished and
  the record says so.
- **TV4 frontier order**: every state's in-bounds parents (x-1,y) and
  (x,y-1) appear EARLIER in the journal. Discovery respected the
  dependency order — this is what makes it a search record rather than
  an enumeration dump, and it is the law that forces real frontier
  coordination between workers.
- **TV5 commitment**: registers in bijection with states; results agree
  with the journal; fences >= 1.
- **TV6 economy + fencing**: total ledger lines == expansions ==
  (n+1)^2 — ZERO duplicate physical expansions fleet-wide (no storm in
  this rung, so zero surplus is the law, not a target); no two owners
  share a (digest, fence); every committed fence physically ran; the
  journal's `worker` for each state is the ledger owner of its
  committed fence (the expander appends its own discovery).
- **TV7 participation**: distinct ledger owners == manifest.workers,
  >= 8; every worker expanded >= 5% of states — the fleet searched,
  not one hero with seven spectators. n >= 40.
- **TV8 replay**: the state fold's digest equals manifest.state_digest;
  the verifier reports the collapse factor from its own big-integer
  count.

A pass is `transposeverify` exit 0 on the bundle. In-concert review:
the coordinator watches one live run; ledger/storm truthfulness is
attested here exactly as in G1 (the bundle proves consistency, not
that processes really raced — the observed run is the check).

## Why this rung is a hill and not a chore

Zero surplus under 8 racing processes means the lookup-before-claim
discipline has to be airtight; TV4 means a worker cannot expand ahead
of the recorded frontier, so workers must learn discoveries from the
journal (or Watch as chatter, with the journal as authority) and
contend for the SAME journal positions without duplicating or
deadlocking; TV7 outlaws the degenerate solution where one worker does
everything. The tension between TV6 (never do extra work) and TV7
(everyone works) under a single position-CAS journal is the actual
coordination problem.

## RESULT — PASSED, ratified 2026-08-12 (in-concert review)

Climber's fleet (`go/transfleet`, `go/cmd/transpose`, commit 8f0efb2;
final build SHA-256 59412D3F…94BA per the attempts log) passed.
Coordinator verification, independent: frozen paths byte-untouched;
gates green under coordinator runs; `transposeverify` exit 0 on the
final bundle AND on two fresh coordinator-seeded witness runs; live
process census caught the 10-process fleet (controller + server + 8
workers) at t+200ms — the full 1,681-state search over real
out-of-process JetStream completes in ~2 seconds. Verified headline:
424,784,580,848,791,721,628,839 path-tree nodes served by exactly
1,681 physical expansions (zero surplus, every worker ≥ 210), i.e. a
×2.5e20 collapse found by content addressing and PROVEN from the
exported record. The climber's design took the TDS hash-home route
(static digest-sharded ownership, 211/210 split), moving contention
off the register and onto the shared journal — a legitimate
architecture the prior-art section anticipates; note the consequence:
register steals were never exercised here (fences all 1), so the
racing-claims regime remains covered by G1, not this rung. Their
attempts log includes two self-audits (SVG bytes tested against the
XML claim; frontier discovery strengthened from enumeration to literal
successor derivation) — both the kind of skepticism the protocol
wants. Record visualization published from the bundle during review.

## Prior art (source-read 2026-08-12)

Romein, Bal, Schaeffer, Plaat, "A Performance Analysis of
Transposition-Table-Driven Work Scheduling in Distributed Search,"
IEEE TPDS 13(5), May 2002 (paper read, pp. 447ff) — the closest
ancestor. TDS puts "the transposition table at the heart of the
parallel work scheduling": every generated state is hashed to a HOME
processor and pushed there asynchronously; the home does the lookup
and owns the expansion. Their own words carry both the shared thesis
and the gap: "recognizing that the search space really is a graph,
not a tree," and "*Assuming the table is large enough to cache all
visited states*, TDS guarantees that no redundant search effort is
performed" — a guarantee conditional on memory, holding within one
crash-free run on a reliable network (128-node Myrinet; 1.6–12.9x
over work stealing), leaving no artifact by which anyone could check
it afterward. RG-A's deltas, precisely: durable fenced registers
instead of volatile evictable slots (the "assuming" clause deleted);
crash-tolerant workers (G1's territory) instead of a zero-failure
model; universal content addresses instead of per-run hash
signatures; and the economy claim as a VERIFIED post-hoc law (TV6)
over an exported record instead of an argument about code. The
economics are inverted with the layer: TDS pushes work to the table
because lookups are expensive relative to expansions; we centralize
the table in a consensus substrate because expansions (LLM calls) are
expensive relative to CAS. Their hash-home sharding remains the
sanctioned architecture hint for TV7 work-sharing, with a 24-year
pedigree. (Related: Reinefeld & Marsland 1994, TT for IDA*; Zobrist
1970, per-run hash signatures; Kishimoto, Fukunaga, Botea, HDA*, 2009;
Akagi, Kishimoto, Fukunaga on IDA*+TT correctness pathologies —
pathologies that arise from caching search-CONTROL data, which RG-A
sidesteps by caching only content-addressed facts.)

## Non-goals

No crash storm (G1 owns faults; this rung owns economy and coordination
— a climber may of course reuse G1 infrastructure). No best-first
scoring (a later variant can add pinned scores and priority laws; the
lattice keeps verification exact today). No claims about LLM quality —
the expansion effect is a hash stand-in for an expensive evaluation;
the demo is about the coordination layer, which is provider-agnostic.
