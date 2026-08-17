# DEV-712 partition-position audit

Date: 2026-08-17  
Scope: research only, before E4 starts  
Issue read: `multica issue get DEV-712 --output json` (no comments existed at
the time of the read)  
Pins exercised: `nats-server v2.14.4`, `nats.go v1.53.1`

## Result: FINDING DEV712-POS-1 — stop before implementation

DEV-712's fixed choices do not compose on the merged topology. The issue makes
the fold frontier partition-local, makes `position` the message's JetStream
**stream sequence**, and permits application only at `floor + 1`. The shipped
Plait substrate, however, creates one shared stream covering every evidence
partition (and also fact and node subjects). Stream sequence is a coordinate of
that whole stream, not of a filtered subject. Ordinary interleaving therefore
puts permanent holes in every partition's observed stream-sequence set.

The specified pump does not skip those holes: it **blocks permanently**. If an
implementation skips from one observed stream sequence to the next to recover
liveness, it has stopped implementing `applySuccessors` and no longer has the
stated F2b wall. The issue therefore needs a disposition before E4 machinery is
built. This report stops at the finding and changes no product code, spec,
fixture, model, or ledger. After verification, the minimized finding was posted
to Multica DEV-712 as comment `8b5a2f7b-9c80-462d-9fd4-a08188e13e8e`.

## 1. The minimum legal counterexample

One file-backed stream `S` covers `lane.*`. Two durable pull consumers filter
`lane.A` and `lane.B`. Starting from a fresh floor of zero:

| Publish order | Subject | JetStream stream sequence | Consumer A receives | Consumer B receives |
| ---: | --- | ---: | --- | --- |
| 1 | `lane.A` (`A1`) | 1 | `A1@1` | — |
| 2 | `lane.B` (`B1`) | 2 | — | `B1@2` |
| 3 | `lane.A` (`A2`) | 3 | `A2@3` | — |

- Partition A applies `A1@1`, advances to floor 1, and then waits for position
  2. Position 2 is B's event and the A filter will never deliver it. `A2@3`
  remains ahead of the frontier forever.
- Partition B sees `B1@2` but, from floor 0, waits for position 1. Position 1
  is A's event and the B filter will never deliver it.
- Seeding a new partition at `firstSeen - 1` does not solve the general case:
  it lets B apply `B1@2`, but the next interleaved A event creates the same
  permanent hole before B's next event.

The missing position cannot arrive later. JetStream assigned it once to a
message outside that consumer's filter, and future publishes receive larger
stream sequences. This is a safety-premise failure under finite, failure-free,
single-node traffic; it does not require redelivery, concurrency, retention,
or a network fault.

The pinned probe reproduces the trace exactly. Its first three publish acks are
`A1@1, B1@2, A2@3`; the full run reports:

```text
UNIQUE partition=A stream_positions=[1 3 5] floor_plus_one=BLOCK floor=1 next_seen=3 missing=2
UNIQUE partition=B stream_positions=[2 4 6] floor_plus_one=BLOCK floor=0 next_seen=2 missing=1
```

Probe source: [reference/dev712-partition-position/probe.go](reference/dev712-partition-position/probe.go)  
Exact command and captured output:
[reference/dev712-partition-position/probe-output.txt](reference/dev712-partition-position/probe-output.txt)

### Pertinence of each measured field

| Datum | Observation | Why it matters to DEV-712 |
| --- | --- | --- |
| stream name/config | one `DEV712` stream, subject `probe.partition.*`, file storage, R=1 | Matches the relevant shared-stream and substrate bounds; rules out separate per-partition streams as an accidental explanation. |
| delivered subject | A and B records retain their actual subjects | Confirms each filtered durable sees only its partition even though both subjects share one stream sequence space. |
| stream sequence | A has 1/3/5; B has 2/4/6 | This is the issue's fixed `position`; it directly falsifies partition-local integer contiguity. |
| consumer sequence | A1 is delivery 1, its redelivery is 2, and A2 is 3 | It is locally dense only over *deliveries*, so a redelivery consumes an ordinal and prevents it from being an event position. |
| delivery count | A1 changes from 1 to 2 after client reattachment and later to 3 | Identifies the duplicate as the same stored event, not a republish; stream sequence stays 1 while delivery metadata changes. |
| durable client reattachment | unacked A1 returns with stream sequence 1 and consumer sequence 2 | Tests the exact redelivery/restart property a candidate partition coordinate must survive. |
| file-backed server restart | recovered events still carry stream sequences 1/3/5 and 2/4/6 | Confirms persistence does not renumber the shared stream into partition ordinals. The abrupt restart also redelivered recent records; no ack-durability conclusion is drawn from that ancillary observation. |

## 2. Plait has one shared stream, not one stream per partition

This was checked rather than assumed.

1. [`FabricClientOptions`](../../packages/plait/src/FabricClient.ts#L9) is
   explicitly the connection bootstrap for **one** file-backed commons stream
   and accepts a single stream name.
2. [`internal/nats.ts`](../../packages/plait/src/internal/nats.ts#L26) defines
   the exact subject set as `flb.fab.ev.*.*`, `flb.fab.fact.*`, and
   `flb.fab.node.*`. [`ensureStream`](../../packages/plait/src/internal/nats.ts#L69)
   creates the single requested stream with that entire set and rejects a
   different subject shape.
3. The binding design's subject grammar puts the partition in the final token
   of `flb.fab.ev.<lane>.<part>`
   ([coordination fabric §6.2](../design/2026-08-17-plait-coordination-fabric.md#62-subject-grammar)).
   The implementation's typed constructor does the same
   ([`Subjects.ts`](../../packages/plait/src/Subjects.ts#L43)).
4. The design calls the commons one shared NATS system and maps an evidence lane
   to a stream with consumers filtered by partition
   ([§6.1–6.3](../design/2026-08-17-plait-coordination-fabric.md#63-the-jetstream-mapping-with-its-real-semantics)).

Consequently this is broader than a two-partition edge case. Traffic for a
different lane, a fact subject, or a node subject can create the same gap even
when a lane declares only one partition, because all are stored in the same
commons stream today.

## 3. JetStream's available coordinates

No metadata exposed by the pinned server/clients is both (a) one stable value
per stored event and (b) a dense ordinal inside a filtered partition.

| Candidate | Pinned meaning and evidence | Verdict |
| --- | --- | --- |
| stream sequence / JS `seq` | `nats.go` calls it the message's stream sequence; `@nats-io` calls it “the sequence number of the message in the stream.” The server puts the stored stream sequence in the ack-reply metadata. ([nats.go message metadata](https://github.com/nats-io/nats.go/blob/db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac/jetstream/message.go#L90-L126), [nats.js `DeliveryInfo`](https://github.com/nats-io/nats.js/blob/95e76e79d9feaa0a0bf3b0e8da526ec5a3460979/jetstream/src/jsapi_types.ts#L1345-L1377), [server delivery](https://github.com/nats-io/nats-server/blob/bbd6dc5e903f3505a1d9a7a21c50e0131901afd7/server/consumer.go#L5350-L5358)) | Stable across redelivery/restart and identifies the stored event, but global to the shared stream and sparse after filtering. This is the measured failure. |
| consumer sequence / JS `deliverySequence` | `nats.go` defines it as the total number of messages a consumer has seen, **including redeliveries**. `@nats-io` parses it independently from stream sequence; the server increments `dseq` for a delivery. ([nats.go](https://github.com/nats-io/nats.go/blob/db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac/jetstream/message.go#L116-L125), [nats.js parser](https://github.com/nats-io/nats.js/blob/95e76e79d9feaa0a0bf3b0e8da526ec5a3460979/jetstream/src/jsmsg.ts#L157-L183), [server increment](https://github.com/nats-io/nats-server/blob/bbd6dc5e903f3505a1d9a7a21c50e0131901afd7/server/consumer.go#L5650-L5680), [wire format](https://docs.nats.io/reference/reference-protocols/nats_api_reference)) | Partition-local for a one-filter consumer but identifies a delivery attempt, not an event. The same A1 used 1 then 2; A2 therefore used 3 rather than event ordinal 2. Consumer recreation/reset would add another lifecycle dependence. |
| delivery count / `redelivered` | Number of times this particular message was delivered; `redelivered` is `deliveryCount > 1`. ([nats.go](https://github.com/nats-io/nats.go/blob/db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac/jetstream/message.go#L93-L101), [nats.js](https://github.com/nats-io/nats.js/blob/95e76e79d9feaa0a0bf3b0e8da526ec5a3460979/jetstream/src/jsmsg.ts#L179-L183)) | Duplicate detector, not an order coordinate. |
| pending count | Count of messages matching the consumer filter that have not yet been delivered. ([nats.go](https://github.com/nats-io/nats.go/blob/db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac/jetstream/message.go#L95-L104)) | Dynamic backlog cardinality, not stable identity or ordinal. |
| consumer `delivered` / `ack_floor` pairs | Aggregate consumer state records both consumer and stream cursors; the ack floor is the highest contiguous acknowledged delivery. ([`@nats-io` declarations](https://github.com/nats-io/nats.js/blob/95e76e79d9feaa0a0bf3b0e8da526ec5a3460979/jetstream/src/jsapi_types.ts#L870-L900)) | Cursor/flow-control state, not per-event partition position; its consumer half has the redelivery problem and its stream half has the filtering-gap problem. |
| subject count in stream info | Stream info can report a map of subjects to current message counts. ([nats.go `StreamState`](https://github.com/nats-io/nats.go/blob/db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac/jetstream/stream_config.go#L268-L286)) | Aggregate mutable state, not attached to a message; limits retention, delete, and purge change it. It cannot reconstruct a stable historical ordinal after restart/redelivery. |
| expected last subject sequence | Publish-time optimistic concurrency checks the **stream sequence** of the last message on a subject. ([nats.go option](https://github.com/nats-io/nats.go/blob/db1375fcffae2eb0b4ced1b7bad4d47c4447e4ac/jetstream/jetstream_options.go#L638-L665), [official headers](https://docs.nats.io/nats-concepts/jetstream/headers)) | A subject-specific predecessor expressed in global stream coordinates, not a dense ordinal, and not ordinary delivery metadata. It could inform a different linked-successor design but does not instantiate `floor + 1`. |
| `Nats-Last-Sequence` | On republish/direct-get responses, the stream sequence of the preceding message with the same subject. ([official headers](https://docs.nats.io/nats-concepts/jetstream/headers#republish-or-direct-get)) | Again a predecessor pointer in sparse global coordinates, available only on those response paths. Not a partition ordinal on the specified durable-pull record. |

The official consumer documentation is consistent with the source: a filter
performs server-side selection before delivery; it does not define a second
stored sequence space ([FilterSubjects](https://docs.nats.io/nats-concepts/jetstream/consumers#filtersubjects)).
The official wire reference exposes only delivered count, stream sequence, and
consumer sequence in the ack subject. None is an unmentioned partition event
counter.

## 4. Exact mapping to the Lean premise

The Lean theorem is internally sound but conditional on a premise the stated
runtime does not establish:

- [`positionTrace`](../../verify/fabric/Fabric/Definitions.lean#L116) assigns
  operations exactly `floor+1, floor+2, …`.
- [`SerialSuccessorSchedule`](../../verify/fabric/Fabric/Definitions.lean#L168)
  requires the in-window support of the raw arrivals to equal that contiguous
  trace.
- [`applySuccessors`](../../verify/fabric/Fabric/Definitions.lean#L148) returns
  immediately at a missing `floor + 1`; it does not ask for the least present
  position or the next filter match.
- [`F2bGuardedExactlyOnce`](../../verify/fabric/Fabric/Laws.lean#L42) proves
  equality with the sequential fold **under**
  `F2bSerialSuccessorPremise`. It does not prove that JetStream supplies the
  premise.

For the A projection of the minimized trace, the positioned operations are
`[(1,A1),(3,A2)]`; the required `positionTrace 0 [A1,A2]` is
`[(1,A1),(2,A2)]`. For B they are `[(2,B1)]` versus required `[(1,B1)]`.
Both fail the support equivalence before the theorem can be invoked.

This is therefore a model/runtime refinement finding, not a gap in the Lean
proof. F4 does not close it: F4 proves a commutative merge over lists of
partition operations, while F2b gives each partition a consecutive positioned
trace. There is no bridge theorem saying that filtering one global JetStream
sequence produces those consecutive per-partition traces.

## 5. Consequence for the stated wall

The landed F2b vectors all presuppose consecutive positions: 11/12 or 5/6,
including the 6-before-5 adversary
([emitter definitions](../../verify/fabric/Fabric/Definitions.lean#L181)). The
F4 `partition-interleaving` vector contains partition operation lists but no
transport positions
([generated corpus](../../packages/plait/fixtures/fabric-conformance.ndjson)).
Replaying those rows can therefore pass while the real shared-stream pump
blocks on legal A/B interleaving.

More precisely:

1. A row-for-row corpus wall establishes correspondence only for inputs that
   already satisfy the model's coordinate premise.
2. The issue's required two-partition real-NATS chaos gate should expose the
   problem as a non-draining/hung run if it publishes onto the merged commons
   stream and the pump implements `floor + 1` literally.
3. Adding `[1,3]` as a *successful* F2b vector is not a sanctioned emitter-only
   extension: it violates `F2bSerialSuccessorPremise` and would require a law or
   coordinate change. By DEV-712's own blocker rule, that must be reported, not
   repaired in the slice.
4. Advancing A's floor directly from 1 to 3 may process both A events, but it is
   a different algorithm. The present model returns at missing position 2, so
   such a runtime would “skip” the model coordinate and the named wall would no
   longer witness its behavior. Whether a next-filter-match algorithm can be
   proved safe under redelivery is a new question, not an executor decision.

No F2b runtime/model correspondence or “crash-indifferent durable fold” claim
is available on the current topology until one of the dispositions below is
ratified and walled.

## 6. Exact disposition choices (not edits)

1. **Keep the Lean law and make the transport coordinate contiguous.** Give
   each F2b successor domain its own JetStream stream (at least one stream per
   lane-partition, with no unrelated subjects) and continue using stream
   sequence as position. Required bound: deletion, purge, limits eviction, or a
   non-one starting sequence may not create an unaccounted gap above an anchor;
   lag beyond retained history must refuse rather than wait forever. This is a
   topology/spec change from the merged one-commons-stream shape.
2. **Keep the shared stream and add an application-owned partition ordinal.**
   Put a stable partition-local ordinal (or equivalent predecessor link) in the
   admitted event and use that as the model position; retain stream sequence as
   the transport locator. Required obligations: serialize allocation per
   partition, prove uniqueness and gaplessness or explicit refusal, bind the
   coordinate into event identity, and test crash/retry conflicts. This changes
   the wire/declaration surface and needs a new independent wall.
3. **Generalize the model to sparse successors.** Replace integer `floor + 1`
   with a proved next relation over a partition trace, plausibly an explicit
   predecessor chain in global stream-sequence space. Required obligations:
   prove the pump cannot advance past an unseen earlier partition event under
   redelivery/restart and regenerate the corpus from the changed model. This is
   a law-level change and is outside DEV-712's sanctioned `verify/fabric`
   writes.
4. **Hold E4 durable deployment on the shared commons.** This is the only
   no-design-change disposition. Merely restricting `partitions` to 1 is
   insufficient while other lanes/fact/node subjects share the stream. The
   exact safe temporary bound would still be “one successor domain is the only
   traffic in its stream, with no unexplained sequence gaps,” which the merged
   substrate does not enforce.

## 7. Source audit and relevance

All external sources are first-party and version-pinned where behavior is
client/server specific:

- `go/go.mod` pins the exact server and Go client used by the probe
  ([local pin](../../go/go.mod)); this excludes version drift as an explanation.
- `nats-server` v2.14.4 source owns the construction of ack metadata and the
  increment of the consumer delivery sequence; this is the authority for what
  the server sends.
- `nats.go` v1.53.1 source owns the Go metadata names/comments and parses the
  probe's fields; this is pertinent to interpreting captured values.
- `nats.js` v3.4.0 source and the installed 3.4.0 declarations independently
  expose the same three coordinates; this is pertinent because DEV-712 will be
  implemented in TypeScript, while the probe uses Go to avoid testing only the
  future implementation's client.
- Official NATS docs own filter, header, and wire-contract descriptions; they
  rule out a documented fourth partition ordinal omitted by one client.
- The issue, merged Plait substrate, and merged Lean model own the local
  topology and proof premise. No secondary literature is used.

## 8. Non-coverage

- The probe is one Windows host, one unclustered R=1 file-backed server, two
  literal filter subjects, six messages, one durable consumer per subject, one
  client reattachment, and one abrupt server restart. It does not claim
  clustered, mirror/source, work-queue, interest-retention, or liveness
  behavior.
- It does not test concurrent publishers, batching, subject transforms,
  republish, direct get, deletion, purge, limits eviction, or sequence reset.
  Those can add more gaps; none is needed for the finding.
- It does not claim acknowledgement durability from the abrupt server-restart
  rows. Those rows exist only to compare sequence metadata after recovery.
- It does not prove that any proposed disposition is sufficient. Each choice
  names its additional proof/gate obligations.
- It does not review DEV-712's remaining algebra, CAS, Effect, or chaos-harness
  design. It answers only whether the fixed JetStream position can instantiate
  the fixed partition-local successor premise on the merged topology.
