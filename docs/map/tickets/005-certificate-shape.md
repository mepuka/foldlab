---
id: 005
title: Certificate shape
type: wayfinder:grilling
status: open
assignee:
blocked-by: [004, 008]
---

## Question

Pin the certificate — the schema bundling {schema digest, program
digest, input anchor, span head} that rides on every produced record
and every span (provenance is one mechanism, ADR-0005). Decide: exact
fields and their encodings; whether the certificate schema is itself
cataloged like any other type (it should be — eat the dogfood); what
it attaches to (every record, every span, or both);
and how a verifier checks one (recompute which digests from what).
Blocked by the schema encoding (its digests appear in the preimage)
and the workflow abstraction (the program digest needs a referent).
