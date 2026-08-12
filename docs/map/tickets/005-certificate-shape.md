---
id: 005
title: Certificate shape
type: wayfinder:grilling
status: open
assignee:
blocked-by: [004, 008]
---

## Question

Pin the certificate — the minted schema bundling {schema digest,
program digest, input anchor, span head} that rides on every produced
record and every span (ratified decision 4: provenance is one
mechanism). Decide: exact fields and their encodings; whether the
certificate is itself minted through the fence (it should be — eat the
dogfood); what it attaches to (every record, every span, or both);
and how a verifier checks one (recompute which digests from what).
Blocked by the schema encoding (its digests appear in the preimage)
and the workflow abstraction (the program digest needs a referent).
