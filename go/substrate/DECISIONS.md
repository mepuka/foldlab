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

### T2. Keep terminality's destructive negative control on KV, not the journal

Decided: the journal stream independently pins `DenyDelete`/`DenyPurge`, while
revision-checked KV delete and purge are attempted first with the application
credential and then with the administrator. Alternatives: use administrator
stream deletion as the control; omit the successful destructive control. Why:
DEV-704 found that terminal KV records are mutable by an authorized client, so
the exact same operation must fail only at the credential boundary to prove that
boundary is load-bearing. **Load-bearing? yes** — a refusal without the admin
success could be supplied by the mechanism and would not test the ACL claim.
