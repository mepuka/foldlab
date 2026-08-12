---
id: 004
title: The foldlab-owned canonical schema encoding
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

Design the foldlab-owned canonical schema encoding — the identity
keystone ADR-0008 already names as mandatory once a non-TS runtime
must verify a schema digest. Decide: the preimage (what shape-facts
enter the digest; checks move identity, brands/getters/defaults do
not — per the walled semantics); the encoding discipline (canonical
bytes, versioned as `foldlab.schema.v2`); the migration story off the
beta's pinned `SchemaRepresentation` (a red schema wall at a beta bump
becomes a deliberate re-pin); and the Go verification path (what Go
needs to recompute a schema digest from the encoding alone).
