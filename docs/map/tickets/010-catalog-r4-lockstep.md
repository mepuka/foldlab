---
id: 010
title: Catalog R4 — lockstep conformance against protod
type: wayfinder:build
status: closed
assignee:
blocked-by: [009]
---

## Question

Chain the catalog model to the running binary — the bridge R2 cannot
provide. `Catalog.tla`'s abstractions (index as pure fold, digests as
identity) are exactly where implementation drift can hide; lockstep
replay is how the effector closed the same gap.

Build, following the effector harness pattern: (1) a schedule
generator over the model's action alphabet (CreateBegin/CreateFinish,
MirrorAdvance, Publish) at the R2 bounds; (2) a driver that replays
each schedule against a real `protod` on embedded NATS, mapping model
actions to wire requests; (3) state extraction after every step
(catalog journal, resolve verdicts, data journals — all readable
through the narrow writ, which is itself the point: the writ suffices
to audit the daemon); (4) lockstep comparison against the model's
state, divergence = finding; (5) negative controls: corrupted
schedules and a sabotaged daemon build that MUST diverge — the
harness proves it can fail before its passes count.

Gate for claiming R4: a stated schedule count with the
sampling method named, zero divergences, and the sensitivity result
(all corrupted schedules caught) recorded in verify/catalog/README.md.
