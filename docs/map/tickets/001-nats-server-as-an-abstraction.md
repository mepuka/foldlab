---
id: 001
title: NATS server as an abstraction
type: wayfinder:research
status: closed
assignee: coordinator
blocked-by: []
resolved: 2026-08-12
---

## Question

What IS the NATS server as a value, for the purpose of wrapping it
effectfully? Survey against primary sources (nats-server /
nats.go source and docs; our own `go/{journal,effector}`,
`docs/research/2026-08-12-nats-agent-protocol.md`, and the JetStream
guarantees dossier):

- Lifecycle as a value: embedded `server.Server` in Go (options,
  start/shutdown, readiness), vs spawned process, vs external. What do
  accounts/subjects/streams/KV buckets look like as first-class
  objects you can enumerate, create, and own?
- The embedding constraint: `nats-server` embeds in Go only; TS holds
  connections, not servers. What shapes does that force for an
  "effectful wrapper" that spans the TS Schema face and the Go
  substrate? (Sidecar Go binary owning the server + TS client? Go
  node runtime configured by TS-authored registry data? Enumerate the
  viable topologies with their trade-offs.)
- The daemon/distribution reading (added 2026-08-12, operator):
  the server as a LOCAL DAEMON that spreads the system's ontology
  while providing schema/workflow/transport utilities. Survey the
  NATS-native machinery for this specifically: leaf nodes (edge
  daemons against a hub), JetStream mirrors/sources (stream
  replication — the registry is a chained stream, so spreading the
  ontology = mirroring a verifiable journal), and KV replication.
  What guarantees do mirrors give (ordering, gap-freedom) that the
  chain verification can lean on?
- Prior art: how do systems that treat a server as a managed value
  (embedded NATS users, testcontainers, k8s operators, Temporal's
  worker abstraction) model ownership and lifecycle?
- What does our substrate already assume about who owns the server
  (journald, the effector harness, the gauntlet fleets)?

Deliverable: a docs/research memo (primary sources, URLs/file:line)
that the ownership-question ticket can be grilled against.

## Resolution (2026-08-12)

Full evidence:
[docs/research/2026-08-12-nats-server-as-abstraction.md](../../research/2026-08-12-nats-server-as-abstraction.md)
(all claims at nats-server v2.14.4 / nats.go v1.53.1, file:line or
source URL). The findings the ownership grilling leans on:

1. The server decomposes into TWO values: a Go-only process value
   (Options → NewServer → Start/ReadyForConnections/Shutdown; identity
   = StoreDir, not the *Server pointer) and a resource plane where
   streams/KV are pure data — management is subject-addressed client
   API "even in single server mode", so ANY connection-holder can
   enumerate/create/gate resources. Only accounts are true in-process
   Go objects.
2. Topology evidence favors (b): a Go-owned daemon embedding the
   server, configured by TS-authored registry data. nats.js is
   client-only; journald already proves the strongest variant
   (DontListen + in-process connection + stdio face + black-box
   conformance gate). External server (c) only when independent crash
   injection or a live TS connection is required.
3. Prior art converges on acquire → readiness gate → narrow handle →
   release, plus declarative resources reconciled by a client — maps
   1:1 onto Effect acquireRelease around a spawned process.
4. The daemon/distribution reading holds mechanically: JetStream
   MIRRORS store at origin sequence numbers with enforced
   resync-on-gap, so the hash-chained registry replicates to
   leaf-node daemons (own JetStream domain, fully offline-capable)
   with verify-on-read unchanged — lag = absence (UnknownDigest),
   never wrong data. SOURCES renumber and are disqualified. KV
   mirrors serve reads locally, route writes to the origin.
5. Prerequisite decision surfaced: the journal shape gate refuses
   mirror config (journal.go:283) — right for authority journals,
   wrong for replicas. The ownership ticket must split "authority
   imports nothing" from "replica is a verified mirror" (ADR-scale).
