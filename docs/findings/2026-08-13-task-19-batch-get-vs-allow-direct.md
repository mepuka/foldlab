# Task 19 finding T19-1 — batch get requires the forbidden direct surface

Status: **ACCEPTED — Addendum 1 ratified the disposition.** The red probe stays
preserved under the `task19finding` build tag; production keeps `AllowDirect`
denied and pipelines the ordinary per-message management requests.

Task 19 requires both of these properties:

1. `journal.Read` migrates from the per-message `GetMsg` walk to get-batch,
   capped at 1000 and resumed from the last sequence plus one.
2. The journal stream shape gate denies `AllowDirect`.

They cannot both be implemented through nats-server's batch-get API at the
pinned `nats-server v2.14.4` / `nats.go v1.53.1` versions.

## Minimized counterexample

Create one conforming journal stream (`AllowDirect == false`), append two
messages, and request:

```text
subject: $JS.API.DIRECT.GET.J_task19_batch
body:    {"seq":1,"batch":2}
```

No responder exists. Replay:

```text
cd go
go test -tags task19finding ./journal -run '^TestTask19FindingBatchGetRequiresAllowDirect$' -count=1 -v
```

The test fails with:

```text
FINDING T19-1: conforming AllowDirect=false journal has no batch-get responder
```

## Independent pinned-source evidence

- `server/stream.go:4942-4948`: `subscribeToDirect` is called only when
  `mset.cfg.AllowDirect` is true.
- `server/stream.go:5780-5831`: `processDirectGetRequest` accepts the batch
  request and dispatches it to `getDirectRequest`.
- `server/stream.go:6043-6066`: `getDirectRequest` implements `Batch`.
- `server/jetstream_api.go:3426-3430`: the ordinary
  `$JS.API.STREAM.MSG.GET.<stream>` endpoint explicitly rejects `Batch` and
  `MaxBytes` at this version.
- `nats.go/jetstream/stream.go:256-263,547-555`: the pinned high-level
  `Stream.GetMsg` request type exposes no batch field.

## Ratified disposition

Task 19 Addendum 1 keeps `AllowDirect` denied. `journal.Read` instead issues a
bounded window of per-message `$JS.API.STREAM.MSG.GET` requests concurrently
and folds their replies strictly in stream-sequence order. A retained
sequential implementation and frozen-corpus digest wall prove that request
scheduling did not change verify-on-read.
