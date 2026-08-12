---
id: 002
title: The ownership question
type: wayfinder:grilling
status: open
assignee:
blocked-by: [001]
---

## Question

Is the effectful wrapper around the NATS server the MINTER — the owner
of node-local entity data? Decide the ownership model:

- Where does the registry live once it must be durable and shared:
  in-process (today's `mint.ts`), journal-backed (registry records as
  facts), or KV-backed (revision-CAS'd entries)? Who may write it?
- Does each node own its local entity folds and act as minting
  authority for them, with composition anchoring upward — or is
  minting centralized and nodes merely host?
- Who enforces the fence at ingress — may a record whose schema digest
  doesn't resolve even enter the node's streams?
- Which side of the TS/Go boundary owns the node runtime (constrained
  by ticket 001's findings on embedding)?
- Split surfaced by the NATS research (finding 5): the journal shape
  gate refuses mirror config — correct for AUTHORITY journals, wrong
  for REPLICAS. Decide the two roles explicitly: "authority imports
  nothing" vs "replica is a verified mirror" (ADR-scale; mirrors keep
  origin sequence numbers, so verify-on-read carries over unchanged).
- The daemon framing (added 2026-08-12, operator): the node as a local
  daemon providing schema/workflow/transport utilities, with the
  ontology (registry stream) REPLICATED to it rather than queried
  remotely — mint locally, resolve locally. Grill the
  refusal-under-lag semantics: a digest minted elsewhere but not yet
  replicated resolves as UnknownDigest (typed refusal) until the fact
  arrives — the fence composes with eventual consistency instead of
  fighting it. What are the failure modes (mint races on the same
  structural digest at two daemons; fetch-on-miss vs wait)?
