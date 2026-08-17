# DEV-716 credential-binding audit

Date: 2026-08-17

Research seat: `agent/research/DEV-716`

Trees inspected: PR 73 at reviewed head `f77c7b665578c7236056b68fa9aaa8fc99bb61de`; merged `main` at `d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3`

Pins: `nats-server v2.14.4`, `nats.go v1.53.1`, `@nats-io/* 3.4.0`

## Result

DEV-716 correctly proves a **substrate credential shape**, not Plait runtime
correspondence; its issue body and merged ledger row say exactly that. The
shape can deny all direct access to a protected KV bucket while allowing KV
work on a different bucket, and can separately deny the destructive
JetStream management subjects.

It cannot supply a put-but-not-delete credential for one KV bucket. At the
pinned server, publish authorization sees the subject, not the message headers
or body. KV Create/Update and KV Delete/Purge all publish to the same
`$KV.<bucket>.<key>` subject; only their headers differ. A principal allowed to
perform register CAS writes on `flb-fab-reg` can therefore also append a
revision-checked `DEL` or `PURGE` tombstone by raw NATS publish. The exact-pin
probe below did so and then reopened both keys with a revision-checked ordinary
update.

There is also no executable binding from the merged register adapters to the
DEV-716 application credential:

- the Go adapter accepts a caller-supplied `*nats.Conn`, which is capable of
  carrying a restricted credential but is not checked or provisioned by the
  adapter;
- the TypeScript adapter exposes only `servers` and `connectionName` and
  forwards only those to `connect`; it cannot accept `user`, `pass`, `token`,
  or an `authenticator`;
- at `@nats-io/nats-core 3.4.0`, credentials embedded in a server URL do not
  fill that gap: the URL parser reduces the URL to `url.host`, while
  `buildAuthenticator` reads only explicit authentication options. The local
  exact-install probe returned `auth: null` for
  `nats://application:application@127.0.0.1:4222`.

This is a **runtime/operations residual**, not a counterexample to the F5 Lean
theorem, the generated replay wall, or DEV-716's honestly bounded substrate
row. F5's five-action transition system contains no destructive KV action; the
wall drives those five actions through trusted adapters; DEV-716 expressly
claims no Plait code correspondence. What does not follow from those three
facts is that a deployed register connection actually uses a credential with
the required authority separation.

## Finding 1 — subject ACLs cannot distinguish KV values from tombstones

### Source result

The server's permission data model is an allow/deny list of **subjects** for
publish and subscribe
([`SubjectPermission` and `Permissions`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/auth.go#L130-L149)).
The publish decision takes only a `subject string`, looks that string up in the
allow and deny sublists, and caches the resulting boolean
([`pubAllowedFullCheck`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/client.go#L4176-L4228));
the inbound client path calls it before routing the message
([permission check](https://github.com/nats-io/nats-server/blob/v2.14.4/server/client.go#L4341-L4366)).
No header or payload is an input to that authorization decision.

The two clients corroborate the wire equivalence:

- nats.go `Update` publishes the value with
  `Nats-Expected-Last-Subject-Sequence`; `Delete` publishes to the same subject
  with `KV-Operation: DEL`; `Purge` is that same delete publication plus
  `KV-Operation: PURGE` and `Nats-Rollup: sub`
  ([v1.53.1 `kv.go`](https://github.com/nats-io/nats.go/blob/v1.53.1/kv.go#L779-L861)).
- nats.js `_put` and `_deleteOrPurge` likewise use the same
  `subjectForKey(ek, true)`, differing only in those headers
  ([3.4.0 `_put`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/kv.ts#L627-L655),
  [`_deleteOrPurge`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/kv.ts#L743-L785)).

Therefore a NATS subject permission can express either of these useful
boundaries:

1. deny the entire protected bucket subject family; or
2. allow that family, which admits ordinary values and tombstone headers
   alike.

It cannot express “allow CAS values, deny `KV-Operation`”. A trusted proxy or
daemon can enforce that operation surface in code, but that is a distinct
trusted-component premise, not a NATS ACL fact.

### Exact-pin probe

Run:

```text
cd go
go run ../docs/research/reference/dev716-credential-binding/probe.go
```

The administrator provisions `KV_BOUNDARY`; the application credential may
publish to `$KV.BOUNDARY.>` and may issue the read-only `STREAM.INFO` needed to
bind the already-provisioned KV handle. It has no destructive management API
subjects. The recorded output is
[`reference/dev716-credential-binding/probe.out`](reference/dev716-credential-binding/probe.out):

```text
KV key=delete allowed=create@1,update@2,revision-checked-delete@3 op=KeyValueDeleteOp history=3,reopen-update@4
KV key=purge allowed=create@5,update@6,revision-checked-purge@7 op=KeyValuePurgeOp history=1,reopen-update@8
MANAGEMENT subject=$JS.API.STREAM.DELETE.KV_BOUNDARY result=permission-refused
MANAGEMENT subject=$JS.API.STREAM.PURGE.KV_BOUNDARY result=permission-refused
MANAGEMENT subject=$JS.API.STREAM.UPDATE.KV_BOUNDARY result=permission-refused
MANAGEMENT subject=$JS.API.STREAM.RESTORE.KV_BOUNDARY result=permission-refused
PINS server=v2.14.4 go-client=v1.53.1
```

Pertinence: this is the minimal distinction in dispute. It holds the subject
permission fixed, changes only the operation headers through the pinned client,
and observes both tombstone type and retained history through an independent
administrator. The management refusals show that the key-level counterexample
does not depend on accidentally granting lifecycle APIs. The reopen updates
show the safety consequence: within the same backing-stream incarnation, a
terminal key can be made non-terminal again at a later revision.

Limit: the probe does not model leaked credentials, hostile code execution,
clustered NATS, crash recovery, or liveness. It establishes one authorization
fact on the exact R=1 pins.

## Finding 2 — what `DenyDelete` and `DenyPurge` do and do not seal

`DenyDelete` and `DenyPurge` are stream configuration flags described as
restricting deletion and purge of **messages**; `AllowRollup` is a separate
header-driven purge path
([v2.14.4 `StreamConfig`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L88-L100)).
The exact enforcement is:

- `DenyDelete` is checked by `$JS.API.STREAM.MSG.DELETE` before removing or
  erasing a stored sequence
  ([`jsMsgDeleteRequest`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_api.go#L3287-L3333)).
- `DenyPurge` is checked by `$JS.API.STREAM.PURGE`
  ([`jsStreamPurgeRequest`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_api.go#L3711-L3764))
  and also disables header rollup at ingestion (`AllowRollup && !DenyPurge`)
  ([rollup condition](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L6239-L6245)).
- the server rejects a configuration combining `DenyPurge` with
  `AllowRollup`
  ([validation](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L1760-L1767)).
  A normal KV bucket needs rollup for its `Purge` operation, so this is not a
  same-bucket “permit values but deny purge markers” authorization mechanism.
- once true, both flags are protected against being cancelled by a stream
  update
  ([update validation](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L2303-L2315)).
- neither flag guards `$JS.API.STREAM.DELETE`; that handler deletes the stream
  without consulting them
  ([`jsStreamDeleteRequest`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_api.go#L3138-L3223)).

A KV `DEL` is an appended marker, not a message-delete API request, so
`DenyDelete` does not classify or reject it. KV `PURGE` is also an appended
marker, but its rollup side effect depends on `AllowRollup` and is incompatible
with `DenyPurge`. Stream deletion, snapshot restore/rollback, and destructive
retention updates remain separate management-authority questions.

Pertinence: DEV-716 correctly pins the journal's immutable seal and the
retention-update surface, but those facts must not be projected onto the
register KV bucket. The key-level terminality guard in its test is the subject
ACL, not `DenyDelete`/`DenyPurge`.

## Finding 3 — DEV-716 proves a deliberately different-bucket credential

The merged harness's application allow-list is
`flb.req.>`, `flb.ing.>`, and `$KV.ASSUME_APP_SCOPE.>`
([harness](https://github.com/mepuka/foldlab/blob/d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3/go/substrate/harness_test.go#L121-L149)).
Its positive KV control writes ordinary create/CAS-update values to
`$KV.ASSUME_APP_SCOPE.credential-control`
([positive control](https://github.com/mepuka/foldlab/blob/d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3/go/substrate/envelope_test.go#L292-L334)).
Its `DEL` and `PURGE` attempts target a different family,
`$KV.ASSUME_TERMINAL.>`
([terminal probes](https://github.com/mepuka/foldlab/blob/d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3/go/substrate/envelope_test.go#L17-L101)).

That is a valid negative/positive credential control: the application can do
some legitimate work and cannot touch the protected family. It is not evidence
that a credential allowed to write `flb-fab-reg` cannot write its tombstones.
The issue body explicitly says the gate “proves nothing about Plait code,” and
the merged ledger preserves “no Plait code correspondence”
([ledger row](https://github.com/mepuka/foldlab/blob/d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3/VERIFICATION.md#L57-L64)).

Pertinence: this explains why DEV-716 is green alongside the exact-pin
counterexample. They quantify over different credential shapes; there is no
contradiction and the substrate ledger row remains honest.

## Finding 4 — the register adapters are not bound to that shape

### TypeScript

`RegisterOptions` has only `servers` and `connectionName`
([source](https://github.com/mepuka/foldlab/blob/d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3/packages/plait/src/Register.ts#L22-L39)),
and `makeRegisterService` forwards only those fields to `connect`
([source](https://github.com/mepuka/foldlab/blob/d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3/packages/plait/src/internal/registers.ts#L205-L230)).
The upstream client builds authentication only from an explicit
`authenticator`, `token`, or `user`/`pass`
([3.4.0 `buildAuthenticator`](https://github.com/nats-io/nats.js/blob/v3.4.0/core/src/options.ts#L74-L96)).
Its server parser strips the scheme and returns `url.host`, which excludes URL
userinfo
([3.4.0 `hostPort`](https://github.com/nats-io/nats.js/blob/v3.4.0/core/src/servers.ts#L61-L104)).

The exact installed-package probe
[`url-auth-probe.mjs`](reference/dev716-credential-binding/url-auth-probe.mjs)
returned:

```json
{"server":"nats://application:application@127.0.0.1:4222","address":{"listen":"127.0.0.1:4222","hostname":"127.0.0.1","port":4222},"auth":null}
```

Pertinence: this rules out the apparent workaround of placing the credential in
`RegisterOptions.servers`. It does not claim upstream NATS.js lacks
authentication; it shows this adapter does not expose the explicit options the
upstream implementation requires.

### Go

`register.Open` receives an already-connected `*nats.Conn`, creates/opens the
bucket, and checks bucket shape; it neither creates nor verifies a credential
([source](https://github.com/mepuka/foldlab/blob/d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3/go/register/register.go#L52-L82)).
This seam is capable of using a restricted connection supplied by a future
caller. The repository evidence does not bind a particular principal to it,
and the register wall's command simply calls `nats.Connect` on its argument
([source](https://github.com/mepuka/foldlab/blob/d1002ac65f9fdb1bc33bc8b8cc373fbe142b45d3/go/cmd/registerwall/main.go#L16-L27)).

Pertinence: unlike TypeScript, the Go interface does not block credential
injection. The residual is lack of evidence/enforcement, not lack of capability.

## Claim separation

| Layer | What current evidence supports | What this audit does not permit it to imply |
| --- | --- | --- |
| F5 Lean model | Safety for the five modeled register actions | Safety under KV delete, purge, stream recreation, restore, or retention mutation |
| Replay/runtime correspondence | TS and Go agree with generated rows when driven through the five trusted adapter methods on fresh fixed incarnations | That arbitrary code holding the same NATS connection cannot raw-publish tombstones |
| DEV-716 substrate gate | The tested credential is denied protected bucket subjects and witnessed destructive management subjects; server seal and exact-pin substrate behavior | That either register adapter uses that credential, or that an allowed same-bucket writer is tombstone-restricted |
| Operational guard | Can close the residual if untrusted clients are denied the entire register family and management APIs, while the register writer is a separate trusted, non-exported principal | A header-aware NATS ACL; one does not exist at these pins |
| Liveness | No claim in this audit | Credential binding does not prove renewal progress, availability, fair retry, or recovery |

## Decision-relevant operational premise

For “DEV-716 is the other half of the fixed-incarnation guard” to be executable,
the deployment premise must say more than “application credentials cannot
delete.” At minimum it must identify these distinct authorities:

1. **Untrusted application principal:** denied all direct
   `$KV.flb-fab-reg.>` publication and the lifecycle/retention management API;
   it reaches register operations only through a narrower service surface.
2. **Trusted register writer:** allowed the register subject and therefore, as
   a fact of the pinned substrate, technically capable of tombstone publication;
   its credential is not exported and its trusted code surface contains no
   delete/purge or arbitrary raw-publish route.
3. **Administrator:** delete, purge, update, restore/rollback, account
   permission change, and bucket recreation are explicitly outside the F5
   runtime claim unless a later guard detects them.
4. **Binding evidence:** a wall must show the actual TS and Go register
   construction paths use the intended trusted-writer principal and that the
   untrusted principal cannot construct the public direct adapter against the
   protected bucket.

This is a decision request, not an implementation proposal. The current
fixed-incarnation prose remains accurate as a bound. The narrower statement
“DEV-716 independently proves the deployed register credential guard” is not
supported today.

## Multica disposition record

The source-cited boundary finding was posted after DEV-716 merged, as reply
`1c5a5f28-4238-400e-8b4b-b865c90e9d32` to the merge record (2026-08-17
19:30:21Z). The post explicitly preserves DEV-716's bounded substrate claim
and routes the residual to the trusted-writer/deployment boundary; it does not
request a ledger retraction or reopen the five-action theorem.

## Sources considered and pertinence

| Source/evidence | Pertinent? | Reason |
| --- | --- | --- |
| Pinned nats-server `auth.go` / `client.go` | Yes, decisive | Owns the authorization algorithm and shows its only message input is the subject. |
| Pinned nats.go and nats.js KV implementations | Yes, decisive | Own the exact wire subjects and distinguishing headers for put/update/delete/purge. |
| Pinned nats-server stream/API implementation | Yes | Separates message delete, stream purge, rollup purge, stream delete, and immutable update flags. |
| Merged DEV-716 harness and ledger | Yes, decisive for claim size | Shows the actual different-bucket credential and expressly excludes Plait code correspondence. |
| Merged TS/Go register constructors | Yes, decisive for binding | Shows what authentication material can enter each runtime seam. |
| The two exact-pin probes | Yes, falsification evidence | Materialize the same-subject tombstone capability and the TypeScript URL-auth non-binding without changing product code. |
| F5 theorem body and replay corpus | Pertinent only for boundary classification | They show why the finding is outside the modeled action alphabet; they cannot answer NATS authorization. |
| Generic NATS tutorials or third-party security guidance | Not used | The pinned implementations are stronger and avoid version drift. |
| `StreamInfo.Created` incarnation research | Not pertinent to this finding | A creation identity addresses delete/recreate detection; it cannot distinguish value and tombstone publishes within one incarnation. |

## Residuals and next probe

- Audit the actual consumer architecture: is public `Registers.layer` intended
  for trusted in-process use only, or for holders who are otherwise classified
  as application principals? That naming decision determines whether missing
  TypeScript authentication is an API gap or merely an undeclared embedding
  premise.
- If a proxy/daemon is the chosen authority boundary, probe it with the real
  client credential: legitimate five-action register calls succeed, direct
  `$KV.flb-fab-reg.>` PUT/DEL/PURGE and `$JS.API.STREAM.{DELETE,PURGE,UPDATE,RESTORE}`
  all refuse, and the daemon connection is not returned to the caller.
- Separately retain the lifecycle probes already identified by the
  incarnation audit: restore/snapshot rollback and administrative retention
  mutation are management exclusions, not covered by this same-subject result.
