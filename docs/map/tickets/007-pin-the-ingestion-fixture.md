---
id: 007
title: Pin the ingestion fixture
type: wayfinder:task
status: open
assignee:
blocked-by: []
---

## Question

Pin the map's real-traffic ingestion fixture: the R1 bundle's journal
(`artifacts/receipts/r1-001/journal.ndjson`, 380 receipts, already
committed and verified) as the standing fixture, digest-recorded — to
be swapped for the R2 climb journal when R2 passes its verifier.
Record: fixture path, its chain head, its record schemas as observed
(receipt facts + plan rows), and the swap criterion. Facts later
tickets depend on: what correlation keys the fixture's records
actually offer (question id, variant, step, work digest).
