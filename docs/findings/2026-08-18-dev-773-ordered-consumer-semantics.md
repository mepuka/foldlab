# FINDING-DEV773-CONSUMER-DELETE-001 — direct deletion is not heartbeat recovery

Status: retained substrate finding; no production fix is attempted because the
public consumer seam belongs to DEV-765.

## Ran evidence

`bun test ./test/OrderedConsumerSemantics.test.ts`, from `packages/plait`, runs
`@nats-io/jetstream@3.4.0` against a freshly started `nats-server v2.14.4`, one
file-backed node and `num_replicas: 1`. The whole five-arm suite was repeated
five times on Windows/NTFS at the authoring revision without a failure. The
passing arms record:

- after accepting stream sequences 1 and 2, an administrative reset of the
  underlying ordered consumer to stream sequence 5 creates a real consumer
  sequence gap; the client emits `reset` and `ordered_consumer_recreated`, then
  yields exactly `[1,2,3,4,5,6,7,8]` with no skipped or repeated stream
  sequence (`a consumer-sequence gap recreates from last delivered stream
  sequence plus one`);
- when an inbound transport hold suppresses heartbeats and the underlying
  consumer is deleted during the hold, the client emits `heartbeats_missed`,
  observes `consumer_not_found`, emits `reset` and
  `ordered_consumer_recreated`, and again yields exactly
  `[1,2,3,4,5,6,7,8]` (`heartbeat loss after consumer deletion recreates at
  the same no-skip-no-dupe cursor`);
- direct deletion without the heartbeat hold produces the bounded notification
  trace `[consumer_deleted,next,no_responders,next,no_responders,next,
  no_responders]`; no `heartbeats_missed` or
  `ordered_consumer_recreated` notification occurs inside that discriminating
  window (`direct consumer deletion enters a no-responders repull loop before
  heartbeat recovery`);
- with 1,024 messages already in the lane, `consume({ max_messages: 256 })`
  and a downstream deliberately paused after the second pull request, observed
  client pending reached 256 and all 1,024 stream sequences were subsequently
  delivered in order without loss or duplication (`max_messages keeps a
  slower downstream near the pump bound without loss`);
- for the same 256 stored messages, `DirectStreamAPI.getBatch` returned the
  same sequence/payload vector as the sequential management
  `StreamAPI.getMessage` walk. A frame-aligned proxy counted one direct batch
  request versus 256 per-message requests (`direct getBatch uses one request
  where the per-message management walk uses one per sequence`).

## Finding

At this pin, a true missed-heartbeat path and an immediate consumer-deletion
path do not have the same recovery posture. The heartbeat arm recreated and
resumed from last-delivered stream sequence plus one. The direct-deletion arm
instead kept issuing pulls to the deleted consumer name and receiving
`no_responders`; those protocol replies kept the heartbeat monitor from
reporting a miss during the bounded observation.

The public consumer seam must therefore not rely on "ordered consumer silently
recreates" as covering direct administrative deletion or an equivalent 503
response. DEV-765 needs an explicit disposition for
`consumer_deleted`/`no_responders`; this probe neither chooses that disposition
nor changes a production seam. The passing direct-deletion arm is the cited
counterexample.

## Recorded read-strategy evidence

Across the five repeat runs, direct batch measured 4.78–11.10 ms and the
sequential per-message walk measured 40.03–45.05 ms for 256 messages. Those
elapsed values are host observations, not gate thresholds. The gated
measurements are the wire request counts (1 versus 256) and equality of the
returned sequence/payload vectors, from the passing `direct getBatch uses one
request where the per-message management walk uses one per sequence` arm.

That result does not silently select direct batch for the pump. The probe stream
sets `allow_direct: true`; Plait lane streams do not. Enabling direct access
would be a stream-shape and consistency decision owned by the consumer seam,
not an optimization inherited from this measurement. The ordered-consumer
slow-reader arm separately shows the pull path delivered the full finite load
while observed pending stayed near `PUMP_BUFFER_BOUND` at this schedule.

## Bounds

All recovery observations are one client, one live server process, one stream
incarnation, R=1 file storage, no clustering and no server restart. The gap is
an administrative reset, not packet corruption. The heartbeat arm holds every
server-to-client frame, not heartbeat frames alone, and deletes the ephemeral
consumer during that gap so the recovery lookup has a missing resource to
observe. The direct-deletion finding is bounded to three consecutive
`no_responders` replies; it proves the documented silent-recreate reliance
false for that window, not that the client can never recover under any later
event. The slow-reader arm is a finite 1,024-message schedule and does not prove
a universal memory bound. Direct get-batch requires `allow_direct: true`, and
the timing ratio is not asserted because scheduler and host load legitimately
move it.
