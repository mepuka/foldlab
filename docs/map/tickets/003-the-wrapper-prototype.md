---
id: 003
title: The wrapper prototype
type: wayfinder:prototype
status: open
assignee:
blocked-by: [002]
---

## Question

Build the cheap concrete thing to react to: an Effect v4 service
wrapping a NATS server per the ownership model decided in
[The ownership question](002-the-ownership-question.md) — mint as an
operation on the node, one entity fold owned node-locally, records
flowing subject → journal → fold. Throwaway code; the deliverable is
the reaction, not the artifact. If
[The workflow abstraction](008-the-workflow-abstraction.md) has
resolved by then, the prototype should interpret a program value
rather than a hand-wired pipeline — the node-as-interpreter and
workflow-as-value abstractions have to meet here.
