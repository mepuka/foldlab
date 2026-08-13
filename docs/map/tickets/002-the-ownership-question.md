---
id: 002
title: The ownership question
type: wayfinder:grilling
status: closed
assignee: coordinator
blocked-by: [001]
resolved: 2026-08-12
---

## Ratified input (2026-08-12)

The seam decision is made: the Go daemon is the deep module — it owns
the runtime (embedded NATS server, journal, effector, hot-path folds)
behind one small interface, which is data (canonical frames and facts
on subjects, ADR-0003). TypeScript is the authoring adapter at that
seam: it types the data that crosses (the Schema face), builds
programs, and holds a client connection; it is never a runtime
dependency. The wall (TS ≡ Go digest equality) is not a seam — nothing
calls across it; it is the proof that licenses moving computation to
either side. The mint concept was rolled back the same day (NEXT.md);
this ticket inherits its real questions, restated in seam language,
presuming no mint machinery.

## Question

Grill the ownership model of the daemon's interface:

- Durable state: what does the daemon own beyond the journal — above
  all, the catalog of known schemas and programs (today: nothing;
  structural digests exist only as computed values). Where does that
  catalog live (journal facts? KV?), and who may write it?
- Ingress validity: when a frame arrives claiming a schema identity
  the daemon does not know, is that refusal, quarantine, or admission?
  Who decides — the daemon at the subject, or the consumer at the
  fold?
- Authority vs replica (research finding 5): the journal shape gate
  refuses mirror config (journal.go:283) — correct for AUTHORITY
  journals, wrong for REPLICAS. Decide the two roles explicitly:
  "authority imports nothing" vs "replica is a verified mirror"
  (ADR-scale; mirrors keep origin sequence numbers, so verify-on-read
  carries over unchanged).
- Distribution: facts replicate to local daemons via JetStream mirrors
  (lag is absence, never wrong data — ticket 001 finding 4). Grill
  refusal-under-lag: a fact committed elsewhere but not yet replicated
  is simply absent here — what are the failure modes (races on the
  same identity at two daemons; fetch-on-miss vs wait)?
- Entity folds: does each daemon own its local entity folds, with
  composition anchoring upward — or is fold ownership centralized and
  daemons merely host?
- The client's writ: exactly which operations may the TS adapter
  perform through its connection (publish frames, read facts, submit
  programs?), and which are daemon-only? The answer IS the interface.

## Resolution (2026-08-12)

Grilled in conversation; every branch decided. The sort that organizes
the whole model: **evidence** (anything recomputable from bytes —
facts, folds, anchors, catalogs) is never owned and federates freely;
**decisions** (anything two parties could legitimately disagree on —
named pointers, fork adoptions, committed merge orders) are
single-homed per digest behind the effector, whose shipped EL0–EL10
suite checks the running contract (the historical formal claim is HELD
pending ticket 013); **absence** (lag, never-created, refused) is a typed refusal,
and senders own retry.

1. **The client's writ is NARROW.** The TS adapter may READ anything
   (verify-on-read polices; reads are safe from anywhere), PUBLISH
   canonical frames to designated ingress subjects, and REQUEST
   everything else (journal appends, effector operations, resource
   creation) as data on daemon-owned request subjects. The authority
   protocols (CAS-append, fencing) are implemented exactly once, in
   Go — a TS implementation would be a port owing a wall, which is
   what derivation-over-porting exists to eliminate.
2. **The type catalog is a hash-chained journal**, daemon-written:
   {structural digest, canonical schema encoding bytes, submitter}.
   The strictness law: the daemon never accepts an asserted identity —
   every digest it commits, it recomputes from submitted bytes; what
   it cannot derive, it refuses. Consequence: ticket 004 (the
   foldlab-owned canonical schema encoding) joins the critical path;
   interim identity is a digest over the submitted canonical bytes.
3. **Ingress refuses what does not resolve.** A frame claiming an
   unknown schema identity never enters a journal; the reply is a
   typed refusal the sender can reason about. Under mirror lag this
   refuses valid-elsewhere frames until the fact arrives — the
   lag-is-absence discipline applied consistently.
4. **Journal roles are two, ratified as ADR-0009**: an AUTHORITY
   imports nothing (the shape gate stands) and is written only by its
   daemon; a REPLICA is a verified JetStream mirror — origin sequence
   numbers, resync-on-gap, locally read-only — so verify-on-read
   carries unchanged. Writes never touch replicas: write requests are
   subject-addressed and NATS routes them to the authority. Replica
   implementation waits for multi-daemon to graduate; the roles are
   ratified now.
5. **Catalogs are per-daemon authorities with union resolution**: a
   digest resolves if any known catalog carries it. Creation works
   offline; same-shape races converge because identity is derived from
   bytes, never assigned by the creation site. The exception that
   proves the sort: NAMED pointers (subject → type and kin) are
   decisions, not evidence, and go through the effector.
6. **Nobody owns entity folds.** Folds follow journals: any daemon
   folds any journal it holds and gets identical results by
   determinism. Adoption of a contested result (fork head, canonical
   merge order) is the effector's job, per the theory (fork resolution
   is fenced commitment).

Unblocks ticket 003 (the wrapper prototype) as the first consumer of
this interface.
