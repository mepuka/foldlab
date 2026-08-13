---
id: 017
title: Done outlives the register — journaled outcomes and resurrection detection
type: wayfinder:build
status: open
assignee:
blocked-by: [012]
# Origin note: dispositioned from the substrate-gate red finding
# (admin deletion erases Done); journaled outcomes need the journal model.
---

## Question

The substrate gate proved (task 16, red finding, 2026-08-13) that
JetStream KV admin Delete/Purge erases a committed `Done`, the register
reads back Unclaimed, and a fence-1 reclaim can mint a second terminal
outcome — the unique-terminal-outcome theorem is conditional on an
assumption the substrate does not enforce. Operator-ratified layered
disposition: task 16 resumes with the enforcement half (envelope +
permission boundary); THIS ticket is the evidence half:

**Every Done also lands as a hash-chained journal fact, making the
register a recoverable projection of journaled decisions.** An
erase-and-reclaim then produces a second outcome fact conflicting with
the first in a tamper-evident journal — detectable by recomputation,
by anyone. The chain remembers what the register can be made to
forget. (The theory anticipated this shape: encapsulation already
collapses a completed stream to `Done(f, ⟨exit, anchor⟩)` as one
adoptable FACT — .reference/core-concepts §6. This ticket makes that
the effector's own outcome discipline.)

Grill before building — the core question is a new protocol step's
atomicity: the journal append and the register's finish are two writes.
A crash between them yields Done-without-fact or fact-without-Done.
Decide the order, the reconciliation law (idempotent replay from
whichever side survived), and whether the effector proof extends (the
begin/finish discipline may need a third leg, or the fact-append may be
safely asynchronous because detection, not prevention, is the goal —
argue it, don't assume it). Also decide the resurrection-detection
law's statement: what an auditor recomputes, from which journals, to
certify "exactly one outcome ever committed for digest d." Feeds
ticket 012's journal model (the outcome-fact stream is another
journal-shaped thing inheriting that substrate).
