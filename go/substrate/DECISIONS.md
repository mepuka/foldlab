# go/substrate — decisions for the re-landed assumptions gate

### T1. Use semantic witnesses for delivery and a Linux helper process for recovery

Decided: delivery tests assert sequence/attempt predicates and block on broker
events within generous deadlines; recovery starts the test binary as a helper,
kills that whole process with Linux `SIGKILL`, and restarts over the same store.
Alternatives: compare exact elapsed durations; stop an embedded server inside the
parent process; ship a dedicated probe command. Why: elapsed-time equality is not
a transport semantic, an in-process shutdown is not process crash, and a test-only
helper leaves no production binary. **Load-bearing? yes** — weakening either seam
would overstate what the gate witnesses.

### T2. Pin terminality across both data subjects and the JetStream API

Decided: pair application refusal with administrator success for revision-checked
KV delete/purge, journal-stream deletion, stream purge, and deletion of the KV
backing stream. The application credential also proves its allowed publish and
scoped-KV paths before the destructive probes run. Alternatives: witness only
data-subject deletion; trust `DenyDelete`/`DenyPurge` to guard stream-management
APIs; omit the successful destructive controls. Why: the credential is the only
source of terminality, and `$JS.API.STREAM.DELETE` removes both the stream config
and its messages. **Load-bearing? yes** — the committed `$JS.API.>` widening
control deletes a stream, while a deny-all control kills legitimate work.

### T3. Witness the UPDATE verb through retention, and record who holds the seal

Decided: pair application refusal with administrator success on
`$JS.API.STREAM.UPDATE.ASSUME_JOURNAL`, using retention mutation (`MaxMsgs=1`
over three stored frames, two evicted) as the destructive witness, and record
that an update cancelling `DenyDelete` is refused `10052` by the server itself.
The committed `$JS.API.STREAM.UPDATE.>` widening control shows the eviction
that widening buys. Alternatives: probe the verb with a benign config echo;
treat the `DenyDelete`/`DenyPurge` seal as covering the update surface. Why:
the seal is server-immutable on update but retention is not, so the verb's
reachable destructive surface is eviction, and a benign echo would witness
reachability without the capability that makes the guard load-bearing.
**Load-bearing? yes** — without the paired probe, `$JS.API.STREAM.UPDATE.>`
destroys stored journal frames with the suite green.
