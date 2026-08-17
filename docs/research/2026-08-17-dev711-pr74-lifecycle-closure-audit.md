# DEV-711 / PR #74 — lifecycle-closure claim audit

**Status:** FINDING — exact PR head
`0dd726459ba697260909a44bd07057b1f4a99d0b` neither closes nor states the
bound required by `DEV711-LIFECYCLE-1`. Stop before merging a live-runtime F5
claim or a `VERIFICATION.md` row. The five-action Lean result remains a valid
result about its closed transition system.

This is a claim-boundary audit, not a broad review of PR #74. The audit target
is the two-commit range
`0d575c8248025ccf1c9dc5a652a8e6ed777be471..0dd726459ba697260909a44bd07057b1f4a99d0b`.
The implementation is commit `591aeec4c`; final head `0dd726459` changes only
the recorded successful Veil gate duration from 45 to 40 seconds in
`verify/fabric-veil/DECISIONS.md:54-55`, so the finalization commit has no
lifecycle-bearing delta.
The prior real-server counterexample and primary-source chain are in
[`2026-08-17-dev711-register-lifecycle-audit.md`](2026-08-17-dev711-register-lifecycle-audit.md).
Its minimized finding was posted to Multica DEV-711 as comment
`d9f56ed6-65f6-437c-88c1-f009fedb6ae3`.

## Answers

| Audit question | Answer at `0dd726459` |
| --- | --- |
| 1. Is bucket/backing-stream lifecycle excluded by an executable ACL or shape guard? | **No.** Both clients assert storage/configuration shape only. They accept an identically shaped replacement bucket and contain no stream-incarnation check or credential/management-API guard. |
| 2. Is the fixed-incarnation assumption stated in the model, correspondence, tests, README/DECISIONS, and proposed ledger bounds? | **No.** A single initialization and five actions make it implicit in the formal transition relation, but no audited surface names bucket/stream deletion, recreation, reset, or a fixed incarnation as a bound. |
| 3. Do replay, crash-steal, or history audits cover lifecycle mutation? | **No.** They can all pass while the counterexample remains. Every modeled/runtime trace stays inside one incarnation; history is inspected only before that incarnation is destroyed. |
| 4. Does cleanup accidentally demonstrate reincarnation reuse? | **Yes.** The TypeScript replay destroys `flb-fab-reg` after each row and recreates it on the same running server for the next row; successive model rows require their first grant to equal token `1`. The test thereby exercises numeric token reuse but never retains the previous token across cleanup or attempts a stale post-recreation commit. |

## Finding DEV711-PR74-CLOSURE-1 — runtime correspondence remains conditional on an unstated incarnation bound

### The model proves a closed five-action carrier, not substrate lifecycle

The dispatch fixes one initialization and exactly five actions over one register
(`scratch/dispatch/32-plait-register-spec.md:82-100` at `0dd726459`). The
implementation follows that shape:

- `verify/fabric-veil/FabricVeil/Statements.lean:30-40` initializes the state
  once; lines 42-88 contain only `grant`, `renew`, `commit`, `expireSteal`, and
  `observe`.
- `verify/fabric-veil/FabricVeil/Statements.lean:90-103` states monotonic-token
  and single-landing invariants over the states reachable through those actions.
- `verify/fabric-veil/FabricVeil/Corpus.lean:54-79` repeats the same carrier in
  the executable trace relation, and lines 108-129 enumerate 12 scenarios with
  no delete, purge, reset, restore, or recreate action.

This is pertinent because a bucket-replacement step cannot violate an invariant
in a transition system that cannot express the step. It does **not** refute the
Lean obligations. It prevents moving from that model result to an unqualified
runtime statement such as "no stale token ever lands per work digest."

The omission is not stated as a bound. `verify/fabric-veil/README.md:51-56`
lists safety-only, liveness, retry, clustering, and cross-work-digest bounds but
not incarnation/lifecycle. `verify/fabric-veil/DECISIONS.md:13-20` maps the
token to per-key revision CAS and fixes file/R1/history/TTL/max-bytes, again
without an incarnation assumption. `packages/plait/README.md:42-47` and
`packages/plait/DECISIONS.md:3-16` state the same runtime shape but no lifecycle
exclusion. A commit-scoped search for `incarnation`, `epoch`, and the relevant
`lifecycle` terms across `verify/fabric-veil`, `packages/plait`, `go/register`,
and `VERIFICATION.md` finds no register statement.

The unbounded module vocabulary makes the mismatch sharper:
`packages/plait/CONTEXT.md:31-42` calls the register per-work-digest authority
and says a zombie's stale token is evidence for refusal, while
`go/CONTEXT.md:9-19` says an older token is "permanently refused." Neither
qualifies that sentence by a backing-stream incarnation. Those claims are true
of the model carrier and of a continuously existing stream, but false after
the witnessed replacement.

### The runtime shape checks accept a replacement resource

The TypeScript service calls `Kvm.create` for the fixed bucket name and then
checks only storage, replicas, history, TTL, and max bytes
(`packages/plait/src/internal/registers.ts:122-164`). The Go twin opens or
creates the same fixed bucket name and checks the analogous fields
(`go/register/register.go:55-81`). Neither check records an opaque incarnation,
compares one on later operations, or verifies a credential policy. The public
constructors accept server locations but no identity or lifecycle capability
(`packages/plait/src/Register.ts:25-29,51-55`; `go/register/register.go:55-81`).
The TypeScript test harness launches NATS without authentication or permission
configuration (`packages/plait/test/NatsHarness.ts:44-60`); the Go register
harness is likewise unrestricted (`go/register/register_test.go:81-108`).

That check is pertinent to storage/retention/replica bounds. It is not pertinent
to reincarnation: deletion followed by recreation with the same configuration
satisfies every asserted field. The old and new resources are observationally
equal to these checks while having independent stream-sequence epochs.

The pinned substrate sources explain why this matters:

1. nats.go v1.53.1 makes the KV revision the message stream sequence and sends
   `Update`'s numeric revision only as expected-last-subject-sequence
   ([entry revision, `kv.go:954-960`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L954-L960);
   [`Update`, `kv.go:1116-1150`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L1116-L1150)).
2. nats-server v2.14.4 compares that expected number with the current subject
   sequence; no stream epoch participates
   ([`server/stream.go:6440-6466`](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L6440-L6466)).
3. Bucket destruction deletes `KV_<bucket>`
   ([nats.go `kv.go:733-745`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L733-L745));
   the pinned server test independently creates at sequence `1`, deletes and
   recreates a stream, and creates at sequence `1` again
   ([`jetstream_test.go:20749-20850`](https://github.com/nats-io/nats-server/blob/bbd6dc5e903f3505a1d9a7a21c50e0131901afd7/server/jetstream_test.go#L20749-L20850)).
4. The pinned TypeScript client likewise returns `PubAck.seq` as the token and
   maps `destroy` directly to stream deletion
   ([`@nats-io/kv` 3.4.0 `kv.ts:588-658`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/kv.ts#L588-L658);
   [`destroy`, `kv.ts:1003-1009`](https://github.com/nats-io/nats.js/blob/v3.4.0/kv/src/kv.ts#L1003-L1009)).

These sources own numeric-CAS and lifecycle semantics and are therefore direct
evidence. General lease literature, Raft/cluster behavior, and liveness results
are not pertinent to this minimized single-node R1 counterexample.

### The tests pass inside incarnations and erase the evidence between them

The model replay cannot cover lifecycle because the model corpus has no such
action. The runtime tests preserve the same restriction:

- TypeScript replays one row at a time on work key `0123456789abcdef`
  (`packages/plait/test/Register.test.ts:87-104`). Its history audit counts
  outcomes only in the currently open bucket and then destroys that bucket
  (`:106-129`). The outer loop calls this destroy after every row (`:139-152`).
- The heterogeneous crash-steal schedule grants, kills, steals, attempts one
  stale commit, and lands the winner without a lifecycle transition
  (`packages/plait/test/Register.test.ts:213-295` and
  `packages/plait/fixtures/crash-steal-schedule.json:1-10`).
- Go starts a fresh embedded server/store for every corpus subtest
  (`go/register/register_test.go:81-108,137-145`) and audits only that subtest's
  retained history (`:171-192`). It never transports a token into another
  incarnation.
- The direct TypeScript CAS probe destroys the bucket only after its last
  assertion (`packages/plait/test/Register.test.ts:154-172`); it does not
  recreate and retry the old revision.

Consequently, all 12 model rows, retained-history checks, CAS probes, and the
crash-steal wall can be green while `old token 1 / destroy / recreate / new
token 1 / old token 1 commits` remains accepted. History depth 64, TTL 0, and
max-bytes -1 are pertinent to eviction inside one incarnation. They cannot
audit a terminal outcome after deleting the resource that contained its
history.

### Cleanup is already a partial reincarnation witness

The TypeScript replay uses one server harness for the whole test
(`packages/plait/test/Register.test.ts:131-137`), but
`auditAndDestroy` deletes the bucket after each row (`:106-129,148`). The next
row constructs another live layer, whose implementation calls `Kvm.create`
(`packages/plait/src/internal/registers.ts:122-144`). The generated corpus
requires the first grant in the first rows to observe token `1`
(`packages/plait/fixtures/register-traces.ndjson:2-5`).

Thus a passing replay already witnesses that identically named, identically
shaped successor buckets reuse the numeric token. The assertion is merely
partitioned so it looks like test isolation: the previous row's token and
terminal outcome are discarded before recreation. This is strong confirmation
that the prior real-server counterexample is pertinent to the exact PR head,
not a hypothetical configuration outside its harness.

## Proposed ledger text is not bounded to its evidence

The executor's Multica closing report, comment
`2ad53f10-7d3a-47b5-b4f4-96d206ad1d28` (2026-08-17 14:18:37Z), proposed an
unqualified short row and a full claim that re-earns "fencing safety and unique
terminal outcome." Its bounds name safety-only/no liveness, non-clustered R1,
per-work-digest/no cross-register claim, and the trusted base. They do not name
a fixed backing-stream incarnation or administrative lifecycle as a residual.
The wording therefore scopes the claim *by work digest* while the evidence is
scoped by an additional, unstated resource incarnation.

The committed ledger itself remains accurate at this head:
`VERIFICATION.md:35` still marks the Effector claim archived, and
`VERIFICATION.md` is absent from the PR diff. The defect is in the proposed
upgrade and public runtime correspondence, not an already committed new row.

After receiving `DEV711-LIFECYCLE-1`, the executor explicitly accepted the
finding and superseded both the runtime-correspondence claim and proposed row
in Multica comment `96e12cf7-9393-469f-85f9-4869d70e2ac1`
(2026-08-17 14:20:41Z). That discussion update is correct. It does not modify
PR #74's artifacts, so the exact head remains non-closing and non-merge-ready
for the withdrawn claim.

## DEV-716 / PR #73 is an operational guard under review, not proof closure

The first audited DEV-716 head, `584a469cf`, was not in PR #74's commit range
and tested only the key-level delete/purge boundary. The board advanced PR #73
to `89074bb` after this exact-PR audit. That round added paired application-
refusal/admin-success probes for stream `DELETE`, stream `PURGE`, and deletion
of a KV backing stream. Those additions are pertinent: a credential that
actually denies those management subjects can enforce part of the fixed-
incarnation premise that F5 needs.

They still do not close DEV-711 at this pass:

1. PR #73 remains draft and changes-requested, outside PR #74 and outside
   `main`; PR #74 does not bind either runtime client to its application
   credential.
2. The round-two reviewer planted only `$JS.API.STREAM.UPDATE.>` in the
   application allow-list, left every probed delete/purge subject denied, and
   used `MaxMsgs: 1` to evict two of three journal frames on pinned
   nats-server v2.14.4. The substrate suite stayed green. This directly shows
   that enumerating obvious destructive verbs is not a complete terminality
   guard: stream configuration authority can make retained evidence disappear.
3. The same probe found that changing `DenyDelete` from true to false is
   server-refused with API error `10052`. That source of immutability is
   pertinent to the sealed configuration fields, but it is not pertinent to
   mutable retention limits such as `MaxMsgs`; those remain an independent
   authority surface.
4. Even a repaired, deployed credential gate would establish an operational
   premise for one tested credential/API surface. It would not add a lifecycle
   action or epoch to the five-action Lean LTS, and privileged administrator,
   restore/rollback, or replacement paths would remain explicit residuals.

The new evidence is recorded in the DEV-716 round-two verdict, Multica comment
`3d5eaf24-516f-461d-8e1c-1178f2bac5eb` (2026-08-17 14:45:25Z). It is direct
real-server evidence at the same server pin and is decision-relevant to the
fixed-incarnation option. It is not independently reproduced in this report,
and it is not evidence that PR #74 itself has a guard.

## Required coordinator disposition and ledger obligations

No product repair is appropriate before one semantic disposition is ratified.
The coordinator must choose one of the already identified meanings:

1. **Fixed-incarnation claim.** F5 is per `(work digest, backing-stream
   incarnation)`. Bucket/backing-stream delete/recreate is excluded or detected;
   key/stream delete and purge are also excluded wherever "unique terminal
   outcome" is claimed, because they erase the terminal record even when they
   preserve numeric sequence. Privileged lifecycle mutation remains an explicit
   residual unless an executable credential/shape gate demonstrably excludes
   it.
2. **Cross-incarnation claim.** Re-grill an epoch-bearing token, durable terminal
   evidence, lifecycle/reset actions, proofs, generated corpus, runtime mapping,
   and real-server controls. A bare KV revision is insufficient.
3. **Replacement means a new semantic register.** Make incarnation part of the
   register's identity and narrow every per-work-digest statement accordingly;
   no cross-incarnation fencing or outcome-uniqueness consequence follows.

Until that ruling, do not land the withdrawn proposed row. If the fixed-
incarnation option is selected, the minimum honest ledger bound is:

> **Bounds and residuals.** SAFETY ONLY within one continuously existing
> `KV_flb-fab-reg` backing-stream incarnation. The proof and 12-row replay wall
> contain no bucket/stream lifecycle transition. Bucket or backing-stream
> deletion/recreation, restore/rollback, and administrator lifecycle mutation
> are outside the claim. Key or stream delete/purge and retention-changing
> stream updates can erase terminal outcome evidence; they are outside unique-
> terminal-outcome safety unless an executable application-credential guard
> excludes the tested management surface. Non-clustered R1; per work digest
> within that incarnation; no cross-register or liveness/fair-retry/lease-
> progress claim.

If executable guards later land, the row may replace the corresponding
"outside" clauses only with the exact tested credential and management API
surface, while retaining privileged administrator mutation and untested
restore/rollback paths as residuals. The Claim should say "per work digest
within one backing-stream incarnation," Evidence should name a lifecycle
negative control if one exists, and Checkable-at should cite the guard and its
real-server test. README, DECISIONS, model commentary, and runtime
correspondence documentation must state the same boundary; a ledger-only caveat
would leave the public surface misleading.

## Pertinence and non-coverage

- **Pertinent:** exact branch source/configuration; model transition carrier;
  generated scenarios; current-incarnation history audits; destructive cleanup;
  proposed ledger text and its later withdrawal; pinned client/server sequence
  and delete semantics.
- **Not pertinent to closure:** generic fencing-token literature, cluster/Raft
  ordering, heartbeat timing, retry fairness, SHA-256, exporter correctness, and
  theorem-footprint hygiene. They may support other PR #74 claims but cannot add
  an absent lifecycle transition or epoch.
- No claim is made about clustered KV, mirrors/sources, snapshot restore,
  account replacement, store rollback, sequence overflow, disk corruption, or
  deletion racing an in-flight write. They remain residuals; none is needed for
  the minimized delete/recreate witness.
- This audit does not broad-review PR #74, rerun its full gates, modify product
  code, specs, fixtures, `VERIFICATION.md`, or Multica, or prescribe a repair
  before the coordinator's semantic ruling.

## Reproduction record

Read-only audit commands:

```text
git merge-base main 0dd726459ba697260909a44bd07057b1f4a99d0b
# 0d575c8248025ccf1c9dc5a652a8e6ed777be471
git diff --name-only 0d575c8248025ccf1c9dc5a652a8e6ed777be471..0dd726459ba697260909a44bd07057b1f4a99d0b
git show 0dd726459ba697260909a44bd07057b1f4a99d0b:<path>
git grep -n -i -E 'fixed[- ]incarnation|stream incarnation|bucket incarnation|incarnation|epoch-bearing|lifecycle' 0dd726459ba697260909a44bd07057b1f4a99d0b -- verify/fabric-veil packages/plait go/register VERIFICATION.md
multica issue get DEV-711 --output json
multica issue comment list DEV-711 --output json
```

The commit-scoped grep returned no register lifecycle/incarnation statement;
the unrelated `protod` lifecycle entries in `VERIFICATION.md` do not bear on
this register claim.
