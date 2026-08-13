---
id: 003
title: The wrapper prototype
type: wayfinder:prototype
status: open
assignee:
blocked-by: [002]
---

## Question

Build the cheap concrete thing to react to: the Go daemon (embedded
NATS + journal + effector + catalog) behind the narrow-writ interface,
with an Effect v4 TS client as its first consumer, per the ownership
model decided in
[The ownership question](002-the-ownership-question.md) — type
creation as a REQUEST on the node (catalog append; the daemon
recomputes the digest from submitted bytes), one entity fold
maintained node-locally, records flowing subject → journal → fold.
Throwaway code; the deliverable is the reaction, not the artifact. If
[The workflow abstraction](008-the-workflow-abstraction.md) has
resolved by then, the prototype should interpret a program value
rather than a hand-wired pipeline — the node-as-interpreter and
workflow-as-value abstractions have to meet here.
