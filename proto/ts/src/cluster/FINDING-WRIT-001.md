# FINDING-WRIT-001 — `MessageStorage.withTransaction` is outside the writ

Status: **STOPPED before implementation**

Date: 2026-08-13

Pin: `effect@4.0.0-rc.108`

## Finding

The ratified design summarized Effect's `MessageStorage` seam as
`saveRequest`, `saveReply`, `repliesFor`, and `unprocessedMessages`. At the
pin, the service has sixteen operations. The omitted operations include
`clearReplies`, `resetShards`, `resetAddress`, `clearAddress`, and the
higher-order operation:

```ts
readonly withTransaction: <A, E, R>(
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<A, E, R>
```

This signature is present byte-identically in both authoritative copies:

- installed source:
  `proto/ts/node_modules/effect/src/unstable/cluster/MessageStorage.ts:48-173`
- vendored source:
  `repos/effect/packages/effect/src/unstable/cluster/MessageStorage.ts:48-173`
- shared SHA-256:
  `b1011fe6a58108be53387080213ffe78c75b13ee0f38d4aacca0a02785291f91`

The low-level `MessageStorage.Encoded` contract also requires
`withTransaction` (`MessageStorage.ts:290-405`), and `makeEncoded` forwards it
unchanged (`:650-657`). This is not an unused compatibility member:

- `ClusterWorkflowEngine` places `ClusterSchema.WithTransaction` on activity
  requests when the activity asks for it
  (`ClusterWorkflowEngine.ts:660-680`).
- The stock entity manager supplies `storage.withTransaction` as the persisted
  RPC handler's `onRequest` wrapper
  (`internal/entityManager.ts:229-231`, `:324-326`, `:513-515`).
- The reference SQL driver implements the operation with
  `sql.withTransaction`, not an identity function
  (`SqlMessageStorage.ts:674-677`). Its reply and clear paths also group
  multiple mutations transactionally (`:497-525`, `:640-657`).

## Minimized counterexample

1. Run a stock persisted activity carrying
   `ClusterSchema.WithTransaction = true`.
2. The unchanged entity manager wraps the activity handler with
   `MessageStorage.withTransaction`.
3. Let the handler perform one application SQL effect through the same
   `SqlClient` service and let message storage persist its reply.
4. Interrupt between those effects.

The SQL implementation can put the handler's SQL work and message-storage
work under the same transaction context. `ProtoClient` cannot: its complete
authority is one `read`, one `publish`, or one `request` at a time. Current
protod advertises only `type.create`, `type.fill`, `type.unfill`,
`journal.read`, and `contract.describe` requests; ingress unconditionally
appends one resolved frame. There is no transaction context, begin/commit/
abort request, conditional append, or atomic batch request.

Making `withTransaction` the identity would compile and would let ordinary
examples pass when they do not request a transaction, but it would silently
weaken the pinned interface precisely where stock cluster code asks for its
transaction guarantee. Buffering journal operations client-side does not fix
the counterexample: the wrapped `Effect<A, E, R>` is arbitrary and may perform
external effects that cannot join a later daemon append atomically.

## Disposition required

Per Task 25's pre-declared finding rule, implementation stops here. No writ
request was added, no identity transaction shim was written, and no
conformance/demo claim was attempted.

The operator/coordinator must ratify one of these directions before work can
resume:

1. Narrow the product claim to a named `MessageStorage` subset and prove stock
   `SingleRunner` / workflow execution never selects `WithTransaction` within
   that bounded domain.
2. Add an explicit daemon-owned transaction or atomic-batch capability to the
   writ, with its own law and gate.
3. Reject `WithTransaction` activities as a typed unsupported capability and
   establish that Effect's engine has a truthful refusal path for it.

The destructive/reset operations still need their own complete mapping after
this finding is disposed. Append-only tombstones may implement their logical
views, but that possibility was not built or claimed because the first
unexpressible operation already requires a stop.
