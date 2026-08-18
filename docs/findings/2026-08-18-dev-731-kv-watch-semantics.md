# FINDING-DEV731-WATCH-INITIAL-001 — `isUpdate` is not an initial/live boundary

Status: retained substrate finding; no production fix is attempted because no
Plait watch surface exists.

## Ran evidence

`bun test ./test/KVWatchSemantics.test.ts`, from `packages/plait`, runs the
`@nats-io/kv@3.4.0` client against a freshly built `nats-server v2.14.4`, one
file-backed node, `num_replicas: 1`. The four-arm suite was also repeated ten
times on Windows/NTFS at the authoring revision without a failure.

The probe records:

- default replay coalesces pre-watch history to the latest value per key; the
  retained entries arrive in bucket-global revision order;
- a bounded 32-write live burst on one connected client delivered all 32 PUTs
  in revision order, with no observed live coalescing;
- DEL and PURGE markers arrive with empty payloads;
- `resumeFromRevision` is inclusive and names a bucket-global stream revision,
  so a restarted filtered watcher resumes after its last seen entry with
  `lastSeen + 1` and can legitimately observe gaps owned by other keys;
- a forced 750 ms client reconnect to the same live server delivered the write
  published during the disconnect before the write published after reconnect.

## Finding

`KvWatchEntry.isUpdate` does not partition initial replay from live delivery at
this pin. With two initial entries the flags were `[false, true]`; with one
initial entry the only flag was `true`. The same last-entry behavior appears on
resume replay. A consumer that treats `isUpdate === true` as proof that an
entry happened after watch creation is therefore unsound.

The future `CellReplica` feed must classify every delivered entry as advisory
state and join it without depending on that flag. It may use a persisted
revision plus explicit resume for catch-up, but it may never infer absence from
silence or from having crossed an apparent initial/live boundary.

## Bounds

The reconnect arm is one forced client reconnect, same server process, same
ephemeral consumer, and no server restart. The live-burst arm is a finite
32-write observation, not a losslessness or liveness theorem. Nothing here
licenses use as a log, proves clustering behavior, spans bucket incarnations,
or permits absence reasoning.
