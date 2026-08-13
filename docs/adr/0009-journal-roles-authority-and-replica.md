# Journal roles: an authority imports nothing; a replica is a verified mirror

A journal exists in exactly one of two declared roles, gated by shape at
open. An AUTHORITY is the sole origin of its facts: its stream config
imports nothing (no mirror, no sources — the shape gate that refuses
mirror config at journal.go:283 is this rule), and its only writer is
its owning daemon. A REPLICA is a JetStream MIRROR of exactly one
authority: it stores facts at origin sequence numbers with
resync-on-gap enforced (verified in server source at the pinned
versions — docs/research/2026-08-12-nats-server-as-abstraction.md), so
hash-chain verify-on-read carries over unchanged and lag is absence,
never wrong data. A replica is locally read-only; writes never address
one — write requests are subject-addressed and NATS routes them to the
authority daemon, so location transparency costs nothing. JetStream
SOURCES renumber and are disqualified from carrying a journal. The
rejected alternative — replicas that re-append facts through their own
journal — renumbers history and turns a verifiable mirror into a
trusted port, which is the assigned-correlation mistake applied to
replication.
